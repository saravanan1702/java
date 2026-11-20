/**
 * Consistent REST response envelope used by every endpoint.
 *
 * Success: { data: T, meta?: { ... } }
 * Error:   { error: { code, message, details?, requestId? } }
 */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: { pagination?: PaginationMeta } & Record<string, unknown>;
}

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'CSRF_INVALID',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'EMAIL_NOT_VERIFIED',
  'ACCOUNT_LOCKED',
  'TOKEN_INVALID',
  'WORKSPACE_REQUIRED',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  };
}

/** Header carrying the active workspace for tenant-scoped requests. */
export const WORKSPACE_HEADER = 'x-workspace-id';
/** Header carrying the CSRF token for state-changing requests. */
export const CSRF_HEADER = 'x-csrf-token';
