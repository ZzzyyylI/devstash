/**
 * Deploy-time feature flags for the auth flow, read from the environment.
 *
 * Server-only: none of these are `NEXT_PUBLIC_`, so they must not be imported
 * into client components. Every consumer (the register/resend API routes, the
 * Credentials `authorize` in `src/auth.ts`, the sign-in server component) runs
 * on the server.
 */

/**
 * Whether new email/password accounts must confirm their address before they
 * can sign in.
 *
 * Defaults to **enabled**. Set `EMAIL_VERIFICATION_ENABLED="false"` to switch
 * the whole requirement off — needed while no domain is verified in Resend, so
 * the test sender only reaches the Resend account owner's own address. When
 * disabled: registration marks accounts verified on creation and sends no
 * email, sign-in never blocks on an unverified address, and the resend endpoint
 * is a no-op.
 */
export function emailVerificationEnabled(): boolean {
  return process.env.EMAIL_VERIFICATION_ENABLED?.toLowerCase() !== "false";
}
