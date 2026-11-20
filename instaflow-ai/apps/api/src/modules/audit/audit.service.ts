import type { Request } from 'express';
import { db, type Prisma } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { paginationMeta } from '../../lib/http.js';
import { toAuditLogDto } from '../../lib/serializers.js';
import type { TenantDb } from '../../lib/tenant-db.js';

export interface AuditEntry {
  action: string;
  workspaceId?: string | null;
  actorId?: string | null;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonObject;
  req?: Request;
}

/**
 * Append-only audit trail of security-relevant actions. Never include secrets
 * in metadata. A failed audit write is logged but does not fail the request.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: entry.action,
        workspaceId: entry.workspaceId ?? null,
        actorId: entry.actorId ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        ...(entry.metadata ? { metadata: entry.metadata } : {}),
        ip: entry.req?.ip?.slice(0, 64) ?? null,
        userAgent: entry.req?.get('user-agent')?.slice(0, 512) ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, action: entry.action }, 'failed to write audit log');
  }
}

export async function listAuditLogs(tdb: TenantDb, page: number, pageSize: number) {
  const [rows, total] = await Promise.all([
    tdb.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: true },
    }),
    tdb.auditLog.count(),
  ]);
  return { items: rows.map(toAuditLogDto), pagination: paginationMeta(page, pageSize, total) };
}
