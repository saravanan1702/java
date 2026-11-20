import type { Request } from 'express';
import {
  INVITATION_TTL_DAYS,
  ROLE_LABELS,
  assignableRoles,
  type InvitationDto,
  type InvitationPreviewDto,
  type InviteMemberInput,
  type MembershipDto,
} from '@instaflow/shared';
import { db } from '../../lib/db.js';
import { conflict, forbidden, notFound, tokenInvalid } from '../../lib/errors.js';
import { generateToken, sha256 } from '../../lib/crypto.js';
import { toInvitationDto, toMembershipDto } from '../../lib/serializers.js';
import type { User } from '../../generated/prisma/client.js';
import type { WorkspaceContext } from '../../types/express.js';
import { dispatch } from '../../queues/queues.js';
import { QUEUES } from '../../queues/names.js';
import { invitationEmail } from '../mail/templates.js';
import { recordAudit } from '../audit/audit.service.js';

const MAX_PENDING_INVITATIONS = 50;
const ttl = () => new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 2)}${'•'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export async function listInvitations(ctx: WorkspaceContext): Promise<InvitationDto[]> {
  const rows = await ctx.db.workspaceInvitation.findMany({
    where: { acceptedAt: null, revokedAt: null },
    include: { invitedBy: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => toInvitationDto(r));
}

export async function createInvitation(ctx: WorkspaceContext, actor: User, input: InviteMemberInput, req: Request): Promise<InvitationDto> {
  if (!assignableRoles(ctx.role).includes(input.role)) {
    throw forbidden(`Your role cannot invite people as ${ROLE_LABELS[input.role]}.`);
  }

  const existingUser = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existingUser && (await ctx.db.workspaceMember.findFirst({ where: { userId: existingUser.id }, select: { id: true } }))) {
    throw conflict('This person is already a member of the workspace.');
  }

  const now = new Date();
  const pending = await ctx.db.workspaceInvitation.findMany({ where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } }, select: { email: true } });
  if (pending.some((p) => p.email === input.email)) {
    throw conflict('An invitation is already pending for this email. Resend it instead.');
  }
  if (pending.length >= MAX_PENDING_INVITATIONS) {
    throw conflict(`A workspace can have at most ${MAX_PENDING_INVITATIONS} pending invitations.`);
  }

  const token = generateToken(32);
  const invitation = await ctx.db.workspaceInvitation.create({
    // workspaceId is also enforced by the tenant-scoped client; a mismatch would throw.
    data: { workspaceId: ctx.workspace.id, email: input.email, role: input.role, tokenHash: sha256(token), invitedById: actor.id, expiresAt: ttl() },
    include: { invitedBy: true },
  });
  await dispatch(QUEUES.email, invitationEmail(input.email, actor.name, ctx.workspace.name, input.role, token));
  await recordAudit({
    action: 'invitation.created',
    workspaceId: ctx.workspace.id,
    actorId: actor.id,
    targetType: 'WorkspaceInvitation',
    targetId: invitation.id,
    metadata: { email: input.email, role: input.role },
    req,
  });
  return toInvitationDto(invitation);
}

async function findPending(ctx: WorkspaceContext, id: string) {
  const inv = await ctx.db.workspaceInvitation.findFirst({ where: { id, acceptedAt: null, revokedAt: null } });
  if (!inv) throw notFound('Invitation not found.');
  return inv;
}

export async function revokeInvitation(ctx: WorkspaceContext, actor: User, id: string, req: Request): Promise<void> {
  const inv = await findPending(ctx, id);
  await ctx.db.workspaceInvitation.update({ where: { id: inv.id }, data: { revokedAt: new Date() } });
  await recordAudit({ action: 'invitation.revoked', workspaceId: ctx.workspace.id, actorId: actor.id, targetType: 'WorkspaceInvitation', targetId: id, metadata: { email: inv.email }, req });
}

/** Resending rotates the token (old links stop working) and resets the expiry. */
export async function resendInvitation(ctx: WorkspaceContext, actor: User, id: string, req: Request): Promise<InvitationDto> {
  const inv = await findPending(ctx, id);
  if (!assignableRoles(ctx.role).includes(inv.role)) throw forbidden(`Your role cannot invite people as ${ROLE_LABELS[inv.role]}.`);
  const token = generateToken(32);
  const updated = await ctx.db.workspaceInvitation.update({
    where: { id: inv.id },
    data: { tokenHash: sha256(token), expiresAt: ttl() },
    include: { invitedBy: true },
  });
  await dispatch(QUEUES.email, invitationEmail(inv.email, actor.name, ctx.workspace.name, inv.role, token));
  await recordAudit({ action: 'invitation.resent', workspaceId: ctx.workspace.id, actorId: actor.id, targetType: 'WorkspaceInvitation', targetId: id, req });
  return toInvitationDto(updated);
}

/**
 * Token-authenticated lookups below run before the user belongs to the
 * workspace, so they use the base client; the secret token is the authorization.
 */
async function findValidByToken(token: string) {
  const inv = await db.workspaceInvitation.findUnique({
    where: { tokenHash: sha256(token) },
    include: { workspace: true, invitedBy: true },
  });
  if (!inv || inv.acceptedAt || inv.revokedAt || inv.expiresAt <= new Date() || inv.workspace.deletedAt) {
    throw tokenInvalid('This invitation is invalid, has expired, or was already used.');
  }
  return inv;
}

export async function previewInvitation(token: string): Promise<InvitationPreviewDto> {
  const inv = await findValidByToken(token);
  return {
    workspaceName: inv.workspace.name,
    invitedByName: inv.invitedBy?.name ?? null,
    email: inv.email,
    role: inv.role,
    expiresAt: inv.expiresAt.toISOString(),
  };
}

export async function acceptInvitation(user: User, token: string, req: Request): Promise<MembershipDto> {
  const inv = await findValidByToken(token);
  if (inv.email !== user.email) {
    throw forbidden(`This invitation was sent to ${maskEmail(inv.email)}. Sign in with that email address to accept it.`);
  }

  const membership = await db.$transaction(async (tx) => {
    const claimed = await tx.workspaceInvitation.updateMany({
      where: { id: inv.id, acceptedAt: null, revokedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (claimed.count !== 1) throw tokenInvalid('This invitation was already used.');

    const member = await tx.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId: user.id } },
      create: { workspaceId: inv.workspaceId, userId: user.id, role: inv.role, invitedById: inv.invitedById },
      update: {},
      include: { workspace: true },
    });
    await tx.user.update({
      where: { id: user.id },
      // Opening the emailed link proves control of this inbox.
      data: { lastWorkspaceId: inv.workspaceId, emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
    });
    return member;
  });

  await recordAudit({
    action: 'invitation.accepted',
    workspaceId: inv.workspaceId,
    actorId: user.id,
    targetType: 'WorkspaceInvitation',
    targetId: inv.id,
    metadata: { role: membership.role },
    req,
  });
  return toMembershipDto(membership);
}
