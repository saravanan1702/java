import { createApp } from './app.js';
import { env } from './config/env.js';
import { db } from './lib/db.js';
import { logger } from './lib/logger.js';
import { closeRedis } from './lib/redis.js';
import { closeQueues } from './queues/queues.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV, queueMode: env.QUEUE_MODE }, 'InstaFlow API listening');
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down API');
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(async () => {
    await Promise.allSettled([db.$disconnect(), closeRedis(), closeQueues()]);
    logger.info('API stopped cleanly');
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandled promise rejection'));
