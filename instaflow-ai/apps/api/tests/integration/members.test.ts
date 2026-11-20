import { describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { addMember, lastMailTo, ownerWithWorkspace, registerClient, tokenFromMail, uniqueEmail } from '../helpers.js';

describe('invitations', () => {
  it('runs the full invite → preview → accept flow', async () => {
    const owner = await ownerWithWorkspace('Invite Co');
    const inviteeEmail = uniqueEmail('invitee');
    const created = await owner.client.post('/api/invitations', { email: inviteeEmail, role: 'AGENT' }).expect(201);
    expect(created.body.data).toMatchObject({ email: inviteeEmail, role: 'AGENT', status: 'PENDING' });
    expect(JSON.stringify(created.body)).not.toMatch(/tokenHash/);

    const mail = lastMailTo(inviteeEmail);
    expect(mail.subject).toContain('Invite Co');
    const token = tokenFromMail(mail);

    const anon = (await registerClient({ email: inviteeEmail })).client;
    const preview = await anon.get(`/api/invitations/lookup?token=${token}`).expect(200);
    expect(preview.body.data).toMatchObject({ workspaceName: 'Invite Co', role: 'AGENT', email: inviteeEmail });

    const accepted = await anon.post('/api/invitations/accept', { token }).expect(200);
    expect(accepted.body.data).toMatchObject({ role: 'AGENT', workspace: { name: 'Invite Co' } });

    // Accepting the emailed link proves inbox control.
    expect((await anon.get('/api/auth/me')).body.data.user.emailVerified).toBe(true);
    // Single use.
    await anon.post('/api/invitations/accept', { token }).expect(400);
    const members = await owner.client.get('/api/members').expect(200);
    expect(members.body.data).toHaveLength(2);
  });

  it('refuses acceptance by a different account', async () => {
    const owner = await ownerWithWorkspace();
    const target = uniqueEmail('target');
    await owner.client.post('/api/invitations', { email: target, role: 'ADMIN' }).expect(201);
    const token = tokenFromMail(lastMailTo(target));
    const intruder = (await registerClient()).client;
    const res = await intruder.post('/api/invitations/accept', { token }).expect(403);
    expect(res.body.error.message).toContain('Sign in with that email');
    expect(res.body.error.message).not.toContain(target); // masked
  });

  it('requires a verified email to invite', async () => {
    const owner = await ownerWithWorkspace();
    await db.user.update({ where: { email: owner.email }, data: { emailVerifiedAt: null } });
    const res = await owner.client.post('/api/invitations', { email: uniqueEmail(), role: 'AGENT' }).expect(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('enforces who can invite whom', async () => {
    const owner = await ownerWithWorkspace();
    const admin = await addMember(owner.client, 'ADMIN');
    const agent = await addMember(owner.client, 'AGENT');
    await admin.client.post('/api/invitations', { email: uniqueEmail(), role: 'ADMIN' }).expect(201);
    await admin.client.post('/api/invitations', { email: uniqueEmail(), role: 'OWNER' }).expect(403);
    await agent.client.post('/api/invitations', { email: uniqueEmail(), role: 'AGENT' }).expect(403);
    await agent.client.get('/api/invitations').expect(403);
  });

  it('prevents duplicate pending invites and inviting existing members', async () => {
    const owner = await ownerWithWorkspace();
    const email = uniqueEmail();
    await owner.client.post('/api/invitations', { email, role: 'AGENT' }).expect(201);
    await owner.client.post('/api/invitations', { email, role: 'AGENT' }).expect(409);
    const member = await addMember(owner.client, 'AGENT');
    await owner.client.post('/api/invitations', { email: member.email, role: 'ADMIN' }).expect(409);
  });

  it('revoked and expired invitations cannot be accepted', async () => {
    const owner = await ownerWithWorkspace();
    const revokedEmail = uniqueEmail();
    const inv = await owner.client.post('/api/invitations', { email: revokedEmail, role: 'AGENT' }).expect(201);
    const revokedToken = tokenFromMail(lastMailTo(revokedEmail));
    await owner.client.delete(`/api/invitations/${inv.body.data.id}`).expect(204);
    const r = (await registerClient({ email: revokedEmail })).client;
    await r.post('/api/invitations/accept', { token: revokedToken }).expect(400);

    const expiredEmail = uniqueEmail();
    await owner.client.post('/api/invitations', { email: expiredEmail, role: 'AGENT' }).expect(201);
    const expiredToken = tokenFromMail(lastMailTo(expiredEmail));
    await db.workspaceInvitation.updateMany({ where: { email: expiredEmail }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const e = (await registerClient({ email: expiredEmail })).client;
    await e.get(`/api/invitations/lookup?token=${expiredToken}`).expect(400);
    await e.post('/api/invitations/accept', { token: expiredToken }).expect(400);
  });

  it('resending rotates the token', async () => {
    const owner = await ownerWithWorkspace();
    const email = uniqueEmail();
    const inv = await owner.client.post('/api/invitations', { email, role: 'AGENT' }).expect(201);
    const oldToken = tokenFromMail(lastMailTo(email));
    await owner.client.post(`/api/invitations/${inv.body.data.id}/resend`).expect(200);
    const newToken = tokenFromMail(lastMailTo(email));
    expect(newToken).not.toBe(oldToken);
    const invitee = (await registerClient({ email })).client;
    await invitee.post('/api/invitations/accept', { token: oldToken }).expect(400);
    await invitee.post('/api/invitations/accept', { token: newToken }).expect(200);
  });
});

describe('member management (RBAC)', () => {
  it('owners can change roles; admins can only manage agents', async () => {
    const owner = await ownerWithWorkspace();
    const admin = await addMember(owner.client, 'ADMIN');
    const agent = await addMember(owner.client, 'AGENT');
    const agent2 = await addMember(owner.client, 'AGENT');

    await owner.client.patch(`/api/members/${agent.memberId}`, { role: 'ADMIN' }).expect(200);
    await admin.client.patch(`/api/members/${agent2.memberId}`, { role: 'ADMIN' }).expect(200);
    // agent (now ADMIN) is no longer manageable by another admin
    await admin.client.patch(`/api/members/${agent.memberId}`, { role: 'AGENT' }).expect(403);
    const ownerMember = await db.workspaceMember.findFirstOrThrow({ where: { userId: owner.userId } });
    await admin.client.delete(`/api/members/${ownerMember.id}`).expect(403);

    const roleChanges = await db.auditLog.count({ where: { action: 'member.role_changed' } });
    expect(roleChanges).toBe(2);
  });

  it('agents cannot manage members', async () => {
    const owner = await ownerWithWorkspace();
    const agent = await addMember(owner.client, 'AGENT');
    const other = await addMember(owner.client, 'AGENT');
    await agent.client.get('/api/members').expect(200);
    await agent.client.patch(`/api/members/${other.memberId}`, { role: 'ADMIN' }).expect(403);
    await agent.client.delete(`/api/members/${other.memberId}`).expect(403);
  });

  it('always keeps at least one owner', async () => {
    const owner = await ownerWithWorkspace();
    const ownerMember = await db.workspaceMember.findFirstOrThrow({ where: { userId: owner.userId } });
    // self-change is blocked outright
    await owner.client.patch(`/api/members/${ownerMember.id}`, { role: 'ADMIN' }).expect(403);
    // sole owner cannot leave
    const leave = await owner.client.post('/api/workspaces/current/leave').expect(403);
    expect(leave.body.error.message).toMatch(/only owner/i);

    const coOwner = await addMember(owner.client, 'OWNER');
    await coOwner.client.patch(`/api/members/${ownerMember.id}`, { role: 'ADMIN' }).expect(200);
    // now coOwner is the only owner and cannot be demoted by the (new) admin
    await owner.client.patch(`/api/members/${coOwner.memberId}`, { role: 'AGENT' }).expect(403);
  });

  it('removed members lose access immediately', async () => {
    const owner = await ownerWithWorkspace();
    const agent = await addMember(owner.client, 'AGENT');
    await agent.client.get('/api/workspaces/current').expect(200);
    await owner.client.delete(`/api/members/${agent.memberId}`).expect(204);
    await agent.client.get('/api/workspaces/current').expect(404);
  });

  it('members can leave voluntarily', async () => {
    const owner = await ownerWithWorkspace();
    const agent = await addMember(owner.client, 'AGENT');
    await agent.client.post('/api/workspaces/current/leave').expect(204);
    await agent.client.get('/api/workspaces/current').expect(404);
  });
});

describe('audit log', () => {
  it('records security events and is visible to managers only', async () => {
    const owner = await ownerWithWorkspace();
    const agent = await addMember(owner.client, 'AGENT');
    const res = await owner.client.get('/api/audit-logs?pageSize=50').expect(200);
    const actions = res.body.data.map((a: { action: string }) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['workspace.created', 'invitation.created', 'invitation.accepted']));
    expect(res.body.meta.pagination).toMatchObject({ page: 1, pageSize: 50 });
    await agent.client.get('/api/audit-logs').expect(403);
  });
});
