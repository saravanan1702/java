/**
 * Local seed. Creates a Super Admin ONLY if SEED_SUPER_ADMIN_EMAIL and
 * SEED_SUPER_ADMIN_PASSWORD are set. No fake business data is seeded.
 */
import { db } from '../src/lib/db.js';
import { hashPassword } from '../src/lib/password.js';

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('Seed: SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD not set — nothing to do.');
    return;
  }
  if (password.length < 12) throw new Error('SEED_SUPER_ADMIN_PASSWORD must be at least 12 characters');

  await db.user.upsert({
    where: { email },
    create: { email, name: 'Platform Admin', passwordHash: await hashPassword(password), platformRole: 'SUPER_ADMIN', emailVerifiedAt: new Date() },
    update: { platformRole: 'SUPER_ADMIN' },
  });
  console.log(`Seed: super admin ensured for ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
