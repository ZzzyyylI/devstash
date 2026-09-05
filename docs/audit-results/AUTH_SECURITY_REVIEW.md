# Auth Security Review

**Last audited:** 2026-09-05
**Scope:** NextAuth v5 credentials + GitHub, email verification, password reset, profile/account actions
**Auditor:** auth-auditor subagent

## Summary

The hand-rolled auth surface is in good shape: bcrypt cost 12 everywhere, 256-bit CSPRNG tokens with enforced TTL and single-use deletion, session-scoped profile/account actions with no IDOR or mass-assignment, and identical response bodies on the enumeration-sensitive endpoints. Five issues were found: **2 Medium** (no rate limiting / brute-force protection anywhere; password-reset link host derived from request headers when the origin env var is unset) and **3 Low** (backslash open-redirect in `callbackUrl`, timing/`register` account enumeration, non-atomic token consumption). One informational note on JWT session revocation.

## Findings

### Medium — No rate limiting or lockout on any credential/token endpoint

- **Location:** `src/auth.ts:45–68` (`authorize`); `src/app/api/auth/register/route.ts:21–101`; `src/app/api/auth/forgot-password/route.ts:24–64`; `src/app/api/auth/resend-verification/route.ts:24–70`; `src/app/api/auth/reset-password/route.ts:16–70`; `src/app/api/auth/change-password/route.ts:15–74`
- **Issue:** There is no IP-based or account-based rate limiting, and no progressive lockout, on any of these endpoints (confirmed: no `ratelimit`/`throttle`/`lockout` code anywhere under `src/`). The only abuse control is the per-identifier 60s DB debounce (`RESEND_DEBOUNCE_MS`, `src/lib/tokens.ts:9`) applied in `forgot-password` and `resend-verification`. That debounce is keyed on the *latest token row for one identifier*, so it only throttles repeat mail to a single already-targeted address — it does nothing against enumeration across many addresses, distributed/rotating source IPs, or the sign-in, register, and reset-password paths, which have no control at all.
- **Impact:** Online password brute-force against the Credentials provider (bcrypt cost 12 slows each guess to a few hundred ms but nothing stops an attacker running thousands in parallel or over time); unlimited automated account creation via `register`; unbounded `bcrypt.hash` CPU burn by hammering `register` / `reset-password` (cheap DoS); unbounded token-guessing on `reset-password` (only saved by the 256-bit token entropy).
- **Fix:** Add a shared limiter (e.g. `@upstash/ratelimit` on Redis, or a Prisma-backed counter) keyed on client IP for every route above, plus a per-account failed-attempt counter with exponential backoff / temporary lock on the `authorize` path in `src/auth.ts`. Return HTTP 429 once tripped.

### Medium — Password-reset / verification links built from the request `Host` header when no origin env var is set

- **Location:** `src/lib/base-url.ts:9–25`; consumed at `src/app/api/auth/forgot-password/route.ts:55`, `src/app/api/auth/register/route.ts:75`, `src/app/api/auth/resend-verification/route.ts:61`, `src/app/api/auth/verify-email/route.ts:17`
- **Issue:** `getBaseUrl` returns `process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL` if either is set, but otherwise falls back to `request.headers.get("x-forwarded-host") ?? request.headers.get("host")` with no allow-list check. The reset URL is then `${getBaseUrl(request)}/reset-password?token=${token}` and is emailed to the account owner.
- **Impact:** If a deployment does not set `AUTH_URL` or `NEXT_PUBLIC_APP_URL`, an attacker calls `POST /api/auth/forgot-password` with a victim's email and a spoofed `X-Forwarded-Host: attacker.example`. The victim receives a genuine DevStash reset email whose link points at `https://attacker.example/reset-password?token=<valid single-use token>`. Clicking it (or any link prefetch / preview bot) delivers the reset token to the attacker, who completes the reset and takes over the account. Same primitive poisons the verification link from `register` / `resend-verification`.
- **Mitigation already in place:** setting `AUTH_URL` or `NEXT_PUBLIC_APP_URL` (documented in `.env.example:24–26`) removes the header path entirely. Real-world exploitability therefore depends on deployment config and on whether the hosting platform forwards a client-controlled `X-Forwarded-Host`; this could not be verified here because `.env` is gitignored.
- **Fix:** In production, require an explicitly configured origin — throw at startup / return 500 if neither env var is set — instead of trusting request headers. If a header fallback must stay for dev, gate it behind `NODE_ENV !== "production"` and/or validate the derived host against a static allow-list.

### Low — Open redirect via backslash in `callbackUrl`

