import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { RATE_LIMITS, createRateLimiter } from '../../src/middleware/rate-limit.js';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { db } from '../../src/lib/db.js';
import { TestClient, getApp, registerClient } from '../helpers.js';

describe('CSRF protection', () => {
  it('rejects state-changing requests without a token', async () => {
    const c = await new TestClient().init();
    const res = await c.post('/api/auth/register', { name: 'A', email: 'a@example.com', password: 'whatever-123456' }, { csrf: false }).expect(403);
    expect(res.body.error.code).toBe('CSRF_INVALID');
    expect(await db.user.count()).toBe(0);
  });

  it('rejects a forged token and a token from another browser', async () => {
    const c = await new TestClient().init();
    const other = await new TestClient().init();
    await c.agent.post('/api/auth/login').set('x-csrf-token', 'forged').send({ email: 'a@b.co', password: 'x' }).expect(403);
    await c.agent.post('/api/auth/login').set('x-csrf-token', other.csrfToken).send({ email: 'a@b.co', password: 'x' }).expect(403);
  });

  it('rotates the token on login so a pre-login token stops working', async () => {
    const { client } = await registerClient();
    const before = client.csrfToken;
    const res = await client.post('/api/auth/logout').expect(200);
    expect(res.body.data.csrfToken).not.toBe(before);
    await client.agent.post('/api/auth/login').set('x-csrf-token', before).send({ email: 'a@b.co', password: 'x' }).expect(403);
  });

  it('does not require a token for safe methods', async () => {
    await request(getApp()).get('/api/health').expect(200);
  });
});

describe('HTTP hardening', () => {
  it('sets secure headers and hides the framework', async () => {
    const res = await request(getApp()).get('/api/health').expect(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('allows CORS only for configured origins', async () => {
    const ok = await request(getApp()).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const evil = await request(getApp()).get('/api/health').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns a consistent error envelope for unknown routes and bad JSON', async () => {
    const nf = await request(getApp()).get('/api/does-not-exist').expect(404);
    expect(nf.body.error).toMatchObject({ code: 'NOT_FOUND' });
    const c = await new TestClient().init();
    const bad = await c.agent.post('/api/auth/login').set('x-csrf-token', c.csrfToken).set('Content-Type', 'application/json').send('{bad json').expect(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication on protected routes', async () => {
    const res = await request(getApp()).get('/api/workspaces').expect(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('rate limiting', () => {
  it('returns 429 with the standard envelope once the limit is hit', async () => {
    const app = express();
    app.use(createRateLimiter({ name: 'test', windowMs: 60_000, limit: 2, force: true }));
    app.get('/x', (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);
    await request(app).get('/x').expect(200);
    await request(app).get('/x').expect(200);
    const res = await request(app).get('/x').expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['ratelimit-policy'] ?? res.headers['ratelimit']).toBeDefined();
  });

  // Regression: one shared "sensitive" bucket let email verification exhaust invite acceptance.
  it('keeps independent budgets per endpoint', async () => {
    const app = express();
    app.get('/verify', createRateLimiter({ name: 'verify-t', windowMs: 60_000, limit: 1, force: true }), (_req, res) => res.json({ ok: true }));
    app.get('/accept', createRateLimiter({ name: 'accept-t', windowMs: 60_000, limit: 1, force: true }), (_req, res) => res.json({ ok: true }));
    await request(app).get('/verify').expect(200);
    await request(app).get('/verify').expect(429);
    await request(app).get('/accept').expect(200);
  });

  it('gives every sensitive endpoint a realistic budget', () => {
    expect(RATE_LIMITS.verifyEmail.limit).toBeGreaterThanOrEqual(10);
    expect(RATE_LIMITS.invitationLookup.limit).toBeGreaterThanOrEqual(10);
    expect(RATE_LIMITS.forgotPassword.limit).toBeLessThanOrEqual(5);
    expect(RATE_LIMITS.login.limit).toBeLessThanOrEqual(10);
  });
});

describe('health checks', () => {
  it('reports liveness and readiness', async () => {
    await request(getApp()).get('/api/health').expect(200);
    const ready = await request(getApp()).get('/api/health/ready').expect(200);
    expect(ready.body.data.checks.database).toBe('ok');
    expect(ready.body.data.checks.redis).toBe('not_configured');
  });
});

describe('super admin API', () => {
  it('is forbidden to regular users and available to super admins', async () => {
    const { client, email } = await registerClient();
    await client.get('/api/admin/overview').expect(403);
    await db.user.update({ where: { email }, data: { platformRole: 'SUPER_ADMIN' } });
    const res = await client.get('/api/admin/overview').expect(200);
    expect(res.body.data).toMatchObject({ users: 1, workspaces: 0 });
  });
});
