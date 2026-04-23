import type { ErrorCode } from "./errors";

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
}

export const ok = <T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> => ({
  success: true,
  data,
  meta,
});

export const fail = (
  code: ErrorCode,
  message: string,
  details?: unknown
): ApiResponse<never> => ({
  success: false,
  error: {
    code,
    message,
    details,
  },
});
