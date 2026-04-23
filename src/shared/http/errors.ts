export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "AI_TIMEOUT"
  | "AI_UNAVAILABLE"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError("INTERNAL_ERROR", error.message, 500);
  }

  return new AppError("INTERNAL_ERROR", "Unexpected error", 500);
};
