import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { ApiErrorBody } from '@instaflow/shared';
import { env } from '../config/env.js';
import { getRedis } from '../lib/redis.js';

interface LimiterOptions {
  name: string;
  windowMs: number;
  limit: number;
  /** Optional extra key component, e.g. the email being attacked. */
  keyBy?: (req: Request) => string | undefined;
  /** Force-enable regardless of RATE_LIMIT_ENABLED (used by tests). */
  force?: boolean;
}

/**
 * Rate limiter backed by Redis when available (shared across API instances),
 * falling back to in-memory for local development and tests.
 */
export function createRateLimiter(opts: LimiterOptions): RequestHandler {
  if (!env.RATE_LIMIT_ENABLED && !opts.force) return (_req, _res, next) => next();

  const redis = env.NODE_ENV === 'test' ? null : getRedis();
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req.ip ?? 'unknown');
      const extra = opts.keyBy?.(req);
      return extra ? `${ip}:${extra}` : ip;
    },
    ...(redis
      ? {
          store: new RedisStore({
            prefix: `rl:${opts.name}:`,
            sendCommand: (command: string, ...args: string[]) =>
              redis.call(command, ...args) as Promise<number>,
          }),
        }
      : {}),
    handler: (req, res) => {
      const body: ApiErrorBody = {
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.', requestId: String(req.id ?? '') },
      };
      res.status(429).json(body);
    },
  });
}

const MINUTE = 60 * 1000;

const byEmail = (req: Request) => (typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : undefined);
const byUser = (req: Request) => req.auth?.user.id;

/**
 * Every endpoint gets its OWN budget. (A shared bucket let one user's email
 * verification + invite acceptance exhaust the limit for everyone behind the
 * same IP — common with mobile-carrier NAT.) One-time tokens are 256-bit, so
 * token endpoints are limited for abuse/cost, not because guessing is feasible.
 */
export const RATE_LIMITS = {
  api: { windowMs: MINUTE, limit: 300 },
  login: { windowMs: 15 * MINUTE, limit: 10, keyBy: byEmail },
  register: { windowMs: 60 * MINUTE, limit: 10 },
  forgotPassword: { windowMs: 15 * MINUTE, limit: 5, keyBy: byEmail },
  resetPassword: { windowMs: 15 * MINUTE, limit: 10 },
  verifyEmail: { windowMs: 15 * MINUTE, limit: 20 },
  resendVerification: { windowMs: 15 * MINUTE, limit: 5, keyBy: byUser },
  changePassword: { windowMs: 15 * MINUTE, limit: 10, keyBy: byUser },
  invitationLookup: { windowMs: 15 * MINUTE, limit: 30 },
  invitationAccept: { windowMs: 15 * MINUTE, limit: 10, keyBy: byUser },
} satisfies Record<string, Omit<LimiterOptions, 'name'>>;

export const limiters = Object.fromEntries(
  Object.entries(RATE_LIMITS).map(([name, opts]) => [name, createRateLimiter({ name, ...opts })]),
) as Record<keyof typeof RATE_LIMITS, RequestHandler>;
