import React, { useEffect, useRef } from "react";
import { AppState, AppStateStatus, View } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { useTenantStore } from "../state/tenantStore";
import { useAuthStore } from "../state/authStore";
import { healthcheck } from "../services/api/health";
import { useOutboxStore } from "../queue/outboxStore";

export const AppBootstrap: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const tenantHydrated = useTenantStore((s) => s.hydrated);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const hydrateTenant = useTenantStore((s) => s.hydrate);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const logout = useAuthStore((s) => s.logout);

  const outboxHydrated = useOutboxStore((s) => s.hydrated);
  const hydrateOutbox = useOutboxStore((s) => s.hydrate);
  const drainOutbox = useOutboxStore((s) => s.drain);

  useEffect(() => {
    hydrateTenant();
    hydrateAuth();
    hydrateOutbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    if (!tenantHydrated || !authHydrated || !outboxHydrated) return;

    const sub = AppState.addEventListener("change", async (nextState: AppStateStatus) => {
      const prev = appState.current;
      appState.current = nextState;
      if (prev.match(/inactive|background/) && nextState === "active") {
        const status = await healthcheck();
        if (status === "auth_expired") {
          await logout();
        } else if (status === "ok") {
          // Good session → try draining the outbox
          drainOutbox().catch(() => {});
        }
      }
    });

    // On boot: if session exists and is valid, attempt a drain
    (async () => {
      const { jwt, saidpin } = useAuthStore.getState();
      if (jwt && saidpin) {
        const status = await healthcheck();
        if (status === "auth_expired") {
          await logout();
        } else if (status === "ok") {
          drainOutbox().catch(() => {});
        }
      }
    })();

    return () => {
      // @ts-expect-error RN types differ
      if (typeof (sub as any)?.remove === "function") (sub as any).remove();
    };
  }, [tenantHydrated, authHydrated, outboxHydrated, logout, drainOutbox]);

  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1 }}>{children}</View>
    </QueryClientProvider>
  );
};