- **Location:** `src/app/sign-in/page.tsx:13–19` (`safeCallbackUrl`); sinks at `src/app/sign-in/page.tsx:32` (`redirect(callbackUrl)`) and `src/components/auth/SignInForm.tsx:58` (`router.push(callbackUrl)`)
- **Issue:** `safeCallbackUrl` accepts any value where `value.startsWith("/") && !value.startsWith("//")`. That admits `/\evil.com` and `/\/evil.com`. Per the WHATWG URL spec for special schemes, browsers and `new URL()` normalise `\` to `/`, so `next/navigation`'s `router.push("/\\evil.com")` and Next's `redirect("/\\evil.com")` resolve to `https://evil.com/`. The stated intent of the function ("Only allow same-origin relative paths") is not enforced.
- **Impact:** A victim opening `/sign-in?callbackUrl=/\evil.com` is bounced to an attacker origin immediately (if already authenticated, via the server `redirect`) or right after a successful sign-in (via `router.push`). Useful as a phishing / credential-harvest springboard from a trusted domain. No token is disclosed (the sign-in itself completes on the real origin first).
- **Fix:** Validate with the URL parser instead of string prefixes: `const u = new URL(value, "http://x"); return u.origin === "http://x" && !value.includes("\\") ? u.pathname + u.search + u.hash : "/dashboard";` — or simply reject any value that does not match `^/(?![/\\]).*`.

### Low — Account enumeration via `register` status code and reset/resend response timing

- **Location:** `src/app/api/auth/register/route.ts:46–52`; `src/app/api/auth/forgot-password/route.ts:44–61`; `src/app/api/auth/resend-verification/route.ts:50–67`
- **Issue:** `register` returns `409 "An account with that email already exists"` for a known email versus `201` for a new one — a direct enumeration oracle. `forgot-password` and `resend-verification` correctly return an identical `{ success: true }` 200 in all cases, but the expensive work — `await sendPasswordResetEmail(...)` / `await sendVerificationEmail(...)`, a network round-trip to Resend — only runs on the real-account branch (`if (user?.password)` / `if (user && !user.emailVerified)`) and only past the debounce. Response latency therefore distinguishes "registered email/password account" from "unknown / OAuth-only / already-verified".
- **Impact:** An attacker can determine which email addresses have DevStash accounts (and, for the reset endpoint, which have a password set), enabling targeted phishing and credential-stuffing.
- **Fix:** Send mail out-of-band (enqueue and return immediately) so response time is constant regardless of branch; or always perform an equivalent-cost dummy operation on the negative branch. For `register`, prefer a generic "check your email to finish signing up" response for both new and existing addresses (with the existing-account branch emailing a "you already have an account" notice instead).

### Low — Non-atomic token consumption (TOCTOU) in `consumeVerificationToken`

- **Location:** `src/lib/tokens.ts:45–58`
- **Issue:** Consumption is a `findFirst({ where: { token } })` followed by a separate `deleteMany({ where: { identifier, token } })`, with no check that the delete removed a row. Two concurrent requests carrying the same token can both complete the `findFirst` before either delete lands, so both proceed as "valid".
- **Impact:** For `verify-email` this is harmless (the update is idempotent). For `reset-password` it lets one reset token drive two concurrent password writes. Practical impact is minimal — it is the same user submitting the same reset form, the token is unusable afterward, and the write is scoped to one row — so this is defense-in-depth rather than an exploitable flaw.
- **Fix:** Make consumption atomic: `const { count } = await prisma.verificationToken.deleteMany({ where: { token } });` and treat `count === 0` as invalid, or use `DELETE ... RETURNING` / an interactive transaction so the expiry check runs on the row that this call, and only this call, removed.

### Informational — Password reset/change does not revoke existing sessions

- **Location:** `src/auth.ts:72–89` (`session: { strategy: "jwt" }`, no session store); `src/app/api/auth/reset-password/route.ts`, `src/app/api/auth/change-password/route.ts`
- **Issue:** With the JWT strategy there is no server-side session table to invalidate, and neither route bumps a token-version claim. An already-issued session token stays valid until it expires even after the password is reset or changed.
- **Fix (optional):** Add a `passwordChangedAt` / `tokenVersion` field on `User`, embed it in the JWT in the `jwt` callback, and reject the session in the `session` callback when it no longer matches. Inherent to `strategy: "jwt"` otherwise; rate as informational.

## Passed Checks

