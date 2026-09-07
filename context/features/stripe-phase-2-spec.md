# Stripe Phase 2 — Integration & UI

## Overview

Build on Phase 1 (`context/features/stripe-phase-1-spec.md`) to ship the working
subscription: Stripe-hosted **Checkout** and **Billing Portal**, a **webhook** that
drives `User.isPro`, **feature gating** (50 items / 3 collections / file uploads),
and the **billing UI** on `/settings`.

Entitlement is granted by the **webhook**, never by the checkout return URL.

Full code examples and rationale: `docs/stripe-integration-plan.md` (§4.4, §4.6–4.9,
§5.3–5.5, §5.7–5.12, §6–§7).

## Requirements

- Stripe Dashboard set up in **Test mode** (product, two prices, portal, webhook) —
  see "Stripe Dashboard Setup" below.
- Checkout + Portal + Webhook are **API routes** (not Server Actions) — matches the
  collection-mutation convention and the raw-body / redirect needs.
- Webhook route: `export const runtime = "nodejs"`, verify `stripe-signature` with
  `stripe.webhooks.constructEvent` on the **raw** body (`await request.text()` —
  never `request.json()`). Must stay **public** (do not add it to `src/proxy.ts`).
- Session `isPro`: sync from the DB in the `jwt()` callback on every `auth()` call
  (a webhook DB change can't reach an existing JWT otherwise). A page reload after
  checkout then reflects Pro. Do **not** gate Pro in the edge proxy (it can't see it).
- Feature gating enforced server-side in the create paths; UI hints are cosmetic.
- `image` uploads stay **free**; only `file` uploads are Pro.
- All endpoints fail soft when Stripe env is unset: `getStripe()` `null` /
  `!isStripeConfigured()` → `503`, app otherwise unaffected.

## Decision to make first — limit-gating scope

The dashboard data layer writes items/collections under the **demo user**
(`getDemoUserId()`), not the signed-in user. Pick one:

- **(Recommended)** Gate on the **session user's** counts
  (`checkItemLimit(session.user.id, isPro)`). Correct for real billing; assumes /
  motivates session-scoping the data layer.
- **(Interim)** Pass `await getDemoUserId()` to the limit helpers and leave a
  `TODO`. Enforcement is then shared across all users until the data layer moves.

Record the choice in `context/current-feature.md`.

## Files to Create

1. `src/lib/stripe/subscription.ts`
   - `syncSubscriptionForCustomer(customerId: string): Promise<void>` — the **only**
     writer of the subscription columns. Looks up the `User` by `stripeCustomerId`,
     re-reads `stripe.subscriptions.list({ customer, status: "all", limit: 1 })`,
     and reconciles `isPro` / `stripeSubscriptionId` / `stripePriceId` /
     `stripeCurrentPeriodEnd` to Stripe's current state (clears them when there's no
     live sub). Idempotent + order-independent by construction — no processed-event
     table needed for v1. Warns on unknown customer.

2. `src/app/api/stripe/webhook/route.ts`
   - `POST`, `runtime = "nodejs"`. `constructEvent` → `switch (event.type)`:
     - `checkout.session.completed` → `syncSubscriptionForCustomer(session.customer)`
     - `customer.subscription.created` | `.updated` | `.deleted` →
       `syncSubscriptionForCustomer(sub.customer)`
     - `invoice.payment_failed` → `syncSubscriptionForCustomer(invoice.customer)`
     - default → ignore
   - Bad/missing signature → `400` (no DB write). Handler throw → `500` (Stripe retries).
   - Success → `{ received: true }`.

3. `src/app/api/stripe/checkout/route.ts`
   - `POST { interval: "monthly" | "yearly" }` → `{ success: true, data: { url } }`.
   - `auth()` guard → `503` if `!getStripe() || !isStripeConfigured()` →
     `readJsonBody` / `checkoutSchema.safeParse` → `priceIdForInterval` (`503` if unset).
   - Load user; `409` if already `isPro`.
   - Reuse `stripeCustomerId`, else `stripe.customers.create({ email, metadata: { userId } })`
     and persist it.
   - `stripe.checkout.sessions.create({ mode: "subscription", customer, line_items:
     [{ price, quantity: 1 }], client_reference_id: userId, subscription_data:
     { metadata: { userId } }, allow_promotion_codes: true, success_url:
     "<origin>/settings?checkout=success", cancel_url: "<origin>/settings?checkout=cancelled" })`.
   - `<origin>` from `getBaseUrl(request)`.

4. `src/app/api/stripe/portal/route.ts`
   - `POST` → `{ success: true, data: { url } }`. `auth()` guard, `503` if
     unconfigured, `409` if the user has no `stripeCustomerId`
     (`stripe.billingPortal.sessions.create({ customer, return_url: "<origin>/settings" })`).

5. `src/components/settings/BillingSection.tsx` (`"use client"`)
   - Props `{ isPro: boolean; hasCustomer: boolean }`.
   - Free: monthly/yearly segmented toggle (labels from `PRICING` in
     `src/lib/home-content.ts`) + **Upgrade to Pro** → `postJson("/api/stripe/checkout",
     { interval })` → `window.location.assign(res.data.url)`.
   - Pro: **Manage billing** → `postJson("/api/stripe/portal")` → redirect. Disabled
     when `!hasCustomer`.
   - Card chrome matches the other `/settings` cards
     (`rounded-xl border border-border bg-card p-4`). `sonner` toast on fetch failure.
   - Verify `postJson`'s return shape in `src/lib/post-json.ts` and adjust.

## Files to Modify

1. `src/auth.ts` — `jwt` callback becomes `async`; after setting `token.id`, always
   `prisma.user.findUnique({ where: { id }, select: { isPro: true } })` and set
   `token.isPro`. `session` callback: `session.user.isPro = Boolean(token.isPro)`.
   (`prisma` is already imported.) Trade-off: one indexed read per `auth()` call —
   acceptable here; noted in the plan doc §5.3.

2. `src/types/next-auth.d.ts` — add `isPro: boolean` to `Session["user"]`; add
   `isPro?: boolean` to `JWT`.

3. `src/lib/db/profile.ts` — `getProfileUser` select: add `stripeCustomerId: true`;
   expose `hasStripeCustomer: boolean` on `ProfileUser` (derive, don't leak the raw
   id). Update `src/lib/db/profile.test.ts` fixtures.

4. `src/actions/items.ts` — in `createItem`, after `auth()` + Zod parse, before
   `createItemQuery`:
   - `const check = await checkItemLimit(<scopeUserId>, Boolean(session.user.isPro));`
     `if (!check.allowed) return { success: false, error: limitErrorMessage("item", check) };`
   - `if (parsed.data.type === "file" && !session.user.isPro) return { success: false,
     error: "File uploads are a Pro feature. Upgrade to attach files." };`
   - `<scopeUserId>` per the decision above.

5. `src/app/api/collections/route.ts` — in `POST`, after `auth()` + `safeParse`,
   before `createCollection`:
   `const check = await checkCollectionLimit(<scopeUserId>, Boolean(session.user.isPro));`
   `if (!check.allowed) return NextResponse.json({ success: false, error:
   limitErrorMessage("collection", check) }, { status: 403 });`

6. `src/app/api/upload/route.ts` — after the auth guard, once `kind` is parsed:
   `if (kind === "file" && !session.user.isPro) return 403
   "File uploads are a Pro feature."`. Leave `kind === "image"` open.

7. `src/components/items/NewItemDialog.tsx` — accept an `isPro` prop (thread from
   `dashboard/layout.tsx`, which already `await auth()`s → `DashboardShell` →
   `TopBar`). When `!isPro`: disable the `file` type pill, show a small "Pro" badge
   + a link to `/settings`. `image` stays enabled. Cosmetic only — the action /
   upload route are the real gate.

8. `src/app/settings/page.tsx` — add a **Plan & billing** `<section>` between
   "Editor preferences" and "Account":
   `<BillingSection isPro={user.isPro} hasCustomer={user.hasStripeCustomer} />`.
   Optionally read `?checkout=success|cancelled` from `searchParams` for a toast.

9. *(Optional)* `src/components/home/PricingPlans.tsx` — for a signed-in visitor,
   swap the Pro card's `<Link href="/register">Go Pro</Link>` for a checkout POST
   using the toggled `period`; signed-out keeps `/register`. Needs a `signedIn`
   prop from `src/app/page.tsx` (already `await auth()`s).

10. `context/current-feature.md` — document the feature + the scope decision; move
    to History on completion (per `context/ai-interaction.md`).

## Stripe Dashboard Setup (Test mode)

1. **Product**: `DevStash Pro`. Add price **$8.00 USD recurring / monthly** →
   `STRIPE_PRICE_ID_MONTHLY`; add price **$72.00 USD recurring / yearly** →
   `STRIPE_PRICE_ID_YEARLY`.
2. **API keys**: Developers → API keys → Secret key → `STRIPE_SECRET_KEY`.
3. **Customer portal**: Settings → Billing → activate. Allow: update payment
   method, cancel subscription, switch between the two `DevStash Pro` prices.
   Default return URL `https://<domain>/settings`.
4. **Webhook** (deployed envs): Developers → Webhooks → Add endpoint
   `https://<domain>/api/stripe/webhook`. Events: `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`. Copy signing secret →
   `STRIPE_WEBHOOK_SECRET`.
5. **Local dev**: `stripe login` then
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`; use the printed
   `whsec_…` as the local `STRIPE_WEBHOOK_SECRET`. Restart `npm run dev` after
   editing `.env`.
6. **Go live**: recreate product/prices/webhook in Live mode; swap in `sk_live_…`,
   live `price_…`, live `whsec_…`.

## Testing

### Unit (`npm run test`)
- `profile.test.ts` — updated fixtures pass with the new select field /
  `hasStripeCustomer`.
- (No new unit suites — checkout/portal/webhook/`subscription.ts` are API/SDK
  surface, verified below, matching repo convention.)
- `npm run lint` + `npm run build` clean.

### Integration (Stripe CLI + browser, test mode)
1. `stripe listen …` running. With Stripe env unset, endpoints return `503` and the
   app is otherwise fine.
2. **Upgrade (monthly)**: `/settings` → Upgrade → Checkout → card
   `4242 4242 4242 4242` → back to `/settings?checkout=success`.
3. Webhook `checkout.session.completed` + `customer.subscription.created` received;
   `User.isPro = true`, `stripeCustomerId` / `stripeSubscriptionId` /
   `stripePriceId` / `stripeCurrentPeriodEnd` populated (verify via Neon MCP,
   `development` branch).
4. **Reload** → session reflects Pro (`/profile` badge "Pro").
5. **Upgrade (yearly)** sets `stripePriceId` to the yearly price.
6. **Limits — free**: 50 items OK, 51st blocked with the upsell; 3 collections OK,
   4th blocked. **Pro**: 51st item / 4th collection succeed.
7. **File upload**: free user + `file` type / `POST /api/upload kind=file` → 403;
   `image` still works free; Pro → both work.
8. **Manage billing** → Portal → **Cancel** → `customer.subscription.updated`
   (cancel_at_period_end); then `stripe trigger customer.subscription.deleted` →
   `isPro = false`, sub fields cleared.
9. `stripe trigger invoice.payment_failed` → handler reconciles (`past_due` →
   `isPro` false via `isActiveStatus`).
10. **Idempotency / ordering**: `stripe events resend <id>` → state unchanged;
    deliver `subscription.updated` before `checkout.session.completed` → final state
    still correct.
11. **Bad signature**: POST the webhook with a garbage `stripe-signature` → 400, no
    DB write.
12. **No-customer portal**: fresh free user → Manage billing disabled / 409.
13. **Already Pro** → `POST /api/stripe/checkout` → 409.
14. **Unauthed** → checkout / portal → 401; webhook still publicly reachable (not
    matched by `src/proxy.ts`).
15. **Account deletion while subscribed** (`POST /api/auth/delete-account`) —
    best-effort `stripe.subscriptions.cancel` before `prisma.user.delete` (add to
    that route), or accept an orphan customer; test whichever is chosen.

## Key Gotchas

- Raw body for the webhook: `await request.text()`, pass straight to
  `constructEvent`. Any middleware/body parsing that mutates it breaks the signature.
- `runtime = "nodejs"` on the webhook route (signature verification needs Node crypto).
- Don't trust `success_url` for entitlement — only the webhook writes `isPro`.
- The edge `proxy.ts` uses a different NextAuth instance with no Prisma — it won't
  see `token.isPro`. Keep Pro-gating in pages / actions / routes.
- `stripe.subscriptions.list` (v7+ SDK) — not the deprecated
  `customers.listSubscriptions`.
- `current_period_end` is seconds → `new Date(sec * 1000)`.
- New customer creation must persist `stripeCustomerId` **before** returning the
  Checkout URL, so a retried upgrade reuses it (avoids duplicate Stripe customers).

## References

- `docs/stripe-integration-plan.md` — §4.4/§4.6–4.9 (route code), §5.3–5.12
  (diffs), §6 (dashboard), §7 (full checklist), §8 (order), §9 (decisions)
- `context/features/stripe-phase-1-spec.md` — the modules this phase consumes
- `src/app/api/collections/route.ts` — API-route conventions to mirror
- `src/lib/base-url.ts` — `getBaseUrl(request)` for success/cancel/return URLs
