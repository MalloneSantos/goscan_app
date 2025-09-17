import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: any) => {
        const type = error?.type ?? error?.response?.type;
        if (type === "VALIDATION" || type === "NOT_FOUND" || type === "CONFLICT" || type === "AUTH") {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});
