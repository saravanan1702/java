import type { NextFunction, Request, Response } from 'express';
import { WORKSPACE_HEADER, hasPermission, type Permission } from '@instaflow/shared';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { AppError, forbidden, unauthenticated } from '../lib/errors.js';
import { forWorkspace } from '../lib/tenant-db.js';

const uuid = z.uuid();

/**
 * Resolve the active workspace from the X-Workspace-Id header and verify the
 * signed-in user is a member of it (and that it is not deleted).
 *
 * Non-members get 404 — not 403 — so workspace IDs cannot be probed.
 * Super Admins get NO bypass here: platform admin access is a separate API.
 */
export async function requireWorkspace(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.auth) return next(unauthenticated());

  const raw = req.get(WORKSPACE_HEADER);
  if (!raw) return next(new AppError(400, 'WORKSPACE_REQUIRED', 'Select a workspace first.'));
  if (!uuid.safeParse(raw).success) return next(new AppError(404, 'NOT_FOUND', 'Workspace not found.'));

  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: raw, userId: req.auth.user.id } },
    include: { workspace: true },
  });
  if (!membership || membership.workspace.deletedAt) {
    return next(new AppError(404, 'NOT_FOUND', 'Workspace not found.'));
  }

  req.workspaceCtx = {
    workspace: membership.workspace,
    role: membership.role,
    memberId: membership.id,
    db: forWorkspace(membership.workspaceId),
  };
  next();
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const ctx = req.workspaceCtx;
    if (!ctx) return next(new AppError(400, 'WORKSPACE_REQUIRED', 'Select a workspace first.'));
    if (!hasPermission(ctx.role, permission)) return next(forbidden());
    next();
  };
}

/** Typed accessor for handlers mounted behind requireWorkspace. */
export function workspaceOf(req: Request) {
  if (!req.workspaceCtx) throw new AppError(400, 'WORKSPACE_REQUIRED', 'Select a workspace first.');
  return req.workspaceCtx;
}
