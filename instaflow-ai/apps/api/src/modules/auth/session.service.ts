import { env } from '../../config/env.js';
import { db } from '../../lib/db.js';
import { generateToken, sha256 } from '../../lib/crypto.js';
import type { Session, User } from '../../generated/prisma/client.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Only touch lastUsedAt / slide the expiry at most this often, to avoid a write per request. */
const TOUCH_INTERVAL_MS = 15 * 60 * 1000;

export interface ClientMeta {
  ip?: string | undefined;
  userAgent?: string | undefined;
}

/**
 * Opaque, server-side sessions. The cookie holds a random token; the DB holds
 * only its SHA-256. This gives real logout and "sign out everywhere" (unlike
 * stateless JWTs) and a DB leak does not expose usable session tokens.
 */
export async function createSession(userId: string, meta: ClientMeta): Promise<{ token: string; session: Session }> {
  const token = generateToken(32);
  const session = await db.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      ip: meta.ip?.slice(0, 64) ?? null,
      userAgent: meta.userAgent?.slice(0, 512) ?? null,
      expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * DAY_MS),
    },
  });
  return { token, session };
}

export async function resolveSession(token: string): Promise<{ session: Session; user: User; renewedExpiry?: Date } | null> {
  if (!token || token.length > 200) return null;
  const session = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.deletedAt) return null;

  const { user, ...rest } = session;
  if (Date.now() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    // Sliding expiry: active users stay signed in; idle sessions expire.
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * DAY_MS);
    await db.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date(), expiresAt } });
    return { session: { ...rest, expiresAt }, user, renewedExpiry: expiresAt };
  }
  return { session: rest, user };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeAllSessions(userId: string, opts: { exceptSessionId?: string } = {}): Promise<number> {
  const result = await db.session.updateMany({
    where: { userId, revokedAt: null, ...(opts.exceptSessionId ? { id: { not: opts.exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
  return result.count;
}
