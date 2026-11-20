import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** Cryptographically random opaque token, base64url (32 bytes → 43 chars). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Tokens are stored only as SHA-256 hashes, so a DB leak does not leak live tokens. */
export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function hmac(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value, 'utf8').digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * AES-256-GCM envelope for OAuth access tokens with key versioning.
 *
 * Format: "<version>.<iv>.<authTag>.<ciphertext>" (base64url parts).
 * Rotation: add a new key version, set it active, re-encrypt lazily on refresh.
 * Old versions remain decryptable as long as their key stays configured.
 */
export class TokenCipher {
  private readonly keys = new Map<number, Buffer>();

  constructor(
    keySpec: string,
    private readonly activeVersion: number,
  ) {
    for (const entry of keySpec.split(',').map((s) => s.trim()).filter(Boolean)) {
      const sep = entry.indexOf(':');
      if (sep < 1) throw new Error('TOKEN_ENCRYPTION_KEYS entries must look like "<version>:<base64key>"');
      const version = Number(entry.slice(0, sep));
      const key = Buffer.from(entry.slice(sep + 1), 'base64');
      if (!Number.isInteger(version) || version < 1) throw new Error('Encryption key version must be a positive integer');
      if (key.length !== 32) throw new Error(`Encryption key v${version} must decode to exactly 32 bytes`);
      this.keys.set(version, key);
    }
    if (!this.keys.has(activeVersion)) {
      throw new Error(`Active encryption key version ${activeVersion} is not configured`);
    }
  }

  encrypt(plaintext: string): { ciphertext: string; keyVersion: number } {
    const key = this.keys.get(this.activeVersion)!;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const ciphertext = [String(this.activeVersion), iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.');
    return { ciphertext, keyVersion: this.activeVersion };
  }

  decrypt(envelope: string): string {
    const parts = envelope.split('.');
    if (parts.length !== 4) throw new Error('Malformed encrypted token');
    const [versionStr, ivStr, tagStr, dataStr] = parts as [string, string, string, string];
    const key = this.keys.get(Number(versionStr));
    if (!key) throw new Error(`No key configured for encrypted token version ${versionStr}`);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivStr, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagStr, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(dataStr, 'base64url')), decipher.final()]).toString('utf8');
  }

  needsRotation(envelope: string): boolean {
    return Number(envelope.split('.')[0]) !== this.activeVersion;
  }
}