- **Password hashing:** `bcrypt.hash(password, 12)` (bcryptjs v3) in all three write paths — `register` (`route.ts:54`), `reset-password` (`route.ts:52`), `change-password` (`route.ts:67`). Same cost factor throughout. No `Math.random`, no SHA/MD5, no plaintext storage, no unsalted hashing.
- **Password comparison:** `bcrypt.compare` for sign-in (`src/auth.ts:55`) and for the current-password re-check in `change-password` (`route.ts:59`). No `===` on hash values anywhere.
- **bcrypt 72-byte limit:** `password` capped at `.max(72)` in `registerSchema`, `resetPasswordSchema`, `changePasswordSchema` (`src/lib/validations/auth.ts:29,44,65`), min 8. `signInSchema` has no max but only feeds `bcrypt.compare`, which is harmless.
- **Token generation:** verification and reset tokens are `randomBytes(32).toString("hex")` = 256 bits from Node's CSPRNG (`src/lib/tokens.ts:19`). Not `Math.random`.
- **Token TTL:** 24h TTL is both set (`src/lib/tokens.ts:20`) and enforced on consumption — `if (row.expires.getTime() < Date.now()) return null` (`src/lib/tokens.ts:55`).
- **Prior-token invalidation:** minting a new token first runs `deleteMany({ where: { identifier } })` (`src/lib/tokens.ts:22`), so only the most recent link for an identifier works.
- **Reset token single-use:** `consumePasswordResetToken` deletes the row (`reset-password/route.ts:41`) before the new hash is computed and written (`:52`, `:56`). A reset link cannot be replayed sequentially.
- **Token namespacing:** reset tokens are stored under `pwreset:<email>` (`src/lib/tokens.ts:68–92`). A verification token passed to `reset-password` is rejected by the missing-prefix check; a reset token passed to `verify-email` matches no `User.email` row and is a no-op. The token is spent before the prefix check, but this is harmless given 256-bit unguessable tokens delivered only to the address owner.
- **Reset write scoping:** `prisma.user.updateMany({ where: { email: result.email }, data: { password } })` (`reset-password/route.ts:56`). `User.email` is `@unique`, so `updateMany` can only ever hit the token's own user.
- **verify-email idempotency / no leak:** missing token, unknown token, expired token, and already-used token all redirect to `/sign-in?error=verification`; success and "already verified" both redirect to `/sign-in?verified=1` (`verify-email/route.ts:19–37`). The `updateMany` with `emailVerified: null` makes the already-verified case a silent no-op.
- **Enumeration response parity:** `forgot-password` and `resend-verification` return byte-identical `{ success: true }` with status 200 for registered, unregistered, OAuth-only, and already-verified addresses (timing side-channel noted as a Low finding above).
- **`authorize` does not leak:** unknown email, no password set, and wrong password all return `null`; the `unverified_email` throw fires only *after* a correct password check (`src/auth.ts:45–60`), so it reveals nothing to someone without the credentials.
- **Profile page guard:** `src/app/profile/page.tsx:19–26` redirects when there is no session **and** when `getProfileUser` returns `null` (session outlived the row).
- **Session-scoped profile reads:** `getProfileUser` / `getProfileStats` take the caller-supplied `session.user.id` (`profile/page.tsx:22–25`), not the hardcoded demo user. `getProfileUser` selects `password` only to derive `hasPassword` and strips it from the return value (`src/lib/db/profile.ts:40–41`) — the hash is never returned.
- **Account-action auth:** `change-password` and `delete-account` each independently call `await auth()` and 401 without a session (`change-password/route.ts:16–22`, `delete-account/route.ts:17–23`), validate the body with Zod, and act only on `session.user.id`. No route accepts a user id or email from the request body — no IDOR.
- **change-password:** re-verifies the current password with `bcrypt.compare` before writing (`route.ts:59–65`) and rejects accounts with no `password` (OAuth-only).
- **delete-account:** requires `confirmation.trim().toLowerCase() === user.email.toLowerCase()` (`route.ts:52–59`) and deletes only `where: { id: user.id }`.
- **Deletion completeness:** `prisma/schema.prisma` sets `onDelete: Cascade` on `Account`, `Session`, `Item`, `Collection`, `Tag`, custom `ItemType`, and `ItemTag`, so all owned rows go with the user. `VerificationToken` has no FK relation and is cleared explicitly for both `email` and `pwreset:${email}` (`delete-account/route.ts:62–64`).
- **No mass assignment:** every route destructures explicit fields from the parsed Zod result and passes a literal `data` object to Prisma; no `...body` / `...req.body` spread into `user.update`.
- **Open redirect on GitHub path:** `signIn("github", { callbackUrl })` (`SignInForm.tsx:166`) hands the value to Auth.js, which validates it against the configured origin.
- **Secrets / logging:** no token, hash, or reset/verification URL is logged or returned. The only logging is generic `console.error` of caught exceptions in `register`, `forgot-password`, `resend-verification`.
- **CSRF on custom mutating routes:** `change-password` / `delete-account` require a JSON body (`request.json()` throws → 400 on a cross-site form post) and a NextAuth session cookie (default `SameSite=Lax`), which together block cross-site invocation.
- **Repo hygiene:** `.gitignore:33–35` excludes `.env*` except `.env.example`; the committed example holds only placeholders.

## Not In Scope (handled by NextAuth)

- CSRF protection on Auth.js routes / the built-in `/api/auth/*` handlers.
- Session cookie flags (`httpOnly`, `secure`, `sameSite`), cookie-name prefixes, session-token encryption/signing.
- OAuth `state` / PKCE / nonce for the GitHub provider.
- JWT signing/encryption of the session token itself; `AUTH_SECRET` provisioning (`.env` is gitignored, only placeholders committed).
