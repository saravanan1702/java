import { afterAll, beforeEach } from 'vitest';
import { db } from '../src/lib/db.js';
import { memoryOutbox } from '../src/modules/mail/mailer.js';

beforeEach(async () => {
  // Fresh database state for every test.
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  }
  memoryOutbox.length = 0;
});

afterAll(async () => {
  await db.$disconnect();
});
