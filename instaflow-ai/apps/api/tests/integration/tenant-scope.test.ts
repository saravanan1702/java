import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db.js';
import { TenantScopeViolation, forWorkspace } from '../../src/lib/tenant-db.js';

/**
 * Proves the two layers of tenant isolation below the HTTP layer:
 *  1. the tenant-scoped Prisma client, and
 *  2. composite foreign keys in PostgreSQL.
 */
describe('tenant-scoped database client', () => {
  let wsA: string;
  let wsB: string;
  let productB: string;

  beforeEach(async () => {
    wsA = (await db.workspace.create({ data: { name: 'A', slug: 'a-1' } })).id;
    wsB = (await db.workspace.create({ data: { name: 'B', slug: 'b-1' } })).id;
    productB = (await db.product.create({ data: { workspaceId: wsB, name: 'B secret product' } })).id;
  });

  it('cannot read another workspace’s rows by id or by listing', async () => {
    const a = forWorkspace(wsA);
    expect(await a.product.findUnique({ where: { id: productB } })).toBeNull();
    expect(await a.product.findFirst({ where: { id: productB } })).toBeNull();
    expect(await a.product.findMany()).toHaveLength(0);
    expect(await a.product.count()).toBe(0);
    // ...while the owning workspace can.
    expect(await forWorkspace(wsB).product.findUnique({ where: { id: productB } })).not.toBeNull();
  });

  it('cannot update or delete another workspace’s rows', async () => {
    const a = forWorkspace(wsA);
    await expect(a.product.update({ where: { id: productB }, data: { name: 'pwned' } })).rejects.toThrow();
    expect((await a.product.updateMany({ where: { id: productB }, data: { name: 'pwned' } })).count).toBe(0);
    await expect(a.product.delete({ where: { id: productB } })).rejects.toThrow();
    expect((await a.product.deleteMany({})).count).toBe(0);
    expect((await db.product.findUniqueOrThrow({ where: { id: productB } })).name).toBe('B secret product');
  });

  it('stamps workspaceId on create and rejects writes into another workspace', async () => {
    const a = forWorkspace(wsA);
    const created = await a.product.create({ data: { workspaceId: wsA, name: 'mine' } });
    expect(created.workspaceId).toBe(wsA);

    await expect(a.product.create({ data: { workspaceId: wsB, name: 'sneaky' } })).rejects.toBeInstanceOf(TenantScopeViolation);
    await expect(
      a.product.createMany({ data: [{ workspaceId: wsA, name: 'ok' }, { workspaceId: wsB, name: 'sneaky' }] }),
    ).rejects.toBeInstanceOf(TenantScopeViolation);
    expect(await db.product.count({ where: { workspaceId: wsB } })).toBe(1);
  });

  it('refuses to move a record to another workspace', async () => {
    const a = forWorkspace(wsA);
    const mine = await a.product.create({ data: { workspaceId: wsA, name: 'mine' } });
    await expect(a.product.update({ where: { id: mine.id }, data: { workspaceId: wsB } })).rejects.toBeInstanceOf(TenantScopeViolation);
  });

  it('requires a workspace id', () => {
    expect(() => forWorkspace('')).toThrow(TenantScopeViolation);
  });
});

describe('composite foreign keys (database-level isolation)', () => {
  it('rejects a child row whose parent belongs to another workspace', async () => {
    const wsA = (await db.workspace.create({ data: { name: 'A', slug: 'a-2' } })).id;
    const wsB = (await db.workspace.create({ data: { name: 'B', slug: 'b-2' } })).id;
    const igA = await db.instagramAccount.create({ data: { workspaceId: wsA, igUserId: '1784000001', username: 'shop_a', isMock: true } });
    const convA = await db.conversation.create({ data: { workspaceId: wsA, instagramAccountId: igA.id, igScopedUserId: 'igsid-1' } });

    // Even raw base-client writes cannot attach B's message to A's conversation.
    await expect(
      db.message.create({ data: { workspaceId: wsB, conversationId: convA.id, direction: 'INBOUND', source: 'CUSTOMER', status: 'RECEIVED', text: 'hi' } }),
    ).rejects.toThrow();

    // Nor B's media/conversation to A's Instagram account.
    await expect(db.conversation.create({ data: { workspaceId: wsB, instagramAccountId: igA.id, igScopedUserId: 'igsid-2' } })).rejects.toThrow();

    // The correct workspace succeeds.
    await expect(
      db.message.create({ data: { workspaceId: wsA, conversationId: convA.id, direction: 'INBOUND', source: 'CUSTOMER', status: 'RECEIVED', text: 'hi' } }),
    ).resolves.toBeTruthy();
  });

  it('enforces one AutomationExecution per idempotency key (no duplicate private replies)', async () => {
    const ws = (await db.workspace.create({ data: { name: 'A', slug: 'a-3' } })).id;
    const ig = await db.instagramAccount.create({ data: { workspaceId: ws, igUserId: '1784000002', username: 'shop', isMock: true } });
    const data = { workspaceId: ws, instagramAccountId: ig.id, trigger: 'COMMENT' as const, idempotencyKey: 'private_reply:comment-123' };
    await db.automationExecution.create({ data });
    await expect(db.automationExecution.create({ data })).rejects.toThrow();
  });
});
