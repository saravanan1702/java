import { useQueryClient } from '@tanstack/react-query';
import { hasPermission, type MembershipDto, type Permission } from '@instaflow/shared';
import * as React from 'react';
import { api, setActiveWorkspace } from '@/lib/api';
import { ME_KEY } from '../auth/session';

const STORAGE_KEY = 'instaflow.workspace';

interface WorkspaceContextValue {
  membership: MembershipDto;
  memberships: MembershipDto[];
  /** UI hint only — the API enforces every permission server-side. */
  can: (permission: Permission) => boolean;
  switchWorkspace: (workspaceId: string) => void;
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null);

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function pickInitial(memberships: MembershipDto[], lastWorkspaceId: string | null): string {
  const ids = new Set(memberships.map((m) => m.workspace.id));
  const stored = readStored();
  if (stored && ids.has(stored)) return stored;
  if (lastWorkspaceId && ids.has(lastWorkspaceId)) return lastWorkspaceId;
  return memberships[0]!.workspace.id;
}

export function WorkspaceProvider({ memberships, lastWorkspaceId, children }: { memberships: MembershipDto[]; lastWorkspaceId: string | null; children: React.ReactNode }) {
  const qc = useQueryClient();
  const [currentId, setCurrentId] = React.useState(() => pickInitial(memberships, lastWorkspaceId));

  // If the active workspace disappears (removed / deleted), fall back gracefully.
  const membership = memberships.find((m) => m.workspace.id === currentId) ?? memberships[0]!;

  // Set synchronously so the very first child query carries the right header.
  setActiveWorkspace(membership.workspace.id);

  const switchWorkspace = React.useCallback(
    (workspaceId: string) => {
      setCurrentId(workspaceId);
      setActiveWorkspace(workspaceId);
      try {
        localStorage.setItem(STORAGE_KEY, workspaceId);
      } catch {
        /* non-essential */
      }
      // Remember server-side too, so other devices open the same workspace.
      void api.post(`/api/workspaces/${workspaceId}/select`, {}, { workspace: false }).then(() => qc.invalidateQueries({ queryKey: ME_KEY }));
    },
    [qc],
  );

  const value = React.useMemo<WorkspaceContextValue>(
    () => ({ membership, memberships, can: (p) => hasPermission(membership.role, p), switchWorkspace }),
    [membership, memberships, switchWorkspace],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}

/** Query keys are namespaced by workspace so switching never shows stale tenant data. */
export function wsKey(workspaceId: string, ...parts: unknown[]) {
  return ['ws', workspaceId, ...parts] as const;
}

/** Render children only when the current role has the permission. */
export function Can({ permission, children, fallback = null }: { permission: Permission; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { can } = useWorkspace();
  return <>{can(permission) ? children : fallback}</>;
}
