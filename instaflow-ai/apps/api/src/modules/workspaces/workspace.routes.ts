import { Router } from 'express';
import { createWorkspaceSchema, deleteWorkspaceSchema, updateWorkspaceSchema, uuidSchema } from '@instaflow/shared';
import { noContent, ok, parse } from '../../lib/http.js';
import { authOf, requireAuth } from '../../middleware/auth.js';
import { requirePermission, requireWorkspace, workspaceOf } from '../../middleware/workspace.js';
import { leaveWorkspace } from '../members/member.service.js';
import * as workspaces from './workspace.service.js';

export const workspaceRouter = Router();
workspaceRouter.use(requireAuth);

workspaceRouter.get('/', async (req, res) => {
  ok(res, await workspaces.listMemberships(authOf(req).user.id));
});

workspaceRouter.post('/', async (req, res) => {
  const input = parse(createWorkspaceSchema, req.body);
  ok(res, await workspaces.createWorkspace(authOf(req).user, input, req), 201);
});

workspaceRouter.post('/:workspaceId/select', async (req, res) => {
  const workspaceId = parse(uuidSchema, req.params.workspaceId);
  await workspaces.selectWorkspace(authOf(req).user.id, workspaceId);
  noContent(res);
});

// ---- Routes acting on the active workspace (X-Workspace-Id) ----

workspaceRouter.get('/current', requireWorkspace, async (req, res) => {
  ok(res, await workspaces.getSummary(workspaceOf(req)));
});

workspaceRouter.patch('/current', requireWorkspace, requirePermission('workspace:update'), async (req, res) => {
  const input = parse(updateWorkspaceSchema, req.body);
  ok(res, await workspaces.updateWorkspace(workspaceOf(req), authOf(req).user, input, req));
});

workspaceRouter.delete('/current', requireWorkspace, requirePermission('workspace:delete'), async (req, res) => {
  const { confirmName } = parse(deleteWorkspaceSchema, req.body);
  await workspaces.deleteWorkspace(workspaceOf(req), authOf(req).user, confirmName, req);
  noContent(res);
});

workspaceRouter.post('/current/leave', requireWorkspace, async (req, res) => {
  await leaveWorkspace(workspaceOf(req), authOf(req).user, req);
  noContent(res);
});
