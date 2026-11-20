import { z } from 'zod';

const bool = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === 'true' || v === '1'));

const isProd = process.env.NODE_ENV === 'production';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    /** Public URL of the web app — used to build links in emails. */
    APP_URL: z.url().default('http://localhost:5173'),
    /** Comma-separated list of allowed browser origins (CORS with credentials). */
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    /** Number of reverse-proxy hops to trust for client IPs (0 = none). */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().optional(),

    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    COOKIE_SECURE: bool(isProd),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_DOMAIN: z.string().optional(),
    CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),

    /** "<version>:<base64 32-byte key>" pairs, comma-separated. Enables key rotation. */
    TOKEN_ENCRYPTION_KEYS: z.string().min(1, 'TOKEN_ENCRYPTION_KEYS is required'),
    TOKEN_ENCRYPTION_ACTIVE_VERSION: z.coerce.number().int().min(1).default(1),

    MAIL_TRANSPORT: z.enum(['smtp', 'log', 'file', 'memory']).default('log'),
    MAIL_FROM: z.string().default('InstaFlow AI <no-reply@instaflow.local>'),
    MAIL_OUTBOX_DIR: z.string().default('.mail-outbox'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().optional(),
    SMTP_SECURE: bool(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),

    /** "queue" uses BullMQ + Redis; "inline" runs jobs in-process (tests / no-Redis dev). */
    QUEUE_MODE: z.enum(['queue', 'inline']).optional(),
    WORKER_HEALTH_PORT: z.coerce.number().int().default(4001),
    RATE_LIMIT_ENABLED: bool(true),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV !== 'production') return;
    const fail = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (!v.COOKIE_SECURE) fail('COOKIE_SECURE', 'must be true in production');
    if (!v.REDIS_URL) fail('REDIS_URL', 'is required in production (queues + rate limiting)');
    if (v.MAIL_TRANSPORT !== 'smtp') fail('MAIL_TRANSPORT', 'must be "smtp" in production');
    if (/change-me|placeholder/i.test(v.CSRF_SECRET)) fail('CSRF_SECRET', 'still has a placeholder value');
    if (/change-me|placeholder/i.test(v.TOKEN_ENCRYPTION_KEYS)) fail('TOKEN_ENCRYPTION_KEYS', 'still has a placeholder value');
    if (v.COOKIE_SAMESITE === 'none' && !v.COOKIE_SECURE) fail('COOKIE_SAMESITE', '"none" requires COOKIE_SECURE=true');
  });

export type Env = z.infer<typeof schema> & { QUEUE_MODE: 'queue' | 'inline' };

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    // Fail fast with a readable message; never print values (they may be secrets).
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const v = parsed.data;
  return { ...v, QUEUE_MODE: v.QUEUE_MODE ?? (v.REDIS_URL ? 'queue' : 'inline') };
}

export const env = load();

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
