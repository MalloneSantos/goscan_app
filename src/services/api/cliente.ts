import { httpRequest } from "./http";
import { toApiErrorFromHttp, toApiErrorFromJs } from "./errors";
import { ApiResponse } from "./types";
import { withUrlQS } from "../../utils/qs";
import { authStore } from "../../state/authStore";
import { tenantStore } from "../../state/tenantStore";

const DEFAULT_TIMEOUT = 8000;

async function request<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  {
    body,
    qs,
    timeoutMs = DEFAULT_TIMEOUT,
    extraHeaders,
  }: {
    body?: any;
    qs?: Record<string, string | number | boolean | undefined | null>;
    timeoutMs?: number;
    extraHeaders?: Record<string, string>;
  } = {}
): Promise<ApiResponse<T>> {
  const { apiBaseUrl } = tenantStore.getState();
  const { jwt, saidpin } = authStore.getState();

  if (!apiBaseUrl) {
    return { ok: false, error: { type: "SERVER", message: "API base URL not configured." } };
  }

  const qsWithTenant = { ...(qs || {}), ...(saidpin ? { SAIDPIN: saidpin } : {}) };
  const url = `${apiBaseUrl}${withUrlQS(path, qsWithTenant)}`;

  const headers: Record<string, string> = { ...(extraHeaders ?? {}) };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  try {
    const { ok, status, data } = await httpRequest<T>({
      method,
      url,
      headers,
      body,
      timeoutMs,
    });

    if (ok) {
      if (data && typeof data === "object" && "ok" in (data as any)) {
        const d = data as any;
        return d.ok ? { ok: true, result: d.result as T } : { ok: false, error: d.error };
      }
      return { ok: true, result: data as T };
    } else {
      return { ok: false, error: toApiErrorFromHttp(status, data) };
    }
  } catch (e) {
    return { ok: false, error: toApiErrorFromJs(e) };
  }
}

export const api = {
  get:  <T>(path: string, qs?: Record<string, string | number | boolean | undefined | null>) =>
    request<T>("GET", path, { qs }),
  post: <T>(path: string, body?: any, qs?: Record<string, string | number | boolean | undefined | null>) =>
    request<T>("POST", path, { body, qs }),
  put:  <T>(path: string, body?: any, qs?: Record<string, string | number | boolean | undefined | null>) =>
    request<T>("PUT", path, { body, qs }),
  del:  <T>(path: string, qs?:   Record<string, string | number | boolean | undefined | null>) =>
    request<T>("DELETE", path, { qs }),

  // For Outbox to attach Idempotency-Key header:
  postWithHeaders: <T>(
    path: string,
    body?: any,
    qs?: Record<string, string | number | boolean | undefined | null>,
    headers?: Record<string, string>
  ) => request<T>("POST", path, { body, qs, extraHeaders: headers }),
};
