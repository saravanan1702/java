/**
 * Role-based access control — single source of truth.
 *
 * The backend ENFORCES these rules (middleware + services). The frontend only
 * uses them to hide controls a user cannot use; it is never trusted.
 *
 * Super Admin is a *platform* role stored on the user, not a workspace role.
 * It grants access to the platform admin API only — it does NOT grant implicit
 * membership in, or access to, any tenant workspace.
 */

export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'AGENT'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const PLATFORM_ROLES = ['USER', 'SUPER_ADMIN'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

const ALL: readonly WorkspaceRole[] = ['OWNER', 'ADMIN', 'AGENT'];
const MANAGERS: readonly WorkspaceRole[] = ['OWNER', 'ADMIN'];
const OWNER_ONLY: readonly WorkspaceRole[] = ['OWNER'];

export const PERMISSIONS = {
  'workspace:read': ALL,
  'workspace:update': MANAGERS,
  'workspace:delete': OWNER_ONLY,
  'members:read': ALL,
  'members:invite': MANAGERS,
  'members:manage': MANAGERS,
  'audit:read': MANAGERS,
  'billing:manage': OWNER_ONLY,
  'instagram:read': ALL,
  'instagram:manage': MANAGERS,
  'automations:read': ALL,
  'automations:write': MANAGERS,
  'flows:read': ALL,
  'flows:write': MANAGERS,
  'products:read': ALL,
  'products:write': MANAGERS,
  'inbox:read': ALL,
  'inbox:reply': ALL,
  'analytics:read': ALL,
} as const satisfies Record<string, readonly WorkspaceRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: WorkspaceRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly WorkspaceRole[]).includes(role);
}

/** Roles an actor may grant when inviting someone. */
export function assignableRoles(actorRole: WorkspaceRole): WorkspaceRole[] {
  switch (actorRole) {
    case 'OWNER':
      return ['OWNER', 'ADMIN', 'AGENT'];
    case 'ADMIN':
      return ['ADMIN', 'AGENT'];
    default:
      return [];
  }
}

export interface MemberChangeCheck {
  actorRole: WorkspaceRole;
  actorIsTarget: boolean;
  targetRole: WorkspaceRole;
  /** undefined when removing the member rather than changing the role */
  newRole?: WorkspaceRole;
  /** number of OWNERs currently in the workspace */
  ownerCount: number;
}

export type MemberChangeResult = { ok: true } | { ok: false; reason: string };

/**
 * Decide whether an actor may change another member's role or remove them.
 * Rules:
 *  - Nobody changes their own role here (leaving uses a separate path).
 *  - ADMINs may only manage AGENTs, and may only assign ADMIN/AGENT.
 *  - OWNERs may manage anyone, but the workspace must always keep ≥1 OWNER.
 */
export function checkMemberChange(c: MemberChangeCheck): MemberChangeResult {
  if (c.actorIsTarget) {
    return { ok: false, reason: 'You cannot change your own role or remove yourself. Use "Leave workspace" instead.' };
  }
  if (!hasPermission(c.actorRole, 'members:manage')) {
    return { ok: false, reason: 'Your role does not allow managing members.' };
  }
  if (c.actorRole === 'ADMIN') {
    if (c.targetRole !== 'AGENT') {
      return { ok: false, reason: 'Admins can only manage members with the Agent role.' };
    }
    if (c.newRole && !assignableRoles('ADMIN').includes(c.newRole)) {
      return { ok: false, reason: 'Admins cannot grant the Owner role.' };
    }
  }
  const removesOwner = c.targetRole === 'OWNER' && (c.newRole === undefined || c.newRole !== 'OWNER');
  if (removesOwner && c.ownerCount <= 1) {
    return { ok: false, reason: 'A workspace must always have at least one owner.' };
  }
  return { ok: true };
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  AGENT: 'Agent',
};
