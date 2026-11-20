import { db } from './db.js';

/**
 * Tenant-scoped Prisma client (defence in depth for workspace isolation).
 *
 * `forWorkspace(id)` returns a client that, for every tenant-owned model:
 *  - adds `workspaceId = id` to the WHERE clause of every read/update/delete;
 *  - stamps `workspaceId = id` on every create/upsert;
 *  - throws if the caller tries to write a DIFFERENT workspaceId, or uses a
 *    relation-style `workspace: { connect }` input that would bypass the stamp.
 *
 * Together with composite (parentId, workspaceId) foreign keys in the schema,
 * this means a forgotten `where` in a service cannot leak or modify another
 * tenant's data. Services handling tenant data must use this client.
 */

export const TENANT_MODELS = new Set<string>([
  'WorkspaceMember',
  'WorkspaceInvitation',
  'InstagramAccount',
  'OAuthToken',
  'InstagramMedia',
  'AutomationRule',
  'AutomationKeyword',
  'AutomationRuleMedia',
  'AutomationFlow',
  'FlowVersion',
  'Conversation',
  'ConversationNote',
  'Message',
  'Product',
  'KnowledgeDocument',
  'AutomationExecution',
  'UsageRecord',
  'AuditLog',
  'WebhookEvent',
]);

const WHERE_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
]);

export class TenantScopeViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantScopeViolation';
  }
}

type Data = Record<string, unknown>;

function stamp(model: string, data: unknown, workspaceId: string): Data {
  const d = { ...(data as Data) };
  if ('workspace' in d) {
    throw new TenantScopeViolation(`${model}: use the scalar workspaceId, not a workspace relation input, in tenant-scoped writes`);
  }
  if (d.workspaceId !== undefined && d.workspaceId !== workspaceId) {
    throw new TenantScopeViolation(`${model}: attempted to write a record into a different workspace`);
  }
  d.workspaceId = workspaceId;
  return d;
}

function guardUpdate(model: string, data: unknown, workspaceId: string): void {
  const d = (data ?? {}) as Data;
  if ('workspace' in d || (d.workspaceId !== undefined && d.workspaceId !== workspaceId)) {
    throw new TenantScopeViolation(`${model}: records cannot be moved between workspaces`);
  }
}

export function forWorkspace(workspaceId: string) {
  if (!workspaceId) throw new TenantScopeViolation('forWorkspace() requires a workspaceId');

  return db.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) return query(args);
          const a = { ...(args as Data) };

          if (WHERE_OPS.has(operation)) {
            a.where = { ...((a.where as Data | undefined) ?? {}), workspaceId };
          }
          if (operation === 'update' || operation === 'updateMany' || operation === 'updateManyAndReturn') {
            guardUpdate(model, a.data, workspaceId);
          }
          if (operation === 'create') {
            a.data = stamp(model, a.data, workspaceId);
          }
          if (operation === 'createMany' || operation === 'createManyAndReturn') {
            const rows = Array.isArray(a.data) ? a.data : [a.data];
            a.data = rows.map((r) => stamp(model, r, workspaceId));
          }
          if (operation === 'upsert') {
            a.where = { ...((a.where as Data | undefined) ?? {}), workspaceId };
            a.create = stamp(model, a.create, workspaceId);
            guardUpdate(model, a.update, workspaceId);
          }
          return query(a as typeof args);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof forWorkspace>;
