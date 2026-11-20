import type { Request } from 'express';
import type {
  ChangePasswordInput,
  LoginInput,
  MeDto,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from '@instaflow/shared';
import { db, Prisma } from '../../lib/db.js';
import { AppError, badRequest, conflict, notFound, tokenInvalid } from '../../lib/errors.js';
import { generateToken, sha256 } from '../../lib/crypto.js';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../../lib/password.js';
import { toMembershipDto, toUserDto } from '../../lib/serializers.js';
import type { User, VerificationPurpose } from '../../generated/prisma/client.js';
import { dispatch } from '../../queues/queues.js';
import { QUEUES } from '../../queues/names.js';
import { passwordResetEmail, verificationEmail } from '../mail/templates.js';
import { recordAudit } from '../audit/audit.service.js';
import { createSession, revokeAllSessions, type ClientMeta } from './session.service.js';

const HOUR_MS = 60 * 60 * 1000;
const TOKEN_TTL: Record<VerificationPurpose, number> = {
  EMAIL_VERIFICATION: 24 * HOUR_MS,
  PASSWORD_RESET: 1 * HOUR_MS,
};
export const MAX_FAILED_LOGINS = 10;
export const LOCKOUT_MS = 15 * 60 * 1000;

const invalidCredentials = () => new AppError(401, 'UNAUTHENTICATED', 'Incorrect email or password.');

export function clientMeta(req: Request): ClientMeta {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

export async function getMe(userId: string): Promise<MeDto> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { workspace: { deletedAt: null } },
        include: { workspace: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!user || user.deletedAt) throw notFound('Account not found.');
  return { user: toUserDto(user), memberships: user.memberships.map(toMembershipDto) };
}

/** Issue a single-use token, invalidating any earlier unused token of the same purpose. */
async function issueToken(userId: string, purpose: VerificationPurpose): Promise<string> {
  const token = generateToken(32);
  await db.$transaction([
    db.verificationToken.deleteMany({ where: { userId, purpose, usedAt: null } }),
    db.verificationToken.create({
      data: { userId, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TOKEN_TTL[purpose]) },
    }),
  ]);
  return token;
}

/** Atomically consume a token: two concurrent requests cannot both succeed. */
async function consumeToken(rawToken: string, purpose: VerificationPurpose) {
  const record = await db.verificationToken.findUnique({ where: { tokenHash: sha256(rawToken) }, include: { user: true } });
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt <= new Date() || record.user.deletedAt) {
    throw tokenInvalid();
  }
  const claimed = await db.verificationToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) throw tokenInvalid();
  return record;
}

async function sendVerification(user: Pick<User, 'id' | 'email' | 'name'>): Promise<void> {
  const token = await issueToken(user.id, 'EMAIL_VERIFICATION');
  await dispatch(QUEUES.email, verificationEmail(user.email, user.name, token));
}

export async function register(input: RegisterInput, req: Request) {
  if (await db.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    throw conflict('An account with this email already exists. Try signing in instead.');
  }
  let user: User;
  try {
    user = await db.user.create({
      data: { email: input.email, name: input.name, passwordHash: await hashPassword(input.password) },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw conflict('An account with this email already exists. Try signing in instead.');
    }
    throw err;
  }
  await sendVerification(user);
  await recordAudit({ action: 'user.registered', actorId: user.id, targetType: 'User', targetId: user.id, req });
  const { token, session } = await createSession(user.id, clientMeta(req));
  return { user, token, session };
}

export async function login(input: LoginInput, req: Request) {
  const user = await db.user.findUnique({ where: { email: input.email } });
  if (!user || user.deletedAt) {
    await verifyAgainstDummy(input.password);
    throw invalidCredentials();
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(423, 'ACCOUNT_LOCKED', 'Too many failed sign-in attempts. Try again in a few minutes or reset your password.');
  }

  if (!(await verifyPassword(user.passwordHash, input.password))) {
    const failures = user.failedLoginCount + 1;
    const lock = failures >= MAX_FAILED_LOGINS;
    await db.user.update({
      where: { id: user.id },
      data: lock ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) } : { failedLoginCount: failures },
    });
    await recordAudit({ action: lock ? 'user.locked' : 'user.login_failed', actorId: user.id, targetType: 'User', targetId: user.id, req });
    throw invalidCredentials();
  }

  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await recordAudit({ action: 'user.login', actorId: user.id, targetType: 'User', targetId: user.id, req });
  const { token, session } = await createSession(user.id, clientMeta(req));
  return { user, token, session };
}

export async function verifyEmail(rawToken: string, req: Request): Promise<void> {
  const record = await consumeToken(rawToken, 'EMAIL_VERIFICATION');
  if (!record.user.emailVerifiedAt) {
    await db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  }
  await recordAudit({ action: 'user.email_verified', actorId: record.userId, targetType: 'User', targetId: record.userId, req });
}

export async function resendVerification(user: User): Promise<{ alreadyVerified: boolean }> {
  if (user.emailVerifiedAt) return { alreadyVerified: true };
  await sendVerification(user);
  return { alreadyVerified: false };
}

/** Always succeeds from the caller's point of view — never reveals whether the email exists. */
export async function forgotPassword(email: string, req: Request): Promise<void> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) return;
  const token = await issueToken(user.id, 'PASSWORD_RESET');
  await dispatch(QUEUES.email, passwordResetEmail(user.email, user.name, token));
  await recordAudit({ action: 'user.password_reset_requested', actorId: user.id, targetType: 'User', targetId: user.id, req });
}

export async function resetPassword(input: ResetPasswordInput, req: Request): Promise<void> {
  const record = await consumeToken(input.token, 'PASSWORD_RESET');
  await db.user.update({
    where: { id: record.userId },
    data: {
      passwordHash: await hashPassword(input.password),
      failedLoginCount: 0,
      lockedUntil: null,
      // Completing a reset proves control of the inbox.
      emailVerifiedAt: record.user.emailVerifiedAt ?? new Date(),
    },
  });
  // A reset usually means the old password may be compromised: sign out everywhere.
  await revokeAllSessions(record.userId);
  await recordAudit({ action: 'user.password_reset', actorId: record.userId, targetType: 'User', targetId: record.userId, req });
}

export async function changePassword(user: User, sessionId: string, input: ChangePasswordInput, req: Request): Promise<number> {
  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw badRequest('Current password is incorrect.', [{ path: 'currentPassword', message: 'Current password is incorrect.' }]);
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
  const revoked = await revokeAllSessions(user.id, { exceptSessionId: sessionId });
  await recordAudit({ action: 'user.password_changed', actorId: user.id, targetType: 'User', targetId: user.id, metadata: { otherSessionsRevoked: revoked }, req });
  return revoked;
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { name: input.name } });
}
