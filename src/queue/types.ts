export type OutboxStatus = "queued" | "retrying" | "failed";

export type OutboxEntry = {
  id: string;                  // internal id
  method: "POST";              // (extendable if needed)
  path: string;                // e.g., /inventory/move
  body: any;                   // JSON body
  qs?: Record<string, any>;    // extra query params (SAIDPIN is added by client)
  idempotencyKey: string;      // for server dedupe (header)
  sequencingKey?: string;      // e.g., PALLET:1130099214
  retryCount: number;
  lastErrorCode?: string;
  lastErrorMsg?: string;
  status: OutboxStatus;
  createdAt: number;
  updatedAt: number;
};
