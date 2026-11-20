import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { CSRF_HEADER, WORKSPACE_HEADER } from '@instaflow/shared';
import { corsOrigins, env } from './config/env.js';
import { logger } from './lib/logger.js';
import { loadSession } from './middleware/auth.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { limiters } from './middleware/rate-limit.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { invitationRouter, memberRouter } from './modules/members/member.routes.js';
import { workspaceRouter } from './modules/workspaces/workspace.routes.js';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      // Always generate our own ID; never trust a client-supplied one.
      genReqId: (_req, res) => {
        const id = randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => Boolean(req.url?.startsWith('/api/health')) },
    }),
  );

  // JSON-only API: lock the CSP down completely.
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || corsOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', CSRF_HEADER, WORKSPACE_HEADER],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 600,
    }),
  );

  // Phase 2: the Meta webhook route mounts here, BEFORE express.json(),
  // because signature verification needs the raw request body.

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api/health', healthRouter);
  app.use('/api', limiters.api);
  app.use(loadSession);
  app.use(csrfProtection);

  app.use('/api/auth', authRouter);
  app.use('/api/workspaces', workspaceRouter);
  app.use('/api/members', memberRouter);
  app.use('/api/invitations', invitationRouter);
  app.use('/api/audit-logs', auditRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
