import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password.js';
import { slugify, uniqueSlug } from '../../src/lib/slug.js';

describe('password hashing (argon2id)', () => {
  it('hashes with argon2id and verifies', async () => {
    const h = await hashPassword('correct-horse-battery');
    expect(h.startsWith('$argon2id$')).toBe(true);
    expect(h).not.toContain('correct-horse');
    expect(await verifyPassword(h, 'correct-horse-battery')).toBe(true);
    expect(await verifyPassword(h, 'wrong-password')).toBe(false);
  });

  it('returns false (not throw) on a malformed hash', async () => {
    expect(await verifyPassword('not-a-hash', 'x')).toBe(false);
  });
});

describe('slugify', () => {
  it('produces url-safe slugs', () => {
    expect(slugify('  Priya’s Saree Store!! ')).toBe('priya-s-saree-store');
    expect(slugify('Café Déjà')).toBe('cafe-deja');
    expect(slugify('தமிழ்')).toBe('workspace');
  });

  it('adds a random suffix', () => {
    const a = uniqueSlug('My Store');
    expect(a).toMatch(/^my-store-[a-z0-9]{6}$/);
    expect(uniqueSlug('My Store')).not.toBe(a);
  });
});
