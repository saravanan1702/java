import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id (the library default algorithm) with OWASP's recommended minimum
 * parameters: m=19 MiB, t=2, p=1.
 */
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Burn equivalent CPU when the user does not exist, so response timing does
 * not reveal which emails are registered.
 */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword('instaflow-timing-equaliser');
  await verifyPassword(await dummyHash, password);
}
