import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://instaflow:instaflow_dev@localhost:5432/instaflow_test';

export default defineConfig({
  resolve: { conditions: ['development'] },
  ssr: { resolve: { conditions: ['development'] } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    // Integration tests share one database; run files sequentially for determinism.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      APP_URL: 'http://localhost:5173',
      CORS_ORIGINS: 'http://localhost:5173',
      CSRF_SECRET: 'test-csrf-secret-test-csrf-secret-0123456789',
      // Two key versions so rotation can be tested. Test-only keys.
      TOKEN_ENCRYPTION_KEYS: '1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=,2:AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
      TOKEN_ENCRYPTION_ACTIVE_VERSION: '2',
      MAIL_TRANSPORT: 'memory',
      QUEUE_MODE: 'inline',
      RATE_LIMIT_ENABLED: 'false',
      COOKIE_SECURE: 'false',
      REDIS_URL: '',
    },
  },
});
