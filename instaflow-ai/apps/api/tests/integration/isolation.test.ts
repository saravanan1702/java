import { describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { WORKSPACE_HEADER, addMember, ownerWithWorkspace, uniqueEmail } from '../helpers.js';

/**
 * Workspace isolation at the HTTP layer: a member of workspace A must not be
 * able to read or modify anything in workspace B, whatever IDs they supply.
 */
describe('workspace isolation (HTTP)', () => {
  async function twoTenants() {
    const a = await ownerWithWorkspace('Tenant A');
    const b = await ownerWithWorkspace('Tenant B');
    const bAgent = await addMember(b.client, 'AGENT');
    const bInvite = await b.client.post('/api/invitations', { email: uniqueEmail(), role: 'AGENT' }).expect(201);
    return { a, b, bAgent, bInviteId: bInvite.body.data.id as string };
  }

  it('cannot select another tenant via the workspace header', async () => {
    const { a, b } = await twoTenants();
    for (const path of ['/api/workspaces/current', '/api/members', '/api/invitations', '/api/audit-logs']) {
      const res = await a.client.agent.get(path).set(WORKSPACE_HEADER, b.workspaceId);
      expect(res.status, path).toBe(404);
    }
  });

  it('cannot modify another tenant’s members by id from its own workspace', async () => {
    const { a, bAgent } = await twoTenants();
    await a.client.patch(`/api/members/${bAgent.memberId}`, { role: 'ADMIN' }).expect(404);
    await a.client.delete(`/api/members/${bAgent.memberId}`).expect(404);
    expect((await db.workspaceMember.findUniqueOrThrow({ where: { id: bAgent.memberId } })).role).toBe('AGENT');
  });

  it('cannot revoke or resend another tenant’s invitations', async () => {
    const { a, bInviteId } = await twoTenants();
    await a.client.delete(`/api/invitations/${bInviteId}`).expect(404);
    await a.client.post(`/api/invitations/${bInviteId}/resend`).expect(404);
    expect((await db.workspaceInvitation.findUniqueOrThrow({ where: { id: bInviteId } })).revokedAt).toBeNull();
  });

  it('cannot update or delete another tenant’s workspace', async () => {
    const { a, b } = await twoTenants();
    await a.client.agent.patch('/api/workspaces/current').set(WORKSPACE_HEADER, b.workspaceId).set('x-csrf-token', a.client.csrfToken).send({ name: 'Hacked' }).expect(404);
    await a.client.agent.delete('/api/workspaces/current').set(WORKSPACE_HEADER, b.workspaceId).set('x-csrf-token', a.client.csrfToken).send({ confirmName: 'Tenant B' }).expect(404);
    const ws = await db.workspace.findUniqueOrThrow({ where: { id: b.workspaceId } });
    expect(ws).toMatchObject({ name: 'Tenant B', deletedAt: null });
  });

  it('lists only its own tenant’s data', async () => {
    const { a } = await twoTenants();
    const members = await a.client.get('/api/members').expect(200);
    expect(members.body.data).toHaveLength(1);
    const invites = await a.client.get('/api/invitations').expect(200);
    expect(invites.body.data).toHaveLength(0);
    const audit = await a.client.get('/api/audit-logs?pageSize=100').expect(200);
    expect(audit.body.data.every((e: { action: string }) => !e.action.startsWith('invitation'))).toBe(true);
  });

  it('a super admin gets no implicit access to tenant workspaces', async () => {
    const { a, b } = await twoTenants();
    await db.user.update({ where: { id: a.userId }, data: { platformRole: 'SUPER_ADMIN' } });
    await a.client.agent.get('/api/members').set(WORKSPACE_HEADER, b.workspaceId).expect(404);
  });

  it('rejects malformed workspace ids without leaking information', async () => {
    const { a } = await twoTenants();
    await a.client.agent.get('/api/members').set(WORKSPACE_HEADER, "' OR 1=1 --").expect(404);
  });
});
