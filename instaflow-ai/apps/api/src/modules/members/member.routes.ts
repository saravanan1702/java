import { Router } from 'express';
import {
  acceptInvitationSchema,
  invitationLookupQuerySchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  uuidSchema,
} from '@instaflow/shared';
import { noContent, ok, parse } from '../../lib/http.js';
import { authOf, requireAuth, requireVerifiedEmail } from '../../middleware/auth.js';
import { limiters } from '../../middleware/rate-limit.js';
import { requirePermission, requireWorkspace, workspaceOf } from '../../middleware/workspace.js';
import * as invitations from './invitation.service.js';
import * as members from './member.service.js';

// ---------------------------------------------------------------- members
export const memberRouter = Router();
memberRouter.use(requireAuth, requireWorkspace);

memberRouter.get('/', requirePermission('members:read'), async (req, res) => {
  ok(res, await members.listMembers(workspaceOf(req)));
});

memberRouter.patch('/:memberId', requirePermission('members:manage'), async (req, res) => {
  const memberId = parse(uuidSchema, req.params.memberId);
  const { role } = parse(updateMemberRoleSchema, req.body);
  ok(res, await members.updateMemberRole(workspaceOf(req), authOf(req).user, memberId, role, req));
});

memberRouter.delete('/:memberId', requirePermission('members:manage'), async (req, res) => {
  const memberId = parse(uuidSchema, req.params.memberId);
  await members.removeMember(workspaceOf(req), authOf(req).user, memberId, req);
  noContent(res);
});

// ------------------------------------------------------------ invitations
export const invitationRouter = Router();

// Public, token-authenticated: lets the accept page show who invited you.
invitationRouter.get('/lookup', limiters.invitationLookup, async (req, res) => {
  const { token } = parse(invitationLookupQuerySchema, req.query);
  ok(res, await invitations.previewInvitation(token));
});

// Signed-in but not yet a member: no workspace header required.
invitationRouter.post('/accept', requireAuth, limiters.invitationAccept, async (req, res) => {
  const { token } = parse(acceptInvitationSchema, req.body);
  ok(res, await invitations.acceptInvitation(authOf(req).user, token, req));
});

invitationRouter.use(requireAuth, requireWorkspace, requirePermission('members:invite'));

invitationRouter.get('/', async (req, res) => {
  ok(res, await invitations.listInvitations(workspaceOf(req)));
});

invitationRouter.post('/', requireVerifiedEmail, async (req, res) => {
  const input = parse(inviteMemberSchema, req.body);
  ok(res, await invitations.createInvitation(workspaceOf(req), authOf(req).user, input, req), 201);
});

invitationRouter.post('/:invitationId/resend', requireVerifiedEmail, async (req, res) => {
  const id = parse(uuidSchema, req.params.invitationId);
  ok(res, await invitations.resendInvitation(workspaceOf(req), authOf(req).user, id, req));
});

invitationRouter.delete('/:invitationId', async (req, res) => {
  const id = parse(uuidSchema, req.params.invitationId);
  await invitations.revokeInvitation(workspaceOf(req), authOf(req).user, id, req);
  noContent(res);
});
