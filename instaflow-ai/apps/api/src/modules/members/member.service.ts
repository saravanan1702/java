import type { Request } from 'express';
import { checkMemberChange, type MemberDto, type WorkspaceRole } from '@instaflow/shared';
import { db } from '../../lib/db.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { toMemberDto } from '../../lib/serializers.js';
import type { User } from '../../generated/prisma/client.js';
import type { WorkspaceContext } from '../../types/express.js';
import { recordAudit } from '../audit/audit.service.js';

export async function listMembers(ctx: WorkspaceContext): Promise<MemberDto[]> {
  const rows = await ctx.db.workspaceMember.findMany({
    where: { user: { deletedAt: null } },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toMemberDto);
}

/**
 * Role change / removal run in a SERIALIZABLE transaction so two owners
 * demoting each other concurrently cannot leave the workspace ownerless.
 */
async function changeMember(ctx: WorkspaceContext, actor: User, memberId: string, newRole: WorkspaceRole | undefined, req: Request) {
  const result = await ctx.db.$transaction(
    async (tx) => {
      const target = await tx.workspaceMember.findUnique({ where: { id: memberId }, include: { user: true } });
      if (!target) throw notFound('Member not found.');
      if (newRole && target.role === newRole) return { target, changed: false };

      const ownerCount = await tx.workspaceMember.count({ where: { role: 'OWNER' } });
      const check = checkMemberChange({
        actorRole: ctx.role,
        actorIsTarget: target.userId === actor.id,
        targetRole: target.role,
        newRole,
        ownerCount,
      });
      if (!check.ok) throw forbidden(check.reason);

      if (newRole) {
        const updated = await tx.workspaceMember.update({ where: { id: memberId }, data: { role: newRole }, include: { user: true } });
        return { target: updated, previousRole: target.role, changed: true };
      }
      await tx.workspaceMember.delete({ where: { id: memberId } });
      await tx.user.updateMany({ where: { id: target.userId, lastWorkspaceId: ctx.workspace.id }, data: { lastWorkspaceId: null } });
      return { target, changed: true };
    },
    { isolationLevel: 'Serializable' },
  );
  return result;
}

export async function updateMemberRole(ctx: WorkspaceContext, actor: User, memberId: string, role: WorkspaceRole, req: Request) {
  const { target, changed, previousRole } = await changeMember(ctx, actor, memberId, role, req);
  if (changed) {
    await recordAudit({
      action: 'member.role_changed',
      workspaceId: ctx.workspace.id,
      actorId: actor.id,
      targetType: 'WorkspaceMember',
      targetId: memberId,
      metadata: { userId: target.userId, from: previousRole ?? null, to: role },
      req,
    });
  }
  return toMemberDto(target);
}

export async function removeMember(ctx: WorkspaceContext, actor: User, memberId: string, req: Request): Promise<void> {
  const { target } = await changeMember(ctx, actor, memberId, undefined, req);
  await recordAudit({
    action: 'member.removed',
    workspaceId: ctx.workspace.id,
    actorId: actor.id,
    targetType: 'WorkspaceMember',
    targetId: memberId,
    metadata: { userId: target.userId, role: target.role },
    req,
  });
}

export async function leaveWorkspace(ctx: WorkspaceContext, actor: User, req: Request): Promise<void> {
  await ctx.db.$transaction(
    async (tx) => {
      if (ctx.role === 'OWNER') {
        const owners = await tx.workspaceMember.count({ where: { role: 'OWNER' } });
        if (owners <= 1) throw forbidden('You are the only owner. Make another member an owner before leaving, or delete the workspace.');
      }
      await tx.workspaceMember.delete({ where: { id: ctx.memberId } });
    },
    { isolationLevel: 'Serializable' },
  );
  await db.user.updateMany({ where: { id: actor.id, lastWorkspaceId: ctx.workspace.id }, data: { lastWorkspaceId: null } });
  await recordAudit({ action: 'member.left', workspaceId: ctx.workspace.id, actorId: actor.id, targetType: 'WorkspaceMember', targetId: ctx.memberId, req });
}
