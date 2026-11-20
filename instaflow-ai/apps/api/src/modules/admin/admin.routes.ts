import { Router } from 'express';
import { db } from '../../lib/db.js';
import { ok } from '../../lib/http.js';
import { authOf, requireSuperAdmin } from '../../middleware/auth.js';
import { recordAudit } from '../audit/audit.service.js';

/**
 * Platform administration (Super Admin only). Returns aggregate figures —
 * never tenant content. Tenant-level support tooling (with explicit,
 * audited, time-boxed access grants) is planned for Phase 6.
 */
export const adminRouter = Router();
adminRouter.use(requireSuperAdmin);

adminRouter.get('/overview', async (req, res) => {
  const [users, verifiedUsers, workspaces, activeSessions] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({ where: { deletedAt: null, emailVerifiedAt: { not: null } } }),
    db.workspace.count({ where: { deletedAt: null } }),
    db.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  await recordAudit({ action: 'admin.overview_viewed', actorId: authOf(req).user.id, req });
  ok(res, { users, verifiedUsers, workspaces, activeSessions });
});
