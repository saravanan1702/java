import { Router } from 'express';
import { env } from '../../config/env.js';
import { db } from '../../lib/db.js';
import { getRedis } from '../../lib/redis.js';

export const healthRouter = Router();

/** Liveness: the process is up. */
healthRouter.get('/', (_req, res) => {
  res.json({ data: { status: 'ok', uptimeSeconds: Math.round(process.uptime()) } });
});

/** Readiness: dependencies are reachable. Used by load balancers / orchestrators. */
healthRouter.get('/ready', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error' | 'not_configured'> = {};
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }
  const redis = getRedis();
  if (!redis) {
    checks.redis = 'not_configured';
  } else {
    try {
      checks.redis = (await redis.ping()) === 'PONG' ? 'ok' : 'error';
    } catch {
      checks.redis = 'error';
    }
  }
  const healthy = Object.values(checks).every((c) => c !== 'error');
  res.status(healthy ? 200 : 503).json({ data: { status: healthy ? 'ok' : 'degraded', checks, queueMode: env.QUEUE_MODE } });
});
