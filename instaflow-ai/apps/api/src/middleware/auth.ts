import type { NextFunction, Request, Response } from 'express';
import { AppError, forbidden, unauthenticated } from '../lib/errors.js';
import { SESSION_COOKIE, clearSessionCookie, setSessionCookie } from '../lib/cookies.js';
import { resolveSession } from '../modules/auth/session.service.js';

/** Attach req.auth when a valid session cookie is present. Never rejects. */
export async function loadSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return next();
  const resolved = await resolveSession(token);
  if (!resolved) {
    clearSessionCookie(res);
    return next();
  }
  req.auth = { user: resolved.user, session: resolved.session };
  if (resolved.renewedExpiry) setSessionCookie(res, token, resolved.renewedExpiry);
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) return next(unauthenticated());
  next();
}

export function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) return next(unauthenticated());
  if (!req.auth.user.emailVerifiedAt) {
    return next(new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email address before doing this.'));
  }
  next();
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) return next(unauthenticated());
  if (req.auth.user.platformRole !== 'SUPER_ADMIN') return next(forbidden());
  next();
}

/** Typed accessor for handlers mounted behind requireAuth. */
export function authOf(req: Request) {
  if (!req.auth) throw unauthenticated();
  return req.auth;
}
