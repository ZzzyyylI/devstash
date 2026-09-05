import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

/** How long a verification link stays valid. */
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Don't re-send if a token for this identifier was minted within this window. */
export const RESEND_DEBOUNCE_MS = 60 * 1000; // 60 seconds

/**
 * Mint a fresh email-verification token for `identifier` (an email address).
 *
 * Any existing tokens for that identifier are dropped first, so only the most
 * recent link works. The token itself is a 256-bit random opaque string stored
 * as-is in the `VerificationToken` table (Auth.js's standard shape).
 */
export async function createVerificationToken(identifier: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TTL_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({ data: { identifier, token, expires } });

  return token;
}

/**
 * The most recent token for `identifier`, or `null`. Used to debounce resends.
 */
export async function latestVerificationToken(identifier: string) {
  return prisma.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
  });
}

/**
 * Validate and consume a verification token.
 *
 * Returns the identifier (email) the token was minted for, or `null` if the
 * token is unknown or expired. Either way the matching row is deleted — tokens
 * are single-use.
 */
export async function consumeVerificationToken(
  token: string,
): Promise<{ identifier: string } | null> {
  const row = await prisma.verificationToken.findFirst({ where: { token } });
  if (!row) return null;

  await prisma.verificationToken.deleteMany({
    where: { identifier: row.identifier, token: row.token },
  });

  if (row.expires.getTime() < Date.now()) return null;

  return { identifier: row.identifier };
}

/**
 * Password-reset tokens share the `VerificationToken` table with the
 * email-verification flow. To keep the two from clobbering each other —
 * `createVerificationToken` drops every row for an identifier before minting a
 * new one — reset tokens are stored under a namespaced identifier
 * (`pwreset:<email>`). The `pwreset:` prefix never appears in a real email
 * address, so the two namespaces can't overlap.
 */
const PW_RESET_PREFIX = "pwreset:";

/** Mint a fresh password-reset token for `email`. Drops any prior reset token. */
export async function createPasswordResetToken(email: string): Promise<string> {
  return createVerificationToken(`${PW_RESET_PREFIX}${email}`);
}

/** Most recent password-reset token for `email`, or `null`. Debounce helper. */
export async function latestPasswordResetToken(email: string) {
  return latestVerificationToken(`${PW_RESET_PREFIX}${email}`);
}

/**
 * Validate and consume a password-reset token.
 *
 * Returns the bare email the token was minted for, or `null` if the token is
 * unknown, expired, or not a password-reset token. Single-use either way.
 */
export async function consumePasswordResetToken(
  token: string,
): Promise<{ email: string } | null> {
  const result = await consumeVerificationToken(token);
  if (!result || !result.identifier.startsWith(PW_RESET_PREFIX)) return null;

  return { email: result.identifier.slice(PW_RESET_PREFIX.length) };
}
