import type { ApiErrorDetail, ErrorCode } from '@instaflow/shared';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: ApiErrorDetail[]) =>
  new AppError(400, 'VALIDATION_ERROR', message, details);
export const unauthenticated = (message = 'Please sign in to continue.') => new AppError(401, 'UNAUTHENTICATED', message);
export const forbidden = (message = 'You do not have permission to perform this action.') =>
  new AppError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Resource not found.') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);
export const tokenInvalid = (message = 'This link is invalid or has expired.') => new AppError(400, 'TOKEN_INVALID', message);
