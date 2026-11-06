import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Password hashing with Node's built-in scrypt (memory-hard KDF).
 * Parameters follow OWASP's recommendation: N=2^17, r=8, p=1.
 *
 * Stored format:  scrypt$<log2N>$<r>$<p>$<saltB64>$<hashB64>
 * Parameters are stored with each hash so they can be raised later
 * without invalidating existing passwords.
 */
const LOG2_N = 17;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

function options(log2N: number, r: number, p: number): ScryptOptions {
  const N = 2 ** log2N;
  // scrypt needs ~128 * N * r bytes; allow headroom above Node's 32 MiB default.
  return { N, r, p, maxmem: 2 * 128 * N * r };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, options(LOG2_N, R, P));
  return ['scrypt', LOG2_N, R, P, salt.toString('base64'), hash.toString('base64')].join('$');
}

/** Constant-time comparison. Returns false for empty or malformed hashes. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [log2N, r, p] = parts.slice(1, 4).map(Number);
  if (![log2N, r, p].every(Number.isInteger) || log2N < 14 || log2N > 20) return false;

  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  if (salt.length === 0 || expected.length === 0) return false;

  const actual = await scryptAsync(password, salt, expected.length, options(log2N, r, p));
  return timingSafeEqual(actual, expected);
}

/**
 * Hash of a random throwaway password. Verifying against it when a login
 * email doesn't exist makes "unknown email" and "wrong password" take the
 * same time, so response timing doesn't reveal which emails are registered.
 */
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  return dummyHash;
}
