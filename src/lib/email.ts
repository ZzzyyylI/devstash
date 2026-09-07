import { Resend } from "resend";

/**
 * Resend client singleton.
 *
 * Mirrors the `src/lib/prisma.ts` pattern: one instance reused across hot
 * reloads in development. `RESEND_API_KEY` is read from the environment.
 */
const globalForResend = globalThis as unknown as {
  resend: Resend | undefined;
};

const apiKey = process.env.RESEND_API_KEY;

export const resend =
  globalForResend.resend ?? new Resend(apiKey || "re_missing_api_key");

if (process.env.NODE_ENV !== "production") {
  globalForResend.resend = resend;
}

/** From address for all outbound mail. Falls back to Resend's shared test sender. */
const FROM = process.env.EMAIL_FROM?.trim() || "DevStash <onboarding@resend.dev>";

/**
 * Send the account verification email.
 *
 * Throws if the send fails (missing API key, Resend API error) so callers can
 * decide whether to surface or swallow the failure — registration swallows it
 * (the user can re-request), the resend endpoint reports it.
 */
export async function sendVerificationEmail(to: string, verifyUrl: string) {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your DevStash email",
    text: [
      "Welcome to DevStash!",
      "",
      "Confirm your email address by opening the link below:",
      verifyUrl,
      "",
      "This link expires in 24 hours. If you didn't create a DevStash account, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; color: #0a0a0a;">
        <h1 style="font-size: 18px; margin: 0 0 16px;">Verify your DevStash email</h1>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Confirm your email address to activate your account.
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${verifyUrl}" style="display: inline-block; background: #0a0a0a; color: #fff; text-decoration: none; font-size: 14px; padding: 10px 18px; border-radius: 8px;">
            Verify email
          </a>
        </p>
        <p style="font-size: 12px; line-height: 1.6; color: #666; margin: 0;">
          Or paste this URL into your browser:<br />
          <a href="${verifyUrl}" style="color: #666;">${verifyUrl}</a>
        </p>
        <p style="font-size: 12px; line-height: 1.6; color: #666; margin: 16px 0 0;">
          This link expires in 24 hours. If you didn't create a DevStash account, you can ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend error: ${error.name} — ${error.message}`);
  }

  return data;
}

/**
 * Send the password-reset email.
 *
 * Mirrors `sendVerificationEmail`: throws on send failure so the caller can
 * decide whether to surface or swallow it (the forgot-password route swallows
 * it and still responds 200, to avoid leaking whether the address is real).
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your DevStash password",
    text: [
      "We received a request to reset your DevStash password.",
      "",
      "Choose a new password by opening the link below:",
      resetUrl,
      "",
      "This link expires in 24 hours. If you didn't request a password reset, you can ignore this email — your password won't change.",
    ].join("\n"),
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; color: #0a0a0a;">
        <h1 style="font-size: 18px; margin: 0 0 16px;">Reset your DevStash password</h1>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          We received a request to reset your password. Choose a new one below.
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${resetUrl}" style="display: inline-block; background: #0a0a0a; color: #fff; text-decoration: none; font-size: 14px; padding: 10px 18px; border-radius: 8px;">
            Reset password
          </a>
        </p>
        <p style="font-size: 12px; line-height: 1.6; color: #666; margin: 0;">
          Or paste this URL into your browser:<br />
          <a href="${resetUrl}" style="color: #666;">${resetUrl}</a>
        </p>
        <p style="font-size: 12px; line-height: 1.6; color: #666; margin: 16px 0 0;">
          This link expires in 24 hours. If you didn't request a password reset, you can ignore this email — your password won't change.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend error: ${error.name} — ${error.message}`);
  }

  return data;
}
