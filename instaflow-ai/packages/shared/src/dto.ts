import type { WorkspaceLanguage, WorkspacePlan } from './constants.js';
import type { PlatformRole, WorkspaceRole } from './roles.js';

/** Shapes returned by the API. Never contain secrets or token material. */

export interface UserDto {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  platformRole: PlatformRole;
  lastWorkspaceId: string | null;
  createdAt: string;
}

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  timezone: string;
  defaultLanguage: WorkspaceLanguage;
  createdAt: string;
}

export interface MembershipDto {
  role: WorkspaceRole;
  joinedAt: string;
  workspace: WorkspaceDto;
}

export interface MeDto {
  user: UserDto;
  memberships: MembershipDto[];
}

export interface AuthResultDto extends MeDto {
  csrfToken: string;
}

export interface MemberDto {
  id: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: { id: string; name: string; email: string; emailVerified: boolean };
}

export interface InvitationDto {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  createdAt: string;
  invitedBy: { id: string; name: string } | null;
  status: 'PENDING' | 'EXPIRED';
}

export interface InvitationPreviewDto {
  workspaceName: string;
  invitedByName: string | null;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
}

export interface WorkspaceSummaryDto {
  workspace: WorkspaceDto;
  role: WorkspaceRole;
  counts: {
    members: number;
    pendingInvitations: number;
    instagramAccounts: number;
    automationRules: number;
    products: number;
  };
}

export interface AuditLogDto {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  actor: { id: string; name: string; email: string } | null;
  ip: string | null;
  createdAt: string;
}
