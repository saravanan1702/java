import type { Response } from 'express';
import type { ZodType } from 'zod';
import type { ApiSuccess, PaginationMeta } from '@instaflow/shared';
import { badRequest } from './errors.js';

export function ok<T>(res: Response, data: T, status = 200, meta?: ApiSuccess<T>['meta']): void {
  const body: ApiSuccess<T> = meta ? { data, meta } : { data };
  res.status(status).json(body);
}

export function noContent(res: Response): void {
  res.status(204).end();
}

/** Parse untrusted input with a Zod schema, throwing a 400 with field details on failure. */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    throw badRequest(
      'Some fields are invalid.',
      result.error.issues.map((i) => ({ path: i.path.join('.') || '(root)', message: i.message })),
    );
  }
  return result.data;
}

export function paginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
