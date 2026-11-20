import type { NextFunction, Request, Response } from 'express';
import type { ApiErrorBody } from '@instaflow/shared';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { Prisma } from '../lib/db.js';
import { TenantScopeViolation } from '../lib/tenant-db.js';

export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiErrorBody = { error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}`, requestId: String(req.id ?? '') } };
  res.status(404).json(body);
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = String(req.id ?? '');
  const send = (status: number, error: Omit<ApiErrorBody['error'], 'requestId'>) => {
    const body: ApiErrorBody = { error: { ...error, requestId } };
    res.status(status).json(body);
  };

  if (err instanceof AppError) {
    return send(err.status, { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) });
  }

  // Malformed JSON bodies / oversize payloads from express.json()
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const type = (err as { type?: string }).type;
    if (type === 'entity.parse.failed') return send(400, { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON.' });
    if (type === 'entity.too.large') return send(413, { code: 'VALIDATION_ERROR', message: 'Request body is too large.' });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return send(409, { code: 'CONFLICT', message: 'A record with these details already exists.' });
    if (err.code === 'P2025') return send(404, { code: 'NOT_FOUND', message: 'Resource not found.' });
  }

  if (err instanceof TenantScopeViolation) {
    // A tenancy bug in our own code: log loudly, reveal nothing.
    logger.error({ err, requestId }, 'tenant scope violation blocked');
    return send(403, { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' });
  }

  logger.error({ err, requestId }, 'unhandled error');
  send(500, {
    code: 'INTERNAL_ERROR',
    message: env.NODE_ENV === 'production' ? 'Something went wrong on our side. Please try again.' : String((err as Error)?.message ?? err),
  });
}
