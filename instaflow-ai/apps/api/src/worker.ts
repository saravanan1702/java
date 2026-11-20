/**
 * Background worker process. Runs independently of the API and of any browser
 * tab, so automation keeps working 24/7. Phase 1 processes the `email` queue;
 * later phases register Instagram webhook, private reply, DM and AI processors.
 */
import { createServer } from 'node:http';
import { Worker } from 'bullmq';
import { env } from './config/env.js';
import { db } from './lib/db.js';
import { logger } from './lib/logger.js';
import { closeRedis, createQueueConnection, getRedis } from './lib/redis.js';
import { processors, type ImplementedQueue } from './queues/processors.js';
import { closeQueues, moveToDeadLetter } from './queues/queues.js';

if (env.QUEUE_MODE !== 'queue') {
  logger.error('The worker needs Redis: set REDIS_URL (and QUEUE_MODE=queue).');
  process.exit(1);
}

const workers = (Object.keys(processors) as ImplementedQueue[]).map((name) => {
  const worker = new Worker(name, async (job) => processors[name](job.data), {
    connection: createQueueConnection(),
    concurrency: 5,
  });
  worker.on('failed', (job, err) => {
    logger.warn({ queue: name, jobId: job?.id, attempt: job?.attemptsMade, err: err.message }, 'job failed');
    // Final failure → copy to the dead-letter queue for inspection / manual retry.
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      void moveToDeadLetter({ queue: name, jobId: job.id, name: job.name, data: job.data, failedReason: err.message, attemptsMade: job.attemptsMade })
        .catch((e) => logger.error({ err: e }, 'failed to move job to dead-letter queue'));
    }
  });
  worker.on('error', (err) => logger.error({ queue: name, err: err.message }, 'worker error'));
  logger.info({ queue: name }, 'worker started');
  return { name, worker };
});

// Health endpoint for the hosting platform's liveness/readiness probes.
const health = createServer(async (req, res) => {
  if (req.url !== '/health') {
    res.writeHead(404).end();
    return;
  }
  let redis = 'error';
  try {
    redis = (await getRedis()?.ping()) === 'PONG' ? 'ok' : 'error';
  } catch {
    /* reported below */
  }
  const status = workers.every((w) => w.worker.isRunning()) && redis === 'ok' ? 'ok' : 'degraded';
  res.writeHead(status === 'ok' ? 200 : 503, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ status, redis, workers: workers.map((w) => ({ queue: w.name, running: w.worker.isRunning() })) }));
});
health.listen(env.WORKER_HEALTH_PORT, () => logger.info({ port: env.WORKER_HEALTH_PORT }, 'worker health endpoint listening'));

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down worker (finishing active jobs)');
  const force = setTimeout(() => process.exit(1), 30_000);
  force.unref();
  health.close();
  // worker.close() waits for in-flight jobs to finish before resolving.
  await Promise.allSettled(workers.map((w) => w.worker.close()));
  await Promise.allSettled([closeQueues(), db.$disconnect(), closeRedis()]);
  logger.info('worker stopped cleanly');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
