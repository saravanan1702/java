import { Router, type Request, type Response } from 'express';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
  type AuthResultDto,
} from '@instaflow/shared';
import { clearSessionCookie, setSessionCookie } from '../../lib/cookies.js';
import { ok, parse } from '../../lib/http.js';
import { authOf, requireAuth } from '../../middleware/auth.js';
import { issueCsrfToken } from '../../middleware/csrf.js';
import { limiters } from '../../middleware/rate-limit.js';
import { recordAudit } from '../audit/audit.service.js';
import * as auth from './auth.service.js';
import { revokeAllSessions, revokeSession } from './session.service.js';

export const authRouter = Router();

/** Start a signed-in session: set cookie, rotate the CSRF seed, return the profile. */
async function respondWithSession(req: Request, res: Response, userId: string, token: string, expiresAt: Date, status: number) {
  setSessionCookie(res, token, expiresAt);
  const csrfToken = issueCsrfToken(req, res, { rotate: true });
  const body: AuthResultDto = { ...(await auth.getMe(userId)), csrfToken };
  ok(res, body, status);
}

authRouter.get('/csrf', (req, res) => {
  ok(res, { csrfToken: issueCsrfToken(req, res) });
});

authRouter.post('/register', limiters.register, async (req, res) => {
  const input = parse(registerSchema, req.body);
  const { user, token, session } = await auth.register(input, req);
  await respondWithSession(req, res, user.id, token, session.expiresAt, 201);
});

authRouter.post('/login', limiters.login, async (req, res) => {
  const input = parse(loginSchema, req.body);
  const { user, token, session } = await auth.login(input, req);
  await respondWithSession(req, res, user.id, token, session.expiresAt, 200);
});

authRouter.post('/logout', async (req, res) => {
  if (req.auth) {
    await revokeSession(req.auth.session.id);
    await recordAudit({ action: 'user.logout', actorId: req.auth.user.id, targetType: 'User', targetId: req.auth.user.id, req });
  }
  clearSessionCookie(res);
  ok(res, { csrfToken: issueCsrfToken(req, res, { rotate: true }) });
});

authRouter.post('/logout-all', requireAuth, async (req, res) => {
  const { user, session } = authOf(req);
  const revoked = await revokeAllSessions(user.id, { exceptSessionId: session.id });
  await recordAudit({ action: 'user.logout_all', actorId: user.id, targetType: 'User', targetId: user.id, metadata: { revoked }, req });
  ok(res, { revokedSessions: revoked });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  ok(res, await auth.getMe(authOf(req).user.id));
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const input = parse(updateProfileSchema, req.body);
  const { user } = authOf(req);
  await auth.updateProfile(user.id, input);
  ok(res, await auth.getMe(user.id));
});

authRouter.post('/change-password', requireAuth, limiters.changePassword, async (req, res) => {
  const input = parse(changePasswordSchema, req.body);
  const { user, session } = authOf(req);
  const revoked = await auth.changePassword(user, session.id, input, req);
  ok(res, { otherSessionsRevoked: revoked });
});

authRouter.post('/verify-email', limiters.verifyEmail, async (req, res) => {
  const { token } = parse(verifyEmailSchema, req.body);
  await auth.verifyEmail(token, req);
  ok(res, { verified: true });
});

authRouter.post('/resend-verification', requireAuth, limiters.resendVerification, async (req, res) => {
  ok(res, await auth.resendVerification(authOf(req).user));
});

authRouter.post('/forgot-password', limiters.forgotPassword, async (req, res) => {
  const { email } = parse(forgotPasswordSchema, req.body);
  await auth.forgotPassword(email, req);
  ok(res, { message: 'If an account exists for that email, a reset link is on its way.' });
});

authRouter.post('/reset-password', limiters.resetPassword, async (req, res) => {
  const input = parse(resetPasswordSchema, req.body);
  await auth.resetPassword(input, req);
  clearSessionCookie(res);
  ok(res, { reset: true });
});
