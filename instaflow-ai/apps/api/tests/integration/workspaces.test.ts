import { describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { addMember, ownerWithWorkspace, registerClient } from '../helpers.js';

describe('workspace creation', () => {
  it('creates a workspace with the creator as OWNER', async () => {
    const { client } = await registerClient();
    const res = await client.post('/api/workspaces', { name: 'Kavya Silks', timezone: 'Asia/Kolkata', defaultLanguage: 'TA_LATN' }).expect(201);
    expect(res.body.data.role).toBe('OWNER');
    expect(res.body.data.workspace).toMatchObject({ name: 'Kavya Silks', plan: 'FREE', defaultLanguage: 'TA_LATN' });
    expect(res.body.data.workspace.slug).toMatch(/^kavya-silks-[a-z0-9]{6}$/);

    const me = await client.get('/api/auth/me').expect(200);
    expect(me.body.data.user.lastWorkspaceId).toBe(res.body.data.workspace.id);
    expect(await db.auditLog.count({ where: { action: 'workspace.created' } })).toBe(1);
  });

  it('validates name and timezone', async () => {
    const { client } = await registerClient();
    const res = await client.post('/api/workspaces', { name: 'x', timezone: 'Mars/Olympus' }).expect(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name', 'timezone']));
  });

  it('lists only the caller’s workspaces', async () => {
    const a = await ownerWithWorkspace('A Store');
    await ownerWithWorkspace('B Store');
    await a.client.post('/api/workspaces', { name: 'A Second' }).expect(201);
    const res = await a.client.get('/api/workspaces').expect(200);
    expect(res.body.data.map((m: { workspace: { name: string } }) => m.workspace.name)).toEqual(['A Store', 'A Second']);
  });
});

describe('workspace switching & context', () => {
  it('requires a workspace header for workspace routes', async () => {
    const { client } = await ownerWithWorkspace();
    const res = await client.get('/api/workspaces/current', { workspace: false }).expect(400);
    expect(res.body.error.code).toBe('WORKSPACE_REQUIRED');
  });

  it('returns a summary of the active workspace', async () => {
    const { client } = await ownerWithWorkspace('Summary Co');
    const res = await client.get('/api/workspaces/current').expect(200);
    expect(res.body.data).toMatchObject({
      role: 'OWNER',
      workspace: { name: 'Summary Co' },
      counts: { members: 1, pendingInvitations: 0, instagramAccounts: 0, automationRules: 0, products: 0 },
    });
  });

  it('switches only to workspaces the user belongs to', async () => {
    const a = await ownerWithWorkspace('Alpha');
    const b = await ownerWithWorkspace('Beta');
    const second = await a.client.post('/api/workspaces', { name: 'Alpha Two' }).expect(201);
    await a.client.post(`/api/workspaces/${a.workspaceId}/select`).expect(204);
    expect((await a.client.get('/api/auth/me')).body.data.user.lastWorkspaceId).toBe(a.workspaceId);
    await a.client.post(`/api/workspaces/${second.body.data.workspace.id}/select`).expect(204);
    await a.client.post(`/api/workspaces/${b.workspaceId}/select`).expect(404);
  });
});

describe('workspace settings & deletion (RBAC)', () => {
  it('lets owners and admins update settings, but not agents', async () => {
    const owner = await ownerWithWorkspace('Old Name');
    const admin = await addMember(owner.client, 'ADMIN');
    const agent = await addMember(owner.client, 'AGENT');

    await owner.client.patch('/api/workspaces/current', { name: 'New Name' }).expect(200);
    await admin.client.patch('/api/workspaces/current', { timezone: 'Asia/Singapore' }).expect(200);
    const denied = await agent.client.patch('/api/workspaces/current', { name: 'Agent Name' }).expect(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
    await owner.client.patch('/api/workspaces/current', {}).expect(400);
  });

  it('only owners can delete, and must confirm the exact name', async () => {
    const owner = await ownerWithWorkspace('Delete Me');
    const admin = await addMember(owner.client, 'ADMIN');
    await admin.client.delete('/api/workspaces/current', { confirmName: 'Delete Me' }).expect(403);
    await owner.client.delete('/api/workspaces/current', { confirmName: 'delete me' }).expect(400);
    await owner.client.delete('/api/workspaces/current', { confirmName: 'Delete Me' }).expect(204);

    // Gone for every member, immediately.
    await owner.client.get('/api/workspaces/current').expect(404);
    await admin.client.get('/api/workspaces/current').expect(404);
    expect((await owner.client.get('/api/workspaces')).body.data).toEqual([]);
    expect((await owner.client.get('/api/auth/me')).body.data.user.lastWorkspaceId).toBeNull();
    // Soft-deleted, retained for the purge window.
    expect(await db.workspace.count({ where: { deletedAt: { not: null } } })).toBe(1);
  });
});
