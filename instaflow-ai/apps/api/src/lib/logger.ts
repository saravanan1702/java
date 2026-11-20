import { pino } from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  base: { service: 'instaflow-api' },
  redact: {
    // Never log credentials, cookies or token material.
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-csrf-token"]',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.accessToken',
      '*.accessTokenEnc',
    ],
    censor: '[redacted]',
  },
  ...(env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true } } }
    : {}),
});
