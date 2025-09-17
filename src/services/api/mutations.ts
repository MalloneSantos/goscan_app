import { useOutboxStore } from "../../queue/outboxStore";
import { generateIdempotencyKey } from "../../utils/idempotency";
import { useAuthStore } from "../../state/authStore";

/**
 * Enqueue a POST mutation for offline-safe processing.
 * Returns { queued: true, outboxId } immediately; Outbox will drain automatically on foreground/online.
 */
export async function postMutation(
  path: string,
  body: any,
  opts?: { sequencingKey?: string; qs?: Record<string, any> }
): Promise<{ queued: true; outboxId: string; idempotencyKey: string }> {
  const { user } = useAuthStore.getState();
  const idk = generateIdempotencyKey(`gocs:${user?.id ?? "anon"}`);

  const { id } = await useOutboxStore.getState().enqueue({
    path,
    body,
    qs: opts?.qs,
    idempotencyKey: idk,
    sequencingKey: opts?.sequencingKey,
    method: "POST",
  } as any);

  // Try to drain optimistically (non-blocking)
  useOutboxStore.getState().drain().catch(() => {});

  return { queued: true, outboxId: id, idempotencyKey: idk };
}
