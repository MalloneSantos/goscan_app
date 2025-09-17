import { create } from "zustand";
import EncryptedStorage from "react-native-encrypted-storage";
import { endpoints } from "../services/api/endpoints";
import { httpRequest } from "../services/api/http";
import { withUrlQS } from "../services/utils/qs"; // <-- adjust path if you keep qs under src/utils
import { tenantStore } from "./tenantStore";

type User = { id: string; name: string; roles: string[] };

type AuthState = {
  jwt: string | null;
  saidpin: string | null;
  user: User | null;
  hydrated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  fetchMe: () => Promise<boolean>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

const AUTH_KEY = "auth.session.v1";

export const useAuthStore = create<AuthState>((set, get) => ({
  jwt: null,
  saidpin: null,
  user: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await EncryptedStorage.getItem(AUTH_KEY);
      if (raw) {
        const { jwt, saidpin, user } = JSON.parse(raw);
        set({ jwt, saidpin, user, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  login: async (username, password) => {
    const base = tenantStore.getState().apiBaseUrl;
    if (!base) throw new Error("API base URL not configured.");
    const url = `${base}${endpoints.auth.login}`;

    const { ok, data } = await httpRequest<{ token: string; saidpin: string }>({
      method: "POST",
      url,
      body: { username, password },
    });

    if (!ok) return false;

    const jwt = data?.token;
    const saidpin = data?.saidpin;
    if (!jwt || !saidpin) return false;

    set({ jwt, saidpin });
    await EncryptedStorage.setItem(AUTH_KEY, JSON.stringify({ jwt, saidpin, user: null }));

    return await get().fetchMe();
  },

  fetchMe: async () => {
    const base = tenantStore.getState().apiBaseUrl;
    const { jwt, saidpin } = get();
    if (!base || !jwt || !saidpin) return false;

    const pathWithQS = withUrlQS(endpoints.auth.me, { SAIDPIN: saidpin });
    const url = `${base}${pathWithQS}`;

    const { ok, status, data } = await httpRequest<User>({
      method: "GET",
      url,
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!ok) {
      if (status === 401 || status === 403) {
        await get().logout();
      }
      return false;
    }

    const user: User = data;
    set({ user });
    await EncryptedStorage.setItem(AUTH_KEY, JSON.stringify({ jwt, saidpin, user }));
    return true;
  },

  logout: async () => {
    await EncryptedStorage.removeItem(AUTH_KEY);
    set({ jwt: null, saidpin: null, user: null });
    // PR#4: purge Outbox/caches
  },
}));

export const authStore = { getState: () => useAuthStore.getState() };
export const useAuth = () => useAuthStore();
