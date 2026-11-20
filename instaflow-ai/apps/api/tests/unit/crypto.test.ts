import { describe, expect, it } from 'vitest';
import { TokenCipher, generateToken, hmac, safeEqual, sha256 } from '../../src/lib/crypto.js';

const K1 = Buffer.alloc(32, 1).toString('base64');
const K2 = Buffer.alloc(32, 2).toString('base64');

describe('TokenCipher (AES-256-GCM)', () => {
  it('round-trips and never stores plaintext', () => {
    const c = new TokenCipher(`1:${K1}`, 1);
    const { ciphertext, keyVersion } = c.encrypt('IGQVJ-secret-token');
    expect(keyVersion).toBe(1);
    expect(ciphertext).not.toContain('IGQVJ');
    expect(c.decrypt(ciphertext)).toBe('IGQVJ-secret-token');
  });

  it('uses a fresh IV so equal plaintexts encrypt differently', () => {
    const c = new TokenCipher(`1:${K1}`, 1);
    expect(c.encrypt('same').ciphertext).not.toBe(c.encrypt('same').ciphertext);
  });

  it('detects tampering via the auth tag', () => {
    const c = new TokenCipher(`1:${K1}`, 1);
    const parts = c.encrypt('secret').ciphertext.split('.');
    const data = Buffer.from(parts[3]!, 'base64url');
    data[0] = data[0]! ^ 0xff;
    parts[3] = data.toString('base64url');
    expect(() => c.decrypt(parts.join('.'))).toThrow();
  });

  it('supports key rotation: old ciphertext stays readable, new uses the active key', () => {
    const old = new TokenCipher(`1:${K1}`, 1).encrypt('legacy').ciphertext;
    const rotated = new TokenCipher(`1:${K1},2:${K2}`, 2);
    expect(rotated.decrypt(old)).toBe('legacy');
    expect(rotated.needsRotation(old)).toBe(true);
    const fresh = rotated.encrypt('new');
    expect(fresh.keyVersion).toBe(2);
    expect(rotated.needsRotation(fresh.ciphertext)).toBe(false);
  });

  it('rejects bad key configuration', () => {
    expect(() => new TokenCipher('1:short', 1)).toThrow(/32 bytes/);
    expect(() => new TokenCipher(`1:${K1}`, 2)).toThrow(/not configured/);
    expect(() => new TokenCipher('nonsense', 1)).toThrow();
  });

  it('refuses to decrypt with a missing key version', () => {
    const v2 = new TokenCipher(`2:${K2}`, 2).encrypt('x').ciphertext;
    expect(() => new TokenCipher(`1:${K1}`, 1).decrypt(v2)).toThrow(/version 2/);
  });
});

describe('token helpers', () => {
  it('generates url-safe random tokens', () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(t);
  });

  it('hashes deterministically and compares safely', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).toHaveLength(64);
    expect(hmac('k', 'v')).toBe(hmac('k', 'v'));
    expect(hmac('k', 'v')).not.toBe(hmac('k2', 'v'));
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
