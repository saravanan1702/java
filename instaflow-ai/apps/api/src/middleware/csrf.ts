import type { NextFunction, Request, Response } from 'express';
import { CSRF_HEADER } from '@instaflow/shared';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { CSRF_COOKIE, setCsrfCookie } from '../lib/cookies.js';
import { generateToken, hmac, safeEqual } from '../lib/crypto.js';

/**
 * CSRF protection — HMAC-signed double-submit token.
 *
 *  1. The browser holds a random seed in an httpOnly cookie.
 *  2. The SPA obtains token = HMAC(CSRF_SECRET, seed) from GET /api/auth/csrf
 *     (or from login/register responses) and keeps it in memory.
 *  3. Every state-changing request must send it in the X-CSRF-Token header.
 *
 * A cross-site attacker can neither read the token (CORS blocks the response)
 * nor send a custom header cross-origin without a CORS preflight we reject.
 * SameSite cookies add a further layer. Webhooks are exempt: they are
 * authenticated by Meta's HMAC signature instead (Phase 2).
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = [/^\/api\/webhooks\//];

export function csrfTokenFor(seed: string): string {
  return hmac(env.CSRF_SECRET, `csrf:${seed}`);
}

/** Ensure a seed exists (creating one if needed) and return the matching token. */
export function issueCsrfToken(req: Request, res: Response, { rotate = false } = {}): string {
  let seed = req.cookies?.[CSRF_COOKIE] as string | undefined;
  if (rotate || !seed || seed.length < 32) {
    seed = generateToken();
    setCsrfCookie(res, seed);
    // Make the new seed visible to the rest of this request.
    req.cookies = { ...(req.cookies ?? {}), [CSRF_COOKIE]: seed };
  }
  return csrfTokenFor(seed);
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.some((re) => re.test(req.path))) return next();

  const seed = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const header = req.get(CSRF_HEADER);
  if (!seed || !header || !safeEqual(header, csrfTokenFor(seed))) {
    return next(new AppError(403, 'CSRF_INVALID', 'Your session security token is missing or expired. Refresh the page and try again.'));
  }
  next();
}
