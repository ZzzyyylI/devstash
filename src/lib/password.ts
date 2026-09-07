import bcrypt from "bcryptjs";

/**
 * Single source of truth for password hashing.
 *
 * Every hash/compare in the app (register, reset, change-password, the
 * credentials `authorize`, and the seed) goes through here so the cost factor
 * can't drift between call sites.
 */

/** bcrypt cost factor for all password hashing. */
export const BCRYPT_ROUNDS = 12;

/** Hash a plaintext password with the standard cost factor. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/** Check a plaintext password against a stored bcrypt hash. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
