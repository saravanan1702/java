import { execSync } from 'node:child_process';

/** Apply migrations to the dedicated test database once per run. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://instaflow:instaflow_dev@localhost:5432/instaflow_test';
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });
}
