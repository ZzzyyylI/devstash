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
