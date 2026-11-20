import type { AuditLogDto, InvitationDto, MemberDto, MembershipDto, UserDto, WorkspaceDto } from '@instaflow/shared';
import type { AuditLog, User, Workspace, WorkspaceInvitation, WorkspaceMember } from '../generated/prisma/client.js';

/**
 * Explicit allow-list mapping from DB rows to API DTOs.
 * Never spread a DB row into a response — that is how hashes and tokens leak.
 */

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    emailVerified: u.emailVerifiedAt !== null,
    platformRole: u.platformRole,
    lastWorkspaceId: u.lastWorkspaceId,
    createdAt: u.createdAt.toISOString(),
  };
}

export function toWorkspaceDto(w: Workspace): WorkspaceDto {
  return {
    id: w.id,
    name: w.name,
    slug: w.slug,
    plan: w.plan,
    timezone: w.timezone,
    defaultLanguage: w.defaultLanguage,
    createdAt: w.createdAt.toISOString(),
  };
}

export function toMembershipDto(m: WorkspaceMember & { workspace: Workspace }): MembershipDto {
  return { role: m.role, joinedAt: m.createdAt.toISOString(), workspace: toWorkspaceDto(m.workspace) };
}

export function toMemberDto(m: WorkspaceMember & { user: User }): MemberDto {
  return {
    id: m.id,
    role: m.role,
    joinedAt: m.createdAt.toISOString(),
    user: { id: m.user.id, name: m.user.name, email: m.user.email, emailVerified: m.user.emailVerifiedAt !== null },
  };
}

export function toInvitationDto(i: WorkspaceInvitation & { invitedBy: User | null }, now = new Date()): InvitationDto {
  return {
    id: i.id,
    email: i.email,
    role: i.role,
    expiresAt: i.expiresAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
    invitedBy: i.invitedBy ? { id: i.invitedBy.id, name: i.invitedBy.name } : null,
    status: i.expiresAt <= now ? 'EXPIRED' : 'PENDING',
  };
}

export function toAuditLogDto(a: AuditLog & { actor: User | null }): AuditLogDto {
  return {
    id: a.id,
    action: a.action,
    targetType: a.targetType,
    targetId: a.targetId,
    metadata: (a.metadata as Record<string, unknown> | null) ?? null,
    actor: a.actor ? { id: a.actor.id, name: a.actor.name, email: a.actor.email } : null,
    ip: a.ip,
    createdAt: a.createdAt.toISOString(),
  };
}
