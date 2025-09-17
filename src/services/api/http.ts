import { toApiErrorFromJs } from "./errors";

/**
 * Low-level HTTP with AbortController timeout.
 * Does not know about JWT/SAIDPIN — the client will inject those.
 */
export async function httpRequest<T = any>({
  method,
  url,
  headers,
  body,
  timeoutMs = 8000,
}: {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;            // fully qualified URL
  headers?: Record<string, string>;
  body?: any;             // will be JSON.stringified if not undefined
  timeoutMs?: number;
}): Promise<{ ok: boolean; status: number; data: T | any }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const init: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      ...(headers ?? {}),
    },
    signal: controller.signal,
  };

  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json", ...(init.headers ?? {}) };
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);
    clearTimeout(id);

    let data: any = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text; // non-JSON fallback
      }
    }

    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    clearTimeout(id);
    // Re-throw as a recognizable error if the caller wants it
    throw toApiErrorFromJs(e);
  }
}
