import type { Request } from 'express';
import type { CreateWorkspaceInput, MembershipDto, UpdateWorkspaceInput, WorkspaceSummaryDto } from '@instaflow/shared';
import { createWorkspaceSchema } from '@instaflow/shared';
import { db, Prisma } from '../../lib/db.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { uniqueSlug } from '../../lib/slug.js';
import { toMembershipDto, toWorkspaceDto } from '../../lib/serializers.js';
import type { User } from '../../generated/prisma/client.js';
import type { WorkspaceContext } from '../../types/express.js';
import { recordAudit } from '../audit/audit.service.js';

/** Abuse guard for the free tier; raise per plan in Phase 6 (usage limits). */
export const MAX_OWNED_WORKSPACES = 10;

export async function createWorkspace(user: User, rawInput: CreateWorkspaceInput, req: Request): Promise<MembershipDto> {
  const input = createWorkspaceSchema.parse(rawInput);
  const owned = await db.workspaceMember.count({ where: { userId: user.id, role: 'OWNER', workspace: { deletedAt: null } } });
  if (owned >= MAX_OWNED_WORKSPACES) {
    throw conflict(`You can own up to ${MAX_OWNED_WORKSPACES} workspaces.`);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const membership = await db.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: { name: input.name, slug: uniqueSlug(input.name), timezone: input.timezone, defaultLanguage: input.defaultLanguage },
        });
        const member = await tx.workspaceMember.create({
          data: { workspaceId: workspace.id, userId: user.id, role: 'OWNER' },
          include: { workspace: true },
        });
        await tx.user.update({ where: { id: user.id }, data: { lastWorkspaceId: workspace.id } });
        return member;
      });
      await recordAudit({
        action: 'workspace.created',
        workspaceId: membership.workspaceId,
        actorId: user.id,
        targetType: 'Workspace',
        targetId: membership.workspaceId,
        metadata: { name: input.name },
        req,
      });
      return toMembershipDto(membership);
    } catch (err) {
      // Retry only on the (astronomically rare) random slug collision.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && attempt < 2) continue;
      throw err;
    }
  }
  throw new Error('unreachable');
}

export async function listMemberships(userId: string): Promise<MembershipDto[]> {
  const rows = await db.workspaceMember.findMany({
    where: { userId, workspace: { deletedAt: null } },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toMembershipDto);
}

export async function selectWorkspace(userId: string, workspaceId: string): Promise<void> {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  });
  if (!member || member.workspace.deletedAt) throw notFound('Workspace not found.');
  await db.user.update({ where: { id: userId }, data: { lastWorkspaceId: workspaceId } });
}

export async function getSummary(ctx: WorkspaceContext): Promise<WorkspaceSummaryDto> {
  const now = new Date();
  const [members, pendingInvitations, instagramAccounts, automationRules, products] = await Promise.all([
    ctx.db.workspaceMember.count(),
    ctx.db.workspaceInvitation.count({ where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } } }),
    ctx.db.instagramAccount.count({ where: { status: { not: 'DISCONNECTED' } } }),
    ctx.db.automationRule.count({ where: { deletedAt: null } }),
    ctx.db.product.count({ where: { deletedAt: null } }),
  ]);
  return {
    workspace: toWorkspaceDto(ctx.workspace),
    role: ctx.role,
    counts: { members, pendingInvitations, instagramAccounts, automationRules, products },
  };
}

export async function updateWorkspace(ctx: WorkspaceContext, actor: User, input: UpdateWorkspaceInput, req: Request) {
  const updated = await db.workspace.update({ where: { id: ctx.workspace.id }, data: input });
  await recordAudit({
    action: 'workspace.updated',
    workspaceId: ctx.workspace.id,
    actorId: actor.id,
    targetType: 'Workspace',
    targetId: ctx.workspace.id,
    metadata: { changed: Object.keys(input) },
    req,
  });
  return toWorkspaceDto(updated);
}

/**
 * Soft delete: the workspace disappears for all members immediately and is
 * eligible for permanent purge after a retention window (purge job: Phase 7).
 */
export async function deleteWorkspace(ctx: WorkspaceContext, actor: User, confirmName: string, req: Request): Promise<void> {
  if (confirmName.trim() !== ctx.workspace.name) {
    throw badRequest('The name you typed does not match this workspace.', [{ path: 'confirmName', message: 'Name does not match' }]);
  }
  const now = new Date();
  await db.$transaction([
    db.workspace.update({ where: { id: ctx.workspace.id }, data: { deletedAt: now } }),
    db.workspaceInvitation.updateMany({ where: { workspaceId: ctx.workspace.id, acceptedAt: null, revokedAt: null }, data: { revokedAt: now } }),
    db.user.updateMany({ where: { lastWorkspaceId: ctx.workspace.id }, data: { lastWorkspaceId: null } }),
  ]);
  await recordAudit({ action: 'workspace.deleted', workspaceId: ctx.workspace.id, actorId: actor.id, targetType: 'Workspace', targetId: ctx.workspace.id, req });
}
