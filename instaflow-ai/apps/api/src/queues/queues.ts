import { Queue, type JobsOptions } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { createQueueConnection } from '../lib/redis.js';
import { QUEUES, type QueueName } from './names.js';
import { processors, type ImplementedQueue, type JobPayloads } from './processors.js';

/** Retries with exponential backoff (10s, 20s, 40s, 80s, 160s); failures are kept for inspection. */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 14 * 24 * 3600 },
};

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: createQueueConnection(), defaultJobOptions: DEFAULT_JOB_OPTIONS });
    queues.set(name, q);
  }
  return q;
}

/**
 * Enqueue a job. In QUEUE_MODE=inline (tests / Redis-less dev) the processor
 * runs in-process; failures are logged, never thrown to the HTTP caller.
 * `jobId` makes enqueueing idempotent: BullMQ ignores a duplicate jobId.
 */
export async function dispatch<Q extends ImplementedQueue>(
  name: Q,
  data: JobPayloads[Q],
  opts: { jobId?: string; delay?: number } = {},
): Promise<void> {
  if (env.QUEUE_MODE === 'inline') {
    try {
      await processors[name](data);
    } catch (err) {
      logger.error({ err, queue: name }, 'inline job failed');
    }
    return;
  }
  await getQueue(name).add(name, data, opts);
}

export async function moveToDeadLetter(entry: {
  queue: string;
  jobId: string | undefined;
  name: string;
  data: unknown;
  failedReason: string;
  attemptsMade: number;
}): Promise<void> {
  await getQueue(QUEUES.deadLetter).add('dead-letter', { ...entry, failedAt: new Date().toISOString() }, {
    attempts: 1,
    removeOnComplete: false,
    removeOnFail: false,
  });
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close().catch(() => undefined)));
  queues.clear();
}
