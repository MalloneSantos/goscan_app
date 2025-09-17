export type ApiResponse<T> =
  | { ok: true; result: T }
  | { ok: false; error: ApiError };

export type ApiErrorType =
  | "NETWORK"
  | "AUTH"
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SERVER";

export type ApiError = {
  type: ApiErrorType;
  status?: number;
  code?: string;
  message: string;
  details?: Record<string, any>;
};
