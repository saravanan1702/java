import { z } from 'zod';
import { WORKSPACE_ROLES } from '../roles.js';
import { emailSchema, opaqueTokenSchema } from './auth.js';

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(WORKSPACE_ROLES),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(WORKSPACE_ROLES),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const acceptInvitationSchema = z.object({ token: opaqueTokenSchema });
export const invitationLookupQuerySchema = z.object({ token: opaqueTokenSchema });
