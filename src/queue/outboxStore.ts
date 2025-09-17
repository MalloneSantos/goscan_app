import { create } from "zustand";
import EncryptedStorage from "react-native-encrypted-storage";
import { OutboxEntry, OutboxStatus } from "./types";
import { api } from "../services/api/client";

const OUTBOX_KEY = "outbox.v1";

type OutboxState = {
  entries: OutboxEntry[];
  draining: boolean;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  enqueue: (e: Omit<OutboxEntry, "id" | "createdAt" | "updatedAt" | "status" | "retryCount">) => Promise<{ id: string }>;
  cancel: (id: string) => Promise<void>;
  retryNow: (id: string) => Promise<void>;
  retryAll: () => Promise<void>;
  drain: () => Promise<void>;
};

function persist(entries: OutboxEntry[]) {
  return EncryptedStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
}

async function load(): Promise<OutboxEntry[]> {
  const raw = await EncryptedStorage.getItem(OUTBOX_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as OutboxEntry[]; } catch { return []; }
}

function sortByCreated(a: OutboxEntry, b: OutboxEntry) {
  return a.createdAt - b.createdAt;
}

export const useOutboxStore = create<OutboxState>((set, get) => ({
  entries: [],
  draining: false,
  hydrated: false,

  hydrate: async () => {
    const saved = await load();
    set({ entries: saved.sort(sortByCreated), hydrated: true });
  },

  enqueue: async (e) => {
    const id = `obx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    const entry: OutboxEntry = {
      id,
      method: "POST",
      path: e.path,
      body: e.body,
      qs: e.qs,
      idempotencyKey: e.idempotencyKey,
      sequencingKey: e.sequencingKey,
      retryCount: 0,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };
    const entries = [...get().entries, entry].sort(sortByCreated);
    set({ entries });
    await persist(entries);
    return { id };
  },

  cancel: async (id) => {
    const entries = get().entries.filter((x) => x.id !== id);
    set({ entries });
    await persist(entries);
  },

  retryNow: async (id) => {
    // Light wrapper to drain just one by filtering others out temporarily
    const entry = get().entries.find((x) => x.id === id);
    if (!entry) return;
    await get().drainSingle(entry);
  },

  retryAll: async () => {
    await get().drain();
  },

  // Internal helpers:
  drain: async () => {
    if (get().draining) return;
    set({ draining: true });

    try {
      // Simple FIFO drain across all entries (one lane)
      for (const entry of [...get().entries].sort(sortByCreated)) {
        await get().drainSingle(entry);
      }
    } finally {
      set({ draining: false });
    }
  },
})) as any;

// Augment the store instance with a private helper (kept out of type to keep public API clean)
(useOutboxStore as any).getState().drainSingle = async (entry: OutboxEntry) => {
  const { entries } = useOutboxStore.getState();

  // Mark retrying
  const retrying = entries.map((x) => x.id === entry.id ? { ...x, status: "retrying" as OutboxStatus } : x);
  useOutboxStore.setState({ entries: retrying });
  await persist(retrying);

  // Send via API client (which injects JWT + SAIDPIN). Add Idempotency-Key header using a special method.
  const res = await (api as any).postWithHeaders?.(entry.path, entry.body, entry.qs, {
    "Idempotency-Key": entry.idempotencyKey,
  }) ?? await api.post(entry.path, entry.body, entry.qs); // fallback if helper not present

  if (res.ok) {
    // Remove entry
    const remaining = useOutboxStore.getState().entries.filter((x) => x.id !== entry.id);
    useOutboxStore.setState({ entries: remaining });
    await persist(remaining);
    return;
  }

  const errType = res.error.type;
  // Non-queueable: VALIDATION/NOT_FOUND/CONFLICT → mark failed
  if (errType === "VALIDATION" || errType === "NOT_FOUND" || errType === "CONFLICT") {
    const failed = useOutboxStore.getState().entries.map((x) =>
      x.id === entry.id
        ? {
            ...x,
            status: "failed" as OutboxStatus,
            retryCount: x.retryCount + 1,
            lastErrorCode: res.error.code ?? errType,
            lastErrorMsg: res.error.message,
            updatedAt: Date.now(),
          }
        : x
    );
    useOutboxStore.setState({ entries: failed });
    await persist(failed);
    return;
  }

  // Queueable errors (NETWORK/SERVER/AUTH) → back to queued (simple backoff in UI; no timer here)
  const queued = useOutboxStore.getState().entries.map((x) =>
    x.id === entry.id
      ? {
          ...x,
          status: "queued" as OutboxStatus,
          retryCount: x.retryCount + 1,
          lastErrorCode: res.error.code ?? errType,
          lastErrorMsg: res.error.message,
          updatedAt: Date.now(),
        }
      : x
  );
  useOutboxStore.setState({ entries: queued });
  await persist(queued);
};
