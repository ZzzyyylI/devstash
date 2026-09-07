# Stripe Phase 1 — Core Infrastructure

## Overview

Lay the Stripe foundation for **DevStash Pro** ($8/mo, $72/yr): install the SDK,
add the subscription columns, and build the pure `src/lib/stripe/*` modules
(client singleton, plan/price mapping, usage-limit checks) plus their unit tests.

**No webhooks, no checkout, no UI, no gating in this phase** — that is Phase 2
(`context/features/stripe-phase-2-spec.md`). Phase 1 ends with the modules built,
`npm run test` green, and the schema migrated.

Full code examples and rationale: `docs/stripe-integration-plan.md` (§4, §5.1–5.2, §5.6).

## Requirements

- `npm install stripe` (Node SDK v19+; **no** `@stripe/stripe-js` — hosted
  Checkout is used in Phase 2, so the publishable key is not required).
- Prisma migration (`prisma migrate dev`, **never** `db push`) on the Neon
  `development` branch:
  - `stripeCustomerId String? @unique` (add `@unique` to the existing field)
  - `stripePriceId String?` (new)
  - `stripeCurrentPeriodEnd DateTime?` (new)
  - `isPro` / `stripeSubscriptionId` already exist — leave them.
- All new runtime modules live under `src/lib/stripe/`.
- Env vars are **server-only** (no `NEXT_PUBLIC_`). Missing keys must **fail
  soft**: `getStripe()` returns `null` + `console.warn`, never throws.
- Limit-check helpers are **`userId`-first** (take an explicit `userId`), so they
  stay correct once the dashboard data layer is session-scoped. See the "Scope
  caveat" note below.
- Unit tests for the limits module (and the plans + validation modules) in the
  same commit, per `context/coding-standards.md`.

## Files to Create

1. `src/lib/stripe/client.ts`
   - `getStripe(): Stripe | null` — lazy singleton (mirror `getRedis()` in
     `src/lib/rate-limit.ts`: `undefined` = unresolved, `null` = no key, warn once).
   - `isStripeConfigured(): boolean` — `STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET`.

2. `src/lib/stripe/plans.ts`
   - `type BillingInterval = "monthly" | "yearly"`.
   - `PLAN_LIMITS = { free: { items: 50, collections: 3 }, pro: { items: Infinity, collections: Infinity } }`
     (numbers mirror `context/project-overview.md` / `FREE_FEATURES`).
   - `priceIdForInterval(interval)` → `STRIPE_PRICE_ID_MONTHLY` / `STRIPE_PRICE_ID_YEARLY` or `null`.
   - `intervalForPriceId(priceId)` → `"monthly"` / `"yearly"` / `null` (reverse lookup).
   - `isActiveStatus(status: string)` → `true` for `"active"` | `"trialing"`.

3. `src/lib/stripe/limits.ts`
   - `interface LimitCheck { allowed: boolean; limit: number | null; current: number }`.
   - `checkItemLimit(userId: string, isPro: boolean): Promise<LimitCheck>` — Pro
     short-circuits with **no** `prisma.item.count` call; free path counts
     `prisma.item.count({ where: { userId } })` and compares to
     `PLAN_LIMITS.free.items`.
   - `checkCollectionLimit(userId, isPro)` — same shape against
     `prisma.collection.count` / `PLAN_LIMITS.free.collections`.
   - `limitErrorMessage(kind: "item" | "collection", check: LimitCheck): string` —
     e.g. `"You've reached the free plan limit of 50 items. Upgrade to DevStash Pro for unlimited items."`

4. `src/lib/validations/billing.ts`
   - `checkoutSchema = z.object({ interval: z.enum(["monthly", "yearly"]) })` (Zod v4).
   - `type CheckoutInput = z.infer<typeof checkoutSchema>`.

5. `src/lib/stripe/plans.test.ts`
   - `priceIdForInterval` / `intervalForPriceId` round-trip under `vi.stubEnv`
     (`STRIPE_PRICE_ID_MONTHLY` / `_YEARLY`); unknown price id → `null`; unset env → `null`.
   - `isActiveStatus` truth table (`active`/`trialing` → true; `past_due`,
     `canceled`, `incomplete`, `unpaid` → false).
   - `PLAN_LIMITS.free` is `{ items: 50, collections: 3 }`.

6. `src/lib/stripe/limits.test.ts` *(the required usage-limits test suite)*
   - `vi.mock("@/lib/prisma", ...)` with `item.count` / `collection.count`.
   - `checkItemLimit(id, true)` → `{ allowed: true, limit: null, current: 0 }` and
     asserts `count` was **not** called.
   - free user, `count` returns `10` (< 50) → `{ allowed: true, limit: 50, current: 10 }`.
   - free user, `count` returns `50` (== limit) → `{ allowed: false, ... }`.
   - free user, `count` returns `51` → `{ allowed: false }`.
   - `checkCollectionLimit` mirror cases against `3` (2 → allowed, 3 → blocked).
   - `limitErrorMessage("item", check)` / `("collection", check)` contain the
     limit number and "DevStash Pro".
   - `afterEach(() => vi.unstubAllEnvs())` / reset mocks.

