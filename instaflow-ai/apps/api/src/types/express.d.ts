import type { WorkspaceRole } from '@instaflow/shared';
import type { Session, User, Workspace } from '../generated/prisma/client.js';
import type { TenantDb } from '../lib/tenant-db.js';

export interface AuthContext {
  user: User;
  session: Session;
}

export interface WorkspaceContext {
  workspace: Workspace;
  role: WorkspaceRole;
  memberId: string;
  /** Tenant-scoped database client — use this for all tenant data access. */
  db: TenantDb;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
      workspaceCtx?: WorkspaceContext;
    }
  }
}

export {};
