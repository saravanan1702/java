import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Root .env is shared by api, worker and web. A local apps/api/.env wins if present.
loadEnv({ path: [path.resolve('.env'), path.resolve('../../.env')], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx --conditions=development prisma/seed.ts',
  },
  datasource: {
    // `prisma generate` does not need a live database, so a placeholder is fine at build time.
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
