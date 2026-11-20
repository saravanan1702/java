import type { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';

/**
 * `__Host-` prefix pins cookies to the exact API host over HTTPS (no Domain,
 * Path=/). It can only be used when Secure is on and no COOKIE_DOMAIN is set.
 */
const hostPrefix = env.COOKIE_SECURE && !env.COOKIE_DOMAIN ? '__Host-' : '';

export const SESSION_COOKIE = `${hostPrefix}if_session`;
export const CSRF_COOKIE = `${hostPrefix}if_csrf`;

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
    ...(env.COOKIE_DOMAIN && !hostPrefix ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, { ...baseOptions(), expires: expiresAt });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, baseOptions());
}

export function setCsrfCookie(res: Response, seed: string): void {
  // Session-length cookie; the seed is meaningless without the server secret.
  res.cookie(CSRF_COOKIE, seed, { ...baseOptions(), maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000 });
}
