import { ApiError, ApiErrorType } from "./types";

export function mapHttpStatusToType(status: number): ApiErrorType {
  if (status === 401 || status === 403) return "AUTH";
  if (status === 400) return "VALIDATION";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status >= 500) return "SERVER";
  return "SERVER";
}

export function toApiErrorFromHttp(status: number, payload?: any, fallbackMessage?: string): ApiError {
  const type = mapHttpStatusToType(status);
  const code = payload?.error?.code ?? payload?.code;
  const details = payload?.error?.details ?? payload?.details;
  const message =
    payload?.error?.message ??
    payload?.message ??
    fallbackMessage ??
    defaultMessageFor(type, status);
  return { type, status, code, message, details };
}

export function toApiErrorFromJs(e: unknown): ApiError {
  const message = e instanceof Error ? e.message : "Network error. Please try again.";
  return { type: "NETWORK", message };
}

function defaultMessageFor(type: ApiErrorType, status?: number): string {
  switch (type) {
    case "AUTH":
      return "Session expired or unauthorized.";
    case "VALIDATION":
      return "Please check the entered information.";
    case "NOT_FOUND":
      return "The requested resource was not found.";
    case "CONFLICT":
      return "Conflict with current server state.";
    case "SERVER":
      return "Server error. Please try again.";
    default:
      return status ? `Request failed (${status}).` : "Request failed.";
  }
}
