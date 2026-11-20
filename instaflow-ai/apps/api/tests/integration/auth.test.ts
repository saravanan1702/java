import { describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { memoryOutbox } from '../../src/modules/mail/mailer.js';
import { MAX_FAILED_LOGINS } from '../../src/modules/auth/auth.service.js';
import { DEFAULT_PASSWORD, TestClient, lastMailTo, registerClient, tokenFromMail, uniqueEmail } from '../helpers.js';

describe('registration', () => {
  it('creates an account, signs in, and sends a verification email', async () => {
    const { client, email, me } = await registerClient({ name: 'Priya' });
    expect(me.user).toMatchObject({ email, name: 'Priya', emailVerified: false, platformRole: 'USER' });
    expect(me.memberships).toEqual([]);
    expect(me.csrfToken).toBeTruthy();

    const res = await client.get('/api/auth/me').expect(200);
    expect(res.body.data.user.email).toBe(email);

    const mail = lastMailTo(email);
    expect(mail.subject).toMatch(/verify/i);
    expect(mail.text).toContain('http://localhost:5173/verify-email?token=');
  });

  it('never returns the password hash or token material', async () => {
    const { client } = await registerClient();
    const body = JSON.stringify((await client.get('/api/auth/me')).body);
    expect(body).not.toMatch(/passwordHash|tokenHash|\$argon2/);
  });

  it('stores the session token hashed and sets a hardened cookie', async () => {
    const client = await new TestClient().init();
    const res = await client.post('/api/auth/register', { name: 'A', email: uniqueEmail(), password: DEFAULT_PASSWORD }).expect(201);
    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('if_session='))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    const raw = cookie.split(';')[0]!.split('=')[1]!;
    const session = await db.session.findFirstOrThrow();
    expect(session.tokenHash).not.toBe(raw);
    expect(session.tokenHash).toHaveLength(64);
  });

  it('normalises email case and rejects duplicates', async () => {
    const email = uniqueEmail();
    await registerClient({ email });
    const c = await new TestClient().init();
    const res = await c.post('/api/auth/register', { name: 'B', email: email.toUpperCase(), password: DEFAULT_PASSWORD }).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('validates input with field-level errors', async () => {
    const c = await new TestClient().init();
    const res = await c.post('/api/auth/register', { name: '', email: 'nope', password: 'short' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });
});

describe('login & logout', () => {
  it('logs in with correct credentials and rejects wrong ones generically', async () => {
    const { email } = await registerClient();
    const c = await new TestClient().init();
    const bad = await c.post('/api/auth/login', { email, password: 'wrong-password-123' }).expect(401);
    const unknown = await c.post('/api/auth/login', { email: 'nobody@example.com', password: 'wrong-password-123' }).expect(401);
    // Same message whether or not the account exists (no user enumeration).
    expect(bad.body.error.message).toBe(unknown.body.error.message);

    c.absorb(await c.post('/api/auth/login', { email, password: DEFAULT_PASSWORD }).expect(200));
    await c.get('/api/auth/me').expect(200);
  });

  it('logout revokes the server-side session', async () => {
    const { client } = await registerClient();
    client.absorb(await client.post('/api/auth/logout').expect(200));
    await client.get('/api/auth/me').expect(401);
    expect(await db.session.count({ where: { revokedAt: null } })).toBe(0);
  });

  it('a stolen session cookie stops working after logout', async () => {
    const client = await new TestClient().init();
    const res = await client.post('/api/auth/register', { name: 'A', email: uniqueEmail(), password: DEFAULT_PASSWORD }).expect(201);
    client.absorb(res);
    const sessionCookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('if_session='))!.split(';')[0]!;
    await client.post('/api/auth/logout').expect(200);
    const attacker = await new TestClient().init();
    await attacker.agent.get('/api/auth/me').set('Cookie', sessionCookie).expect(401);
  });

  it('locks the account after repeated failures', async () => {
    const { email } = await registerClient();
    const c = await new TestClient().init();
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
      await c.post('/api/auth/login', { email, password: 'wrong-password-123' }).expect(401);
    }
    const locked = await c.post('/api/auth/login', { email, password: DEFAULT_PASSWORD }).expect(423);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
    expect(await db.auditLog.count({ where: { action: 'user.locked' } })).toBe(1);
  });

  it('logout-all revokes other sessions but keeps the current one', async () => {
    const { client, email } = await registerClient();
    const other = await new TestClient().init();
    other.absorb(await other.post('/api/auth/login', { email, password: DEFAULT_PASSWORD }).expect(200));
    const res = await client.post('/api/auth/logout-all').expect(200);
    expect(res.body.data.revokedSessions).toBe(1);
    await client.get('/api/auth/me').expect(200);
    await other.get('/api/auth/me').expect(401);
  });
});

describe('email verification', () => {
  it('verifies with the emailed token, which is single-use', async () => {
    const { client, email } = await registerClient();
    const token = tokenFromMail(lastMailTo(email));
    await client.post('/api/auth/verify-email', { token }).expect(200);
    expect((await client.get('/api/auth/me')).body.data.user.emailVerified).toBe(true);
    const again = await client.post('/api/auth/verify-email', { token }).expect(400);
    expect(again.body.error.code).toBe('TOKEN_INVALID');
  });

  it('rejects unknown and expired tokens', async () => {
    const { client, email } = await registerClient();
    await client.post('/api/auth/verify-email', { token: 'a'.repeat(43) }).expect(400);
    const token = tokenFromMail(lastMailTo(email));
    await db.verificationToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await client.post('/api/auth/verify-email', { token }).expect(400);
  });

  it('resending invalidates the previous link', async () => {
    const { client, email } = await registerClient();
    const first = tokenFromMail(lastMailTo(email));
    await client.post('/api/auth/resend-verification').expect(200);
    const second = tokenFromMail(lastMailTo(email));
    expect(second).not.toBe(first);
    await client.post('/api/auth/verify-email', { token: first }).expect(400);
    await client.post('/api/auth/verify-email', { token: second }).expect(200);
  });
});

describe('password reset', () => {
  it('does not reveal whether an email is registered', async () => {
    const { email } = await registerClient();
    const c = await new TestClient().init();
    memoryOutbox.length = 0;
    const known = await c.post('/api/auth/forgot-password', { email }).expect(200);
    const unknown = await c.post('/api/auth/forgot-password', { email: 'ghost@example.com' }).expect(200);
    expect(known.body).toEqual(unknown.body);
    expect(memoryOutbox).toHaveLength(1);
    expect(memoryOutbox[0]!.to).toBe(email);
  });

  it('resets the password, revokes all sessions, and is single-use', async () => {
    const { client, email } = await registerClient();
    const anon = await new TestClient().init();
    await anon.post('/api/auth/forgot-password', { email }).expect(200);
    const token = tokenFromMail(lastMailTo(email));

    await anon.post('/api/auth/reset-password', { token, password: 'brand-new-password-1' }).expect(200);
    await client.get('/api/auth/me').expect(401); // old session revoked
    await anon.post('/api/auth/reset-password', { token, password: 'another-password-22' }).expect(400);

    const login = await new TestClient().init();
    await login.post('/api/auth/login', { email, password: DEFAULT_PASSWORD }).expect(401);
    await login.post('/api/auth/login', { email, password: 'brand-new-password-1' }).expect(200);
  });
});

describe('profile & password change', () => {
  it('updates the display name', async () => {
    const { client } = await registerClient();
    const res = await client.patch('/api/auth/me', { name: 'New Name' }).expect(200);
    expect(res.body.data.user.name).toBe('New Name');
  });

  it('requires the current password and signs out other sessions', async () => {
    const { client, email } = await registerClient();
    const other = await new TestClient().init();
    other.absorb(await other.post('/api/auth/login', { email, password: DEFAULT_PASSWORD }).expect(200));

    const wrong = await client.post('/api/auth/change-password', { currentPassword: 'nope-nope-nope', newPassword: 'fresh-password-99' }).expect(400);
    expect(wrong.body.error.details[0].path).toBe('currentPassword');

    const res = await client.post('/api/auth/change-password', { currentPassword: DEFAULT_PASSWORD, newPassword: 'fresh-password-99' }).expect(200);
    expect(res.body.data.otherSessionsRevoked).toBe(1);
    await client.get('/api/auth/me').expect(200);
    await other.get('/api/auth/me').expect(401);
  });
});
