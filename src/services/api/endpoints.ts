export const endpoints = {
  auth: {
    login: "/auth/login",
    me: "/auth/me",
  },
  pallets: {
    byBarcode: (barcode: string) => `/pallets/${encodeURIComponent(barcode)}`,
    search: "/pallets/search",
  },
  locations: {
    byCode: (code: string) => `/locations/${encodeURIComponent(code)}`,
    search: "/locations/search",
  },
  picks: {
    inbox: "/picks",
    order: "/pickorder", // use ?order=...
    candidates: (id: number) => `/pickrequests/${id}/candidates`,
  },
  inventory: {
    receive: "/inventory/receive",
    putaway: "/inventory/putaway",
    move: "/inventory/move",
    vacate: "/inventory/vacate",
    adjust: "/inventory/adjust",
    flag: "/inventory/flag",
  },
  pickOps: {
    pick: "/pick",
    unpick: "/unpick",
  },
} as const;
