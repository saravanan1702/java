import { z } from 'zod';
import { WORKSPACE_LANGUAGES } from '../constants.js';

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(2, 'Workspace name must be at least 2 characters')
  .max(60, 'Workspace name must be at most 60 characters');

/** IANA timezone, validated against the runtime's Intl database. */
export const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Unknown timezone');

export const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
  timezone: timezoneSchema.default('Asia/Kolkata'),
  defaultLanguage: z.enum(WORKSPACE_LANGUAGES).default('EN'),
});
export type CreateWorkspaceInput = z.input<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z
  .object({
    name: workspaceNameSchema,
    timezone: timezoneSchema,
    defaultLanguage: z.enum(WORKSPACE_LANGUAGES),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const deleteWorkspaceSchema = z.object({
  confirmName: z.string().trim().min(1, 'Type the workspace name to confirm'),
});
export type DeleteWorkspaceInput = z.infer<typeof deleteWorkspaceSchema>;

export const uuidSchema = z.uuid('Invalid id');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