7. `src/lib/validations/billing.test.ts`
   - `checkoutSchema.safeParse({ interval: "monthly" })` / `{ interval: "yearly" }` → success.
   - `{ interval: "weekly" }`, `{}`, `{ interval: 5 }` → failure.

## Files to Modify

1. `prisma/schema.prisma` — `User` model: `@unique` on `stripeCustomerId`, add
   `stripePriceId String?` and `stripeCurrentPeriodEnd DateTime?`. Then
   `npx prisma migrate dev --name add_stripe_subscription_fields`.

2. `src/lib/db/items.ts` — add
   `export async function getUserItemCount(userId: string): Promise<number>`
   (`prisma.item.count({ where: { userId } })`). Phase 2's gate uses it; keeps the
   limits module free of a second query path if a caller already has the count.

3. `src/lib/db/collections.ts` — add
   `export async function getUserCollectionCount(userId: string): Promise<number>`.
   *(Note: a pre-existing unused `getCollectionCount()` exists — leave it; add the
   new `userId`-scoped one.)*

4. `.env.example` — the five `STRIPE_*` stubs already exist (currently uncommitted
   on `main`). Commit them with this phase and add a comment block in the file's
   existing style:

   ```
   # Stripe — subscription billing (DevStash Pro).
   #   STRIPE_SECRET_KEY       — sk_test_… / sk_live_…  (Developers > API keys)
   #   STRIPE_WEBHOOK_SECRET   — whsec_…  (Phase 2: `stripe listen` locally, or the
   #                             webhook endpoint's signing secret in the Dashboard)
   #   STRIPE_PRICE_ID_MONTHLY — price_…  ($8/mo recurring price)
   #   STRIPE_PRICE_ID_YEARLY  — price_…  ($72/yr recurring price)
   #   STRIPE_PUBLISHABLE_KEY  — pk_test_… (only if Stripe.js/Elements is added
   #                             later; hosted Checkout does not need it)
   # Leave STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET blank to disable billing —
   # the Phase 2 endpoints then return 503 and nothing else breaks.
   ```

## Environment Variables

```
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRICE_ID_MONTHLY=""
STRIPE_PRICE_ID_YEARLY=""
```

Phase 1 code reads only `STRIPE_SECRET_KEY` (via `getStripe()`) and the two
`STRIPE_PRICE_ID_*` (via `plans.ts`). All may be blank in local dev — the modules
degrade gracefully and the unit tests stub what they need.

## Key Gotchas

- `getStripe()` must never throw on a missing key — Phase 2 endpoints depend on the
  soft-fail (`null` → 503). Copy the exact `getRedis()` memoisation shape.
- Pin the Stripe API version to `Stripe.LATEST_API_VERSION` at install time (or
  omit and accept the SDK default) — be consistent.
- `PLAN_LIMITS.pro.items` is `Infinity`; make sure comparisons are `current < limit`
  so `Infinity` behaves. The Pro branch should return early anyway.
- Limit helpers use `<` (strictly less than) so the check runs **before** the
  create — at exactly 50 items the 51st is blocked.
- Vitest only collects `src/{actions,lib}/**/*.test.ts` — the new tests are all
  under `src/lib/`, so they're picked up automatically.
- Mock `@/lib/prisma` (never hit Neon in tests); use `vi.stubEnv` + `afterEach`
  `vi.unstubAllEnvs()` for the price-id env vars.

## Scope caveat (carried into Phase 2)

The dashboard data layer (`src/lib/db/items.ts`, `collections.ts`) is scoped to a
hard-coded **demo user** (`getDemoUserId()`), not the signed-in user. The limit
helpers are built `userId`-first so they're ready for session-scoped data. Phase 2
decides whether to gate on the session user's counts (recommended) or pass
`getDemoUserId()` as an interim. Nothing in Phase 1 depends on that decision.

## Testing

1. `npm run test` — new suites green (`plans.test.ts`, `limits.test.ts`,
   `billing.test.ts`); existing 270 still pass.
2. `npm run lint` — clean.
3. `npm run build` — green (`build` runs `prisma generate`, picking up the new
   columns).
4. `npx prisma migrate status` — in sync.
5. Sanity: in a scratch script or REPL, `getStripe()` with no `STRIPE_SECRET_KEY`
   returns `null` and logs the warning once (not per call).

## References

- `docs/stripe-integration-plan.md` — §4 (module code), §5.1–5.2, §5.6, §7 (unit checklist)
- `src/lib/rate-limit.ts` — the `getRedis()` lazy-singleton / fail-open pattern to copy
- `src/lib/db/profile.ts` — session-scoped data-layer pattern for Phase 2
