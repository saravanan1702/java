import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let client: Redis | null | undefined;

/** Shared Redis client for rate limiting and health checks. Null when REDIS_URL is unset. */
export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  if (!env.REDIS_URL) {
    client = null;
    return client;
  }
  client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, enableOfflineQueue: true, lazyConnect: false });
  client.on('error', (err) => logger.warn({ err: err.message }, 'redis connection error'));
  return client;
}

/** BullMQ requires maxRetriesPerRequest = null on its connections. */
export function createQueueConnection(): Redis {
  if (!env.REDIS_URL) throw new Error('REDIS_URL is required when QUEUE_MODE=queue');
  const conn = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  conn.on('error', (err) => logger.warn({ err: err.message }, 'queue redis connection error'));
  return conn;
}

export async function closeRedis(): Promise<void> {
  if (client) await client.quit().catch(() => undefined);
  client = undefined;
}
