import { create } from "zustand";
import EncryptedStorage from "react-native-encrypted-storage";

type TenantState = {
  apiBaseUrl: string | null;
  tenantLabel: string | null;
  isProvisioned: boolean;
  hydrated: boolean;
  setProvision: (p: { apiBaseUrl: string; tenantLabel: string }) => Promise<void>;
  clearProvision: () => Promise<void>;
  hydrate: () => Promise<void>;
};

const TENANT_KEY = "tenant.config.v1";

export const useTenantStore = create<TenantState>((set) => ({
  apiBaseUrl: null,
  tenantLabel: null,
  isProvisioned: false,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await EncryptedStorage.getItem(TENANT_KEY);
      if (raw) {
        const { apiBaseUrl, tenantLabel } = JSON.parse(raw);
        set({ apiBaseUrl, tenantLabel, isProvisioned: true, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  setProvision: async ({ apiBaseUrl, tenantLabel }) => {
    const payload = { apiBaseUrl, tenantLabel };
    await EncryptedStorage.setItem(TENANT_KEY, JSON.stringify(payload));
    set({ apiBaseUrl, tenantLabel, isProvisioned: true });
  },

  clearProvision: async () => {
    await EncryptedStorage.removeItem(TENANT_KEY);
    set({ apiBaseUrl: null, tenantLabel: null, isProvisioned: false });
  },
}));

export const tenantStore = { getState: () => useTenantStore.getState() };
export const useTenant = () => useTenantStore();
