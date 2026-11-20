import { Router } from 'express';
import { paginationQuerySchema } from '@instaflow/shared';
import { ok, parse } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission, requireWorkspace, workspaceOf } from '../../middleware/workspace.js';
import { listAuditLogs } from './audit.service.js';

export const auditRouter = Router();
auditRouter.use(requireAuth, requireWorkspace, requirePermission('audit:read'));

auditRouter.get('/', async (req, res) => {
  const { page, pageSize } = parse(paginationQuerySchema, req.query);
  const { items, pagination } = await listAuditLogs(workspaceOf(req).db, page, pageSize);
  ok(res, items, 200, { pagination });
});
