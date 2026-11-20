import { randomBytes } from 'node:crypto';

export function slugify(input: string): string {
  const base = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'workspace';
}

/** Slug with a short random suffix so two "My Store" workspaces never collide. */
export function uniqueSlug(input: string): string {
  const suffix = randomBytes(4).readUInt32BE(0).toString(36).padStart(6, '0').slice(0, 6);
  return `${slugify(input)}-${suffix}`;
}
