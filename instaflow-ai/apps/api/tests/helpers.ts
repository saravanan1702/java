import request from 'supertest';
import type { Express } from 'express';
import { CSRF_HEADER, WORKSPACE_HEADER, type AuthResultDto, type MembershipDto } from '@instaflow/shared';
import { createApp } from '../src/app.js';
import { db } from '../src/lib/db.js';
import { memoryOutbox, type MailMessage } from '../src/modules/mail/mailer.js';

let app: Express | undefined;
export function getApp(): Express {
  app ??= createApp();
  return app;
}

/**
 * A browser-like client: keeps cookies between requests and automatically
 * sends the CSRF token (and optionally a workspace header) like the SPA does.
 */
export class TestClient {
  readonly agent = request.agent(getApp());
  csrfToken = '';
  workspaceId: string | undefined;

  async init(): Promise<this> {
    const res = await this.agent.get('/api/auth/csrf').expect(200);
    this.csrfToken = res.body.data.csrfToken;
    return this;
  }

  private decorate(req: request.Test, opts: { csrf?: boolean; workspace?: boolean } = {}) {
    if (opts.csrf !== false && this.csrfToken) req.set(CSRF_HEADER, this.csrfToken);
    if (opts.workspace !== false && this.workspaceId) req.set(WORKSPACE_HEADER, this.workspaceId);
    return req;
  }

  get(url: string, opts?: { workspace?: boolean }) {
    return this.decorate(this.agent.get(url), opts);
  }
  post(url: string, body?: object, opts?: { csrf?: boolean; workspace?: boolean }) {
    return this.decorate(this.agent.post(url).send(body ?? {}), opts);
  }
  patch(url: string, body?: object, opts?: { csrf?: boolean; workspace?: boolean }) {
    return this.decorate(this.agent.patch(url).send(body ?? {}), opts);
  }
  delete(url: string, body?: object, opts?: { csrf?: boolean; workspace?: boolean }) {
    return this.decorate(this.agent.delete(url).send(body ?? {}), opts);
  }

  /** Capture the rotated CSRF token from auth responses. */
  absorb(res: request.Response) {
    if (res.body?.data?.csrfToken) this.csrfToken = res.body.data.csrfToken;
    return res;
  }
}

export const DEFAULT_PASSWORD = 'correct-horse-battery';

let counter = 0;
export function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}${counter}-${Date.now()}@example.com`;
}

export async function registerClient(overrides: { name?: string; email?: string; password?: string } = {}) {
  const client = await new TestClient().init();
  const email = overrides.email ?? uniqueEmail();
  const res = await client.post('/api/auth/register', {
    name: overrides.name ?? 'Test User',
    email,
    password: overrides.password ?? DEFAULT_PASSWORD,
  });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  client.absorb(res);
  return { client, email, me: res.body.data as AuthResultDto };
}

export async function markVerified(email: string) {
  await db.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
}

/** Registered + verified user with their own workspace selected. */
export async function ownerWithWorkspace(name = 'Acme Store') {
  const { client, email, me } = await registerClient();
  await markVerified(email);
  const res = await client.post('/api/workspaces', { name }).expect(201);
  const membership = res.body.data as MembershipDto;
  client.workspaceId = membership.workspace.id;
  return { client, email, userId: me.user.id, workspaceId: membership.workspace.id };
}

export function lastMailTo(email: string): MailMessage {
  const mail = [...memoryOutbox].reverse().find((m) => m.to === email);
  if (!mail) throw new Error(`no email sent to ${email}`);
  return mail;
}

export function tokenFromMail(mail: MailMessage): string {
  const match = mail.text.match(/[?&]token=([A-Za-z0-9_-]+)/);
  if (!match?.[1]) throw new Error('no token link in email');
  return match[1];
}

/** Invite `email` into the owner's workspace and return a client that accepted it. */
export async function addMember(owner: TestClient, role: 'ADMIN' | 'AGENT' | 'OWNER') {
  const { client, email, me } = await registerClient();
  await owner.post('/api/invitations', { email, role }).expect(201);
  const token = tokenFromMail(lastMailTo(email));
  const res = await client.post('/api/invitations/accept', { token }).expect(200);
  client.workspaceId = (res.body.data as MembershipDto).workspace.id;
  const member = await db.workspaceMember.findFirstOrThrow({ where: { userId: me.user.id, workspaceId: client.workspaceId } });
  return { client, email, userId: me.user.id, memberId: member.id };
}

export { WORKSPACE_HEADER };
