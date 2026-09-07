# Stripe Subscription Integration Plan — DevStash Pro

> Research doc. No code was changed to produce this. Generated 2026-09-07.
>
> Goal: paid **DevStash Pro** subscription — **$8/mo** or **$72/yr** — that flips
> `User.isPro`, lifts the free-tier limits (50 items / 3 collections), and unlocks
> the Pro-only features. Checkout + Billing Portal hosted by Stripe; entitlement
> driven by **webhooks**, never by the checkout return URL.

---

## 1. Current-state analysis

### 1.1 `User` schema — already Stripe-ready

`prisma/schema.prisma` (lines 18-41):

```prisma
model User {
  id                   String    @id @default(cuid())
  ...
  isPro                Boolean   @default(false)
  stripeCustomerId     String?
  stripeSubscriptionId String?
  editorPreferences    Json?
  ...
}
```

- `isPro`, `stripeCustomerId`, `stripeSubscriptionId` **already exist** — no migration
  needed to start.
- Recommended small additions (one migration, see §3): `stripePriceId String?` and
  `stripeCurrentPeriodEnd DateTime?` so the webhook can persist which plan is active
  and when it renews/lapses, and `@unique` on `stripeCustomerId` so the webhook can
  `findUnique({ where: { stripeCustomerId } })`.
- The seed (`prisma/seed.ts`) sets the demo user `isPro: false` and never touches the
  Stripe columns — fine.

### 1.2 NextAuth v5 configuration & session handling

Split config (required so the edge proxy can run adapter-free):

| File | Role |
| --- | --- |
| `src/auth.config.ts` | Edge-safe slice — providers only (GitHub + Credentials placeholder), `pages.signIn`. No Prisma. |
| `src/auth.ts` | Full instance — `PrismaAdapter`, `session: { strategy: "jwt" }`, real bcrypt `authorize`, `jwt`/`session` callbacks. Exports `auth`, `handlers`, `signIn`, `signOut`. |
| `src/proxy.ts` | Next 16 middleware built from `authConfig` **only**. Gates `/dashboard`, `/favorites`, `/profile*`, `/settings*` on session presence. |
| `src/types/next-auth.d.ts` | Augments `Session.user` and `JWT` with `id`. |

Current callbacks (`src/auth.ts` lines 75-88):

```typescript
callbacks: {
  jwt({ token, user }) {
    if (user) token.id = user.id;
    return token;
  },
  session({ session, token }) {
    if (token.id) session.user.id = token.id as string;
    return session;
  },
},
```

**Key consequence for Stripe:** sessions are **JWT**, so a webhook that writes
`isPro` to the DB does **not** reach an existing session token. The token is only
minted at sign-in and mutated by the `jwt` callback. To make `isPro` reliable in
the session we must sync it from the DB inside `jwt()` (see §2, "auth.ts").

The edge `proxy.ts` uses `authConfig` without the Prisma adapter or the `jwt`
callback from `auth.ts`, so **middleware cannot see a fresh `isPro`**. That's fine
today (proxy only checks "is there a session"); do **not** try to gate Pro-only
routes in the proxy.

### 1.3 How user data is accessed

Two distinct scoping models coexist — **this matters a lot for feature gating**:

| Layer | Scope | Files |
| --- | --- | --- |
| **Dashboard data** (items, collections, tags, stats, search) | **Hard-coded demo user** `demo@devstash.io`, resolved by `getDemoUserId()` (`src/lib/db/user.ts`, wrapped in React `cache()`). The signed-in user is ignored. | `src/lib/db/items.ts`, `src/lib/db/collections.ts`, `src/lib/db/search.ts` |
| **Account data** (profile, settings, editor prefs) | **Session user**, `auth()` → `session.user.id`. | `src/lib/db/profile.ts`, `src/lib/db/editor-preferences.ts` |

`src/lib/db/profile.ts` is the pattern Stripe code should follow:

```typescript
export async function getProfileUser(userId: string): Promise<ProfileUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true,
              emailVerified: true, isPro: true, password: true, createdAt: true },
  });
  ...
}

export async function requireProfileUser(callbackPath: string): Promise<ProfileUser> {
  const session = await auth();
  const user = session?.user?.id ? await getProfileUser(session.user.id) : null;
  if (!user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackPath)}`);
  return user;
}
```

`ProfileUser` already carries `isPro`. `/profile` and `/settings` both call
`requireProfileUser(...)`.

> **⚠️ Architectural decision required before enforcing limits.**
> Item/collection creation writes to the **demo user**, not the signed-in user
> (`createItem` / `createCollection` in `src/lib/db/*` call `getDemoUserId()`).
> If we count "the demo user's items" for the 50-item limit, every signed-in
> account shares one budget — meaningless for real billing.
>
> **Recommendation:** make the limit-check helpers take an explicit `userId` and
> gate against **the session user's** counts. This is forward-compatible with the
> (clearly intended) future migration of the dashboard data layer to session
> scoping. Until that migration lands, the limit check is effectively
> observational for the demo user, but the billing plumbing (customer,
> subscription, `isPro`, portal) is fully correct because it keys off the real
> session user. Treat "scope items/collections to the session user" as a
> **prerequisite** for meaningful enforcement, and build the helpers `userId`-first
> now.

### 1.4 Existing subscription / payment code

**None.** No `stripe` import anywhere in `src/`. The `stripe` npm package is **not**
installed (`package.json`). `.env.example` (lines 58-63, currently an *uncommitted*
change on `main`) already stubs the env vars:

```
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRICE_ID_MONTHLY=""
STRIPE_PRICE_ID_YEARLY=""
```

---

## 2. Feature-gating analysis

### 2.1 Free-tier limits

From `context/project-overview.md` and mirrored in `src/lib/home-content.ts`:

```typescript
export const PRICING = {
  monthly: { amount: "$8", cycle: "/mo", period: "billed monthly" },
  yearly:  { amount: "$72", cycle: "/yr", period: "billed yearly ($6/mo)" },
};
export const FREE_FEATURES = ["Up to 50 items", "3 collections", "Full-text search",
  "Image uploads", "Markdown editor & dark mode"];
export const PRO_FEATURES = ["Unlimited items & collections", "File uploads & custom types",
  "AI tagging, summaries & Explain Code", "Prompt optimization", "Export to JSON / ZIP"];
```

So: **Free = 50 items, 3 collections, image uploads OK, no file uploads, no AI, no
custom types, no export.**

### 2.2 Where counts are / could be checked

**Today: nowhere.** No quota logic exists. Chokepoints to add it:

| Feature | Entry point | File | Add gate |
| --- | --- | --- | --- |
| Create item | `createItem` **server action** | `src/actions/items.ts` (lines 25-52) | after `auth()`, before `createItemQuery` |
| Create item (defense in depth) | `createItem` **query** | `src/lib/db/items.ts` (lines 383-434) | count check inside |
| Create collection | `POST /api/collections` | `src/app/api/collections/route.ts` (lines 40-76) | after `auth()`, before `createCollection` |
| Create collection (defense in depth) | `createCollection` **query** | `src/lib/db/collections.ts` (lines 271-285) | count check inside |

Counts available: `prisma.item.count({ where: { userId } })`,
`prisma.collection.count({ where: { userId } })` — already used by
`getItemStats` / `getCollectionStats` / `getProfileStats`. Add thin
`getUserItemCount(userId)` / `getUserCollectionCount(userId)`.

### 2.3 Pro-only features & where they live

| Pro feature | Current status | Gate location |
| --- | --- | --- |
| **File uploads** (`file` item type; `image` stays free) | `POST /api/upload` (`src/app/api/upload/route.ts`) only checks auth + R2 config. `NewItemDialog` (`src/components/items/NewItemDialog.tsx`) shows all 7 type pills with no gating. `Sidebar.tsx` already renders a decorative `PRO` badge next to Files/Images via `PRO_TYPE_NAMES`. | `POST /api/upload` — reject `kind === "file"` when `!isPro`; `createItem` action/query — reject `type === "file"` when `!isPro`; `NewItemDialog` — disable the `file` pill + show upsell when `!isPro`. |
| AI tagging / summaries / Explain Code / prompt optimization | Not built | n/a yet — gate when built |
| Custom item types | Not built (`ItemType.userId` column exists, no UI) | n/a yet |
| Export (JSON / ZIP) | Not built | n/a yet |

`image` uploads are a **free** feature per `FREE_FEATURES`, so gate on
`kind === "file"` specifically, not on `isFileItemType()`.

### 2.4 Settings page structure

`src/app/settings/page.tsx` — `force-dynamic`, `<main className="mx-auto max-w-2xl p-6">`,
"Back to dashboard" link, then two `<section className="mt-8 space-y-4">` blocks:

1. **Editor preferences** — card wrapping `<EditorPreferencesProvider><EditorPreferencesForm/></EditorPreferencesProvider>`.
2. **Account** — password card (`<ChangePasswordForm/>`, only if `user.hasPassword`) + delete-account card (`<DeleteAccountDialog/>`).

Card pattern: `rounded-xl border border-border bg-card p-4`, `text-sm font-medium`
title, `text-sm text-muted-foreground` blurb, `mt-3` control.

`requireProfileUser("/settings")` already loads `isPro`. **Add a "Plan & billing"
`<section>`** between Editor preferences and Account.

`/profile` page shows `{user.isPro ? "Pro" : "Free"} plan` as a badge (line 51) and
links to `/settings` for account actions — the billing UI belongs on `/settings`.

---

## 3. API & webhook patterns to follow

### 3.1 API route conventions

From `src/app/api/**/route.ts` (e.g. `collections/route.ts`, `auth/register/route.ts`):

- `export async function POST(request: Request)`.
- Auth guard: `const session = await auth(); if (!session?.user?.id) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });`
- Body parsing via `src/lib/api/request.ts`: `readJsonBody`, `INVALID_JSON`,
  `invalidJsonResponse()`, `validationErrorResponse(zodError, message)`.
- Validation: Zod schema in `src/lib/validations/*`, `schema.safeParse(body)`.
- Success: `NextResponse.json({ success: true, data }, { status: 200 | 201 })`.
- Errors: `try/catch` → `console.error(...)` → `NextResponse.json({ success: false, error }, { status: 500 })`.
- Established divergence: **collection mutations are API routes** (plain fetch
  endpoints for client dialogs); **item mutations are Server Actions**. Stripe
  checkout / portal / webhook all fit the **API-route** side (redirects to Stripe,
  external callbacks, raw-body needs).

Client fetch helper: `postJson(url, body, method?)` in `src/lib/post-json.ts`
(defaults to POST; supports PATCH/DELETE).

### 3.2 Server Action conventions

From `src/actions/items.ts` / `src/actions/editor-preferences.ts`:

```typescript
"use server";
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
```

`auth()` guard → Zod `safeParse` → `try/catch` → generic error string.

### 3.3 Environment-variable pattern

- Server-only unless prefixed `NEXT_PUBLIC_`. `STRIPE_PUBLISHABLE_KEY` is only
  needed if we ever mount Stripe.js/Elements — **hosted Checkout needs only the
  secret key**, so a publishable key isn't required for this plan (keep the stub,
  leave blank).
- **Lazy singleton + graceful disable** — copy `getRedis()` in `src/lib/rate-limit.ts`:

```typescript
let stripe: Stripe | null | undefined; // undefined = unresolved, null = no key

export function getStripe(): Stripe | null {
  if (stripe !== undefined) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  stripe = key ? new Stripe(key) : null;
  if (!stripe) console.warn("[stripe] STRIPE_SECRET_KEY not set — billing disabled.");
  return stripe;
}
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
```

- Absolute URLs (Checkout `success_url` / `cancel_url`, portal `return_url`): use
  `getBaseUrl(request)` from `src/lib/base-url.ts` (prefers
  `AUTH_URL` / `NEXT_PUBLIC_APP_URL`, else forwarded host).

### 3.4 Prisma / migrations

- Singleton `src/lib/prisma.ts`; generated client `@/generated/prisma/client`;
  `import { Prisma } from "@/generated/prisma/client"` for error codes (`P2002`).
- **`prisma migrate dev`** only (never `db push`), timestamped dirs under
  `prisma/migrations/`. Datasource URL lives in `prisma.config.ts` (`env("DATABASE_URL")`),
  pointed at the Neon **`development`** branch. `npm run build` runs `prisma generate`.
- Deploy: `prisma migrate deploy` before app start (see `context/coding-standards.md`).

### 3.5 Testing conventions

- Vitest, `npm run test`; runner only collects `src/{actions,lib}/**/*.test.ts`.
- Mock `@/lib/prisma` and `@/auth` with `vi.mock`; env via `vi.stubEnv` +
  `vi.unstubAllEnvs()` in `afterEach`. Node env, no DOM.
- So: **unit-test `src/lib/stripe/*` helpers and any new `src/actions/*`**. The
  checkout/portal/webhook **API routes are not in the test globs** (consistent with
  every other route in the repo) — verify them with the Stripe CLI (§6).

---

## 4. Files to create

### 4.1 `src/lib/stripe/client.ts`

```typescript
import Stripe from "stripe";

// Lazy singleton, mirrors getRedis() in src/lib/rate-limit.ts. Fails soft: when
// STRIPE_SECRET_KEY is unset the billing endpoints return 503 instead of crashing.
let stripe: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (stripe !== undefined) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  // Pin apiVersion to whatever `stripe` ships as `Stripe.LATEST_API_VERSION` at
  // install time; letting the SDK default is fine for a fresh integration.
  stripe = key ? new Stripe(key) : null;
  if (!stripe) {
    console.warn("[stripe] STRIPE_SECRET_KEY not set — billing is disabled.");
  }
  return stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
```

### 4.2 `src/lib/stripe/plans.ts`

```typescript
export type BillingInterval = "monthly" | "yearly";

/** Free-tier ceilings. Pro = Infinity. Numbers mirror context/project-overview.md. */
export const PLAN_LIMITS = {
  free: { items: 50, collections: 3 },
  pro:  { items: Infinity, collections: Infinity },
} as const;

export function priceIdForInterval(interval: BillingInterval): string | null {
  return interval === "monthly"
    ? (process.env.STRIPE_PRICE_ID_MONTHLY ?? null)
    : (process.env.STRIPE_PRICE_ID_YEARLY ?? null);
}

export function intervalForPriceId(priceId: string | null | undefined): BillingInterval | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_ID_YEARLY) return "yearly";
  return null;
}

/** A Stripe subscription status that should grant Pro access. */
export function isActiveStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}
```

Unit test: `plans.test.ts` — `priceIdForInterval` / `intervalForPriceId` round-trip
under `vi.stubEnv`, unknown price → `null`, `isActiveStatus` truth table,
`PLAN_LIMITS.free` values are 50 / 3.

### 4.3 `src/lib/stripe/limits.ts`

```typescript
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/stripe/plans";

export interface LimitCheck {
  allowed: boolean;
  /** null when unlimited (Pro). */
  limit: number | null;
  current: number;
}

export async function checkItemLimit(userId: string, isPro: boolean): Promise<LimitCheck> {
  if (isPro) return { allowed: true, limit: null, current: 0 };
  const current = await prisma.item.count({ where: { userId } });
  return { allowed: current < PLAN_LIMITS.free.items, limit: PLAN_LIMITS.free.items, current };
}

export async function checkCollectionLimit(userId: string, isPro: boolean): Promise<LimitCheck> {
  if (isPro) return { allowed: true, limit: null, current: 0 };
  const current = await prisma.collection.count({ where: { userId } });
  return { allowed: current < PLAN_LIMITS.free.collections, limit: PLAN_LIMITS.free.collections, current };
}

export function limitErrorMessage(kind: "item" | "collection", check: LimitCheck): string {
  return `You've reached the free plan limit of ${check.limit} ${kind}s. Upgrade to DevStash Pro for unlimited ${kind}s.`;
}
```

> `userId`-first so it's correct once the dashboard data layer is session-scoped.
> Until then, callers pass `getDemoUserId()` (interim) — see §1.3 decision.

Unit test: `limits.test.ts` — mock `@/lib/prisma`; Pro short-circuits with no
`count` call; free under limit → `allowed: true`; free at limit → `allowed: false`;
message formatting.

### 4.4 `src/lib/stripe/subscription.ts`

Single writer that maps a Stripe subscription onto the `User` row. Called only by
the webhook.

```typescript
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/client";
import { intervalForPriceId, isActiveStatus } from "@/lib/stripe/plans";

/**
 * Re-read the subscription for a customer from Stripe (source of truth) and
 * write isPro / stripeSubscriptionId / stripePriceId / stripeCurrentPeriodEnd
 * onto the matching User. Safe to call for any relevant event — it always
 * reconciles to Stripe's current state, so webhook ordering / replays don't matter.
 */
export async function syncSubscriptionForCustomer(customerId: string): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;

  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) {
    console.warn(`[stripe] webhook for unknown customer ${customerId}`);
    return;
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId, status: "all", limit: 1,
  });
  const sub: Stripe.Subscription | undefined = subs.data[0];

  if (!sub || sub.status === "canceled" || sub.status === "incomplete_expired") {
    await prisma.user.update({
      where: { id: user.id },
      data: { isPro: false, stripeSubscriptionId: null, stripePriceId: null,
              stripeCurrentPeriodEnd: null },
    });
    return;
  }

  const priceId = sub.items.data[0]?.price.id ?? null;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      isPro: isActiveStatus(sub.status),
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  });
  void intervalForPriceId(priceId); // available for display if needed
}
```

Not unit-tested (touches the live Stripe SDK); covered by the Stripe CLI checklist.

### 4.5 `src/lib/validations/billing.ts`

```typescript
import { z } from "zod";

export const checkoutSchema = z.object({
  interval: z.enum(["monthly", "yearly"]),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
```

Unit test: `billing.test.ts` — accepts `monthly` / `yearly`, rejects anything else /
missing.

### 4.6 `src/app/api/stripe/checkout/route.ts`

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { priceIdForInterval } from "@/lib/stripe/plans";
import { getBaseUrl } from "@/lib/base-url";
import { checkoutSchema } from "@/lib/validations/billing";
import {
  INVALID_JSON, invalidJsonResponse, readJsonBody, validationErrorResponse,
} from "@/lib/api/request";

/**
 * POST /api/stripe/checkout  { interval: "monthly" | "yearly" }
 * -> { success: true, data: { url } }  (client does window.location = url)
 *
 * Creates (or reuses) the Stripe customer for the signed-in user, then opens a
 * subscription Checkout Session. Entitlement is granted later by the webhook, not
 * by the success_url.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  const stripe = getStripe();
  if (!stripe || !isStripeConfigured()) {
    return NextResponse.json({ success: false, error: "Billing is not configured." }, { status: 503 });
  }

  const body = await readJsonBody(request);
  if (body === INVALID_JSON) return invalidJsonResponse();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid billing selection");

  const priceId = priceIdForInterval(parsed.data.interval);
  if (!priceId) {
    return NextResponse.json({ success: false, error: "That plan is unavailable." }, { status: 503 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, isPro: true, stripeCustomerId: true },
  });
  if (!user) {
    return NextResponse.json({ success: false, error: "Account not found." }, { status: 404 });
  }
  if (user.isPro) {
    return NextResponse.json({ success: false, error: "You're already on Pro." }, { status: 409 });
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const origin = getBaseUrl(request);
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { userId: user.id } },
    allow_promotion_codes: true,
    success_url: `${origin}/settings?checkout=success`,
    cancel_url: `${origin}/settings?checkout=cancelled`,
  });

  return NextResponse.json({ success: true, data: { url: checkout.url } });
}
```

### 4.7 `src/app/api/stripe/portal/route.ts`

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { getBaseUrl } from "@/lib/base-url";

/**
 * POST /api/stripe/portal -> { success: true, data: { url } }
 * Opens the Stripe-hosted Billing Portal (update card, change plan, cancel).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  const stripe = getStripe();
  if (!stripe || !isStripeConfigured()) {
    return NextResponse.json({ success: false, error: "Billing is not configured." }, { status: 503 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { success: false, error: "No billing account yet — upgrade first." },
      { status: 409 },
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getBaseUrl(request)}/settings`,
  });
  return NextResponse.json({ success: true, data: { url: portal.url } });
}
```

### 4.8 `src/app/api/stripe/webhook/route.ts`

```typescript
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { syncSubscriptionForCustomer } from "@/lib/stripe/subscription";

// Must run on Node (raw body + crypto for signature verification).
export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 *
 * Public (Stripe calls it), but authenticated by the Stripe-Signature header via
 * webhooks.constructEvent. NOT covered by src/proxy.ts (only /dashboard, /profile,
 * /settings, /favorites are matched) — keep it that way.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const payload = await request.text(); // raw body — do NOT request.json()
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error("[stripe] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.customer) await syncSubscriptionForCustomer(s.customer as string);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionForCustomer(sub.customer as string);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.customer) await syncSubscriptionForCustomer(inv.customer as string);
        break;
      }
      default:
        break; // ignore everything else
    }
  } catch (err) {
    console.error(`[stripe] handler failed for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 }); // Stripe retries
  }

  return NextResponse.json({ received: true });
}
```

Because `syncSubscriptionForCustomer` always re-reads Stripe and reconciles, the
handler is naturally **idempotent** and order-independent — no need to persist
processed event ids for v1.

### 4.9 `src/components/settings/BillingSection.tsx` (client)

```typescript
"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postJson } from "@/lib/post-json";
import { PRICING } from "@/lib/home-content";

interface Props {
  isPro: boolean;
  hasCustomer: boolean;
}

export function BillingSection({ isPro, hasCustomer }: Props) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [pending, setPending] = useState(false);

  async function go(path: string, body?: unknown) {
    setPending(true);
    try {
      const res = await postJson<{ data: { url: string } }>(path, body);
      window.location.assign(res.data.url);
    } catch {
      toast.error("Could not reach billing. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium">{isPro ? "DevStash Pro" : "Free plan"}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {isPro
          ? "Unlimited items & collections, file uploads, and every Pro feature."
          : "50 items, 3 collections, image uploads. Upgrade for unlimited everything."}
      </p>

      <div className="mt-3">
        {isPro ? (
          <Button size="sm" variant="outline" disabled={pending || !hasCustomer}
                  onClick={() => go("/api/stripe/portal")}>
            Manage billing
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Billing period"
                 className="inline-flex rounded-full border border-border p-0.5">
              {(["monthly", "yearly"] as const).map((o) => (
                <button key={o} type="button" aria-pressed={interval === o}
                        onClick={() => setInterval(o)}
                        className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize",
                          interval === o ? "bg-muted" : "text-muted-foreground")}>
                  {o} · {PRICING[o].amount}{PRICING[o].cycle}
                </button>
              ))}
            </div>
            <Button size="sm" disabled={pending}
                    onClick={() => go("/api/stripe/checkout", { interval })}>
              Upgrade to Pro
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

*(Check `postJson`'s exact generic/return signature in `src/lib/post-json.ts` and
adjust — it may return the parsed body directly.)*

### 4.10 Test files

- `src/lib/stripe/plans.test.ts`
- `src/lib/stripe/limits.test.ts`
- `src/lib/validations/billing.test.ts`

*(No test for the API routes / `subscription.ts` — matches repo convention; the
Stripe CLI checklist in §6 covers them.)*

---

## 5. Files to modify

### 5.1 `package.json`

Add dependency:

```
npm install stripe
```

(`stripe` v19+ — Node SDK. No `@stripe/stripe-js` needed for hosted Checkout.)

### 5.2 `prisma/schema.prisma` + migration

```prisma
model User {
  ...
  isPro                  Boolean   @default(false)
  stripeCustomerId       String?   @unique          // + @unique
  stripeSubscriptionId   String?
  stripePriceId          String?                    // NEW
  stripeCurrentPeriodEnd DateTime?                   // NEW
  ...
}
```

```
npx prisma migrate dev --name add_stripe_subscription_fields
```

(Targets the Neon `development` branch per `prisma.config.ts`. Run
`prisma migrate deploy` on prod.)

### 5.3 `src/auth.ts` — sync `isPro` into the session

Per the research note: `trigger === "update"` is unreliable when the change
originates from a webhook, so **always** hydrate `isPro` from the DB in `jwt()`.

```typescript
import { prisma } from "@/lib/prisma"; // already imported

callbacks: {
  async jwt({ token, user }) {
    if (user) token.id = user.id;
    // Always re-sync isPro so a webhook-driven DB change is picked up on the
    // next request (a page reload after checkout is enough). Costs one indexed
    // findUnique per auth() call — acceptable for this app's traffic.
    if (token.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { isPro: true },
      });
      token.isPro = dbUser?.isPro ?? false;
    }
    return token;
  },
  session({ session, token }) {
    if (token.id) session.user.id = token.id as string;
    session.user.isPro = Boolean(token.isPro);
    return session;
  },
},
```

**Trade-off / alternatives to note:**
- This adds a DB round-trip to every `auth()` call. For lower cost: only query when
  `token.isPro === undefined` **or** `trigger === "update"`, and have
  `BillingSection` / the `/settings?checkout=success` landing call
  `useSession().update()` — but the note already found `update()` unreliable for
  webhook-origin changes, so the always-sync version is the safe default.
- The edge `proxy.ts` won't see `token.isPro` (different NextAuth instance, no
  Prisma). Don't gate routes on Pro in middleware; gate in the page/action/route.

### 5.4 `src/types/next-auth.d.ts`

```typescript
declare module "next-auth" {
  interface Session {
    user: { id: string; isPro: boolean } & DefaultSession["user"];
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isPro?: boolean;
  }
}
```

### 5.5 `src/actions/items.ts` — enforce the item limit

In `createItem`, after the `auth()` guard and Zod parse, before `createItemQuery`:

```typescript
import { checkItemLimit, limitErrorMessage } from "@/lib/stripe/limits";
// ...
const gateUserId = session.user.id;           // see §1.3 — switch off getDemoUserId
const isPro = Boolean(session.user.isPro);    // now available from §5.3
const limit = await checkItemLimit(gateUserId, isPro);
if (!limit.allowed) {
  return { success: false, error: limitErrorMessage("item", limit) };
}

// Pro-only: file uploads (image stays free)
if (parsed.data.type === "file" && !isPro) {
  return { success: false, error: "File uploads are a Pro feature. Upgrade to attach files." };
}
```

> If the data layer is still demo-user-scoped at implementation time, pass
> `await getDemoUserId()` here as an interim and leave a `TODO` — the limit is
> then correct the moment items become session-scoped.

### 5.6 `src/lib/db/items.ts` — defense-in-depth + count helper

Add:

```typescript
export async function getUserItemCount(userId: string): Promise<number> {
  return prisma.item.count({ where: { userId } });
}
```

Optionally re-check the limit inside `createItem` query too (belt-and-braces, like
`ownedCollectionIds` validating client input).

### 5.7 `src/app/api/collections/route.ts` — enforce the collection limit

In `POST`, after `auth()` + `safeParse`, before `createCollection`:

```typescript
import { checkCollectionLimit, limitErrorMessage } from "@/lib/stripe/limits";
// need isPro — fetch alongside, or read session.user.isPro (§5.3)
const check = await checkCollectionLimit(session.user.id, Boolean(session.user.isPro));
if (!check.allowed) {
  return NextResponse.json({ success: false, error: limitErrorMessage("collection", check) }, { status: 403 });
}
```

Add `getUserCollectionCount(userId)` to `src/lib/db/collections.ts`.

### 5.8 `src/app/api/upload/route.ts` — gate `file` uploads on Pro

After the auth guard:

```typescript
// `kind` is parsed just below as "image" | "file". image uploads are free; file
// uploads are Pro.
if (kind === "file") {
  const { prisma } = await import("@/lib/prisma");
  const u = await prisma.user.findUnique({
    where: { id: session.user.id }, select: { isPro: true },
  });
  if (!u?.isPro) {
    return NextResponse.json(
      { success: false, error: "File uploads are a Pro feature." },
      { status: 403 },
    );
  }
}
```

*(Or read `session.user.isPro` once §5.3 lands — avoids the extra query.)*

### 5.9 `src/components/items/NewItemDialog.tsx` — surface the gate

- Accept an `isPro` prop (thread from a server component — the dialog is opened
  from `TopBar` inside `DashboardShell`; `dashboard/layout.tsx` already
  `await auth()`s, so pass `session.user.isPro` down, or read via a small
  `<SessionProvider>` / server prop).
- Disable the `file` type pill when `!isPro`, with a "Pro" badge + a link to
  `/settings`. Leave `image` enabled.
- This is UX only — the server action / upload route are the real gate.

### 5.10 `src/app/settings/page.tsx` — add the billing section

```tsx
import { BillingSection } from "@/components/settings/BillingSection";
// user already comes from requireProfileUser("/settings") and has isPro.
// Add a stripeCustomerId flag:
//   in getProfileUser select, add `stripeCustomerId: true` and expose
//   `hasStripeCustomer: user.stripeCustomerId !== null` on ProfileUser.

<section className="mt-8 space-y-4">
  <h2 className="text-sm font-medium text-muted-foreground">Plan &amp; billing</h2>
  <BillingSection isPro={user.isPro} hasCustomer={user.hasStripeCustomer} />
</section>
```

Optionally read `?checkout=success|cancelled` from `searchParams` to show a
`sonner` toast on return from Stripe.

### 5.11 `src/lib/db/profile.ts` — expose customer presence

Add `stripeCustomerId: true` to the `getProfileUser` select; add
`hasStripeCustomer: boolean` to `ProfileUser` (don't leak the raw id further than
needed). Update `src/lib/db/profile.test.ts` fixtures.

### 5.12 `src/components/home/PricingPlans.tsx` (optional, phase 2)

For a signed-in visitor, swap the Pro card's `<Link href="/register">Go Pro</Link>`
for a button that POSTs `/api/stripe/checkout` with the toggled `period`. Needs the
component to know `signedIn` (already available on the homepage via `auth()` — thread
a prop). Signed-out keeps `/register`.

### 5.13 `.env.example`

Already stubs the five `STRIPE_*` vars (currently uncommitted on `main`). Commit
them with this feature. Add a short comment block matching the file's style, e.g.:

```
# Stripe — subscription billing (DevStash Pro).
#   STRIPE_SECRET_KEY        — sk_test_… / sk_live_…  (Developers > API keys)
#   STRIPE_WEBHOOK_SECRET    — whsec_…  (from `stripe listen` locally, or the
#                              webhook endpoint's signing secret in the Dashboard)
#   STRIPE_PRICE_ID_MONTHLY  — price_…  ($8/mo recurring price)
#   STRIPE_PRICE_ID_YEARLY   — price_…  ($72/yr recurring price)
#   STRIPE_PUBLISHABLE_KEY   — pk_test_… (only needed if Stripe.js/Elements is
#                              added later; hosted Checkout does not require it)
# Leave STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET blank to disable billing — the
# endpoints then return 503 and nothing else breaks.
```

### 5.14 `context/current-feature.md`

Per the project workflow (`context/ai-interaction.md`), document the feature here
before implementing and move it to History when done. Out of scope for this
research doc.

---

## 6. Stripe Dashboard setup

All in **Test mode** first.

1. **Product & prices**
   - Products → **Add product** → name `DevStash Pro`.
   - Add price **$8.00 USD / recurring / monthly** → copy the `price_…` →
     `STRIPE_PRICE_ID_MONTHLY`.
   - Add another price to the same product **$72.00 USD / recurring / yearly** →
     copy → `STRIPE_PRICE_ID_YEARLY`.
2. **API keys** — Developers → API keys → copy **Secret key** → `STRIPE_SECRET_KEY`.
   (Publishable key optional for this plan.)
3. **Billing Portal** — Settings → Billing → **Customer portal** → activate. Allow
   customers to: update payment method, cancel subscriptions, switch between the
   monthly/yearly `DevStash Pro` prices. Set the default return URL to
   `https://<domain>/settings`.
4. **Webhook endpoint** (for deployed envs) — Developers → Webhooks → **Add
   endpoint** → URL `https://<domain>/api/stripe/webhook`. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   Copy the **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET` for that env.
5. **Local dev** — install the Stripe CLI, `stripe login`, then:
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Use the `whsec_…` it prints as your local `STRIPE_WEBHOOK_SECRET`.
6. **Env** — fill `.env` (dev) and the Vercel/host env (prod). Restart
   `npm run dev` after editing `.env` (Prisma/Next read it at boot).
7. **Go live** — redo product/prices/webhook in Live mode, swap in `sk_live_…` /
   live `price_…` / live `whsec_…`.

---

## 7. Testing checklist

### Unit (`npm run test`)
- [ ] `plans.test.ts` — `priceIdForInterval` / `intervalForPriceId` round-trip
      under `vi.stubEnv`; unknown price → `null`; `isActiveStatus`; `PLAN_LIMITS.free`
      = 50 / 3.
- [ ] `limits.test.ts` — Pro short-circuits (no `count` call); free under/at limit;
      `limitErrorMessage` text.
- [ ] `billing.test.ts` — `checkoutSchema` accepts `monthly`/`yearly`, rejects other.
- [ ] `profile.test.ts` — updated fixtures still pass with the new select field.
- [ ] `npm run lint` + `npm run build` clean (`build` runs `prisma generate`).

### Integration (Stripe CLI + browser, test mode)
- [ ] `stripe listen …` running; `getStripe()` warns-and-disables cleanly when the
      key is unset (endpoints return 503, app otherwise fine).
- [ ] **Upgrade (monthly):** `/settings` → "Upgrade to Pro" → Stripe Checkout →
      card `4242 4242 4242 4242`, any future expiry / CVC / ZIP → redirected to
      `/settings?checkout=success`.
- [ ] Webhook `checkout.session.completed` + `customer.subscription.created`
      received; `User.isPro = true`, `stripeCustomerId`, `stripeSubscriptionId`,
      `stripePriceId`, `stripeCurrentPeriodEnd` all populated (check via Neon MCP on
      the `development` branch).
- [ ] After a **page reload**, session reflects Pro (`session.user.isPro` true;
      `/profile` badge shows "Pro"; §5.3 sync working).
- [ ] **Upgrade (yearly)** path sets `stripePriceId` to the yearly price.
- [ ] **Limits — free user:** create items up to 50 → 51st blocked with the upsell
      message; create collections up to 3 → 4th blocked. (Scope caveat from §1.3
      applies — verify against whichever `userId` the gate uses.)
- [ ] **Limits — Pro user:** 51st item / 4th collection succeed.
- [ ] **File upload:** free user selecting the `file` type / hitting `/api/upload`
      with `kind=file` → 403; `image` upload still works for free; Pro user → both work.
- [ ] **Manage billing:** Pro user → "Manage billing" → Stripe Portal → **Cancel
      subscription** → `customer.subscription.updated` (cancel_at_period_end) then,
      at period end (simulate: `stripe trigger customer.subscription.deleted`) →
      `User.isPro = false`, sub fields cleared.
- [ ] **Payment failure:** `stripe trigger invoice.payment_failed` → handler runs,
      `syncSubscriptionForCustomer` reconciles (status `past_due` → `isPro` per
      `isActiveStatus`, i.e. false).
- [ ] **Idempotency / ordering:** re-send the same event (`stripe events resend
      <id>`); state unchanged, no error. Deliver `subscription.updated` before
      `checkout.session.completed`; final state still correct.
- [ ] **Bad signature:** POST `/api/stripe/webhook` with a garbage
      `stripe-signature` → 400, no DB write.
- [ ] **No-customer portal:** brand-new free user → "Manage billing" disabled /
      409 "upgrade first".
- [ ] **Already Pro:** hitting `/api/stripe/checkout` while `isPro` → 409.
- [ ] **Unauthed:** `/api/stripe/checkout` and `/portal` without a session → 401;
      `/api/stripe/webhook` is NOT behind `proxy.ts` (stays publicly reachable).
- [ ] Account deletion (`POST /api/auth/delete-account`) while subscribed — decide
      & test: either cancel the Stripe subscription in that route first, or accept
      an orphaned Stripe customer. (Recommend: best-effort
      `stripe.subscriptions.cancel` before `prisma.user.delete`.)

---

## 8. Implementation order

**Phase 1 — plumbing (no UI):**
1. `npm install stripe`.
2. Schema migration (§5.2): `@unique` on `stripeCustomerId`, add `stripePriceId` +
   `stripeCurrentPeriodEnd`.
3. `src/lib/stripe/client.ts`, `plans.ts` (+ test), `subscription.ts`.
4. `src/lib/validations/billing.ts` (+ test).
5. `src/app/api/stripe/webhook/route.ts`.
6. Stripe Dashboard test-mode setup (§6) + `stripe listen`; verify a manual
   `stripe trigger checkout.session.completed` reaches the handler.

**Phase 2 — checkout & session:**
7. `src/app/api/stripe/checkout/route.ts` + `portal/route.ts`.
8. `src/auth.ts` JWT `isPro` sync + `next-auth.d.ts` (§5.3-5.4).
9. `src/lib/db/profile.ts` expose `hasStripeCustomer` (+ test fixtures).
10. `BillingSection.tsx` + wire into `src/app/settings/page.tsx`.
11. Full upgrade → webhook → reload → Pro round-trip green.

**Phase 3 — enforce limits & Pro features:**
12. `src/lib/stripe/limits.ts` (+ test); `getUserItemCount` / `getUserCollectionCount`.
13. Gate `createItem` action (§5.5) + `POST /api/collections` (§5.7).
14. Gate `POST /api/upload` for `kind === "file"` (§5.8); `NewItemDialog` UX (§5.9).
15. Decide the §1.3 scope question (session-scoped vs interim demo-user) and land
    the matching `userId` wiring.

**Phase 4 — polish (optional):**
16. Homepage `PricingPlans` "Go Pro" → checkout for signed-in visitors (§5.12).
17. `?checkout=success|cancelled` toast on `/settings`.
18. Cancel Stripe subscription inside `delete-account` route.
19. `.env.example` comments (§5.13); `context/current-feature.md` → History.

---

## 9. Open questions / decisions

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | Limit enforcement scopes to which user, given the demo-user data layer? | Build helpers `userId`-first; gate on the **session user**; treat "session-scope the dashboard data layer" as the real prerequisite. |
| 2 | Always-sync `isPro` in the JWT callback (one DB read per `auth()`) vs. `trigger === "update"`? | Always-sync (the research note found `update()` unreliable for webhook-origin changes). Revisit if `auth()` call volume becomes a concern. |
| 3 | Store processed webhook event ids for idempotency? | Not for v1 — `syncSubscriptionForCustomer` re-reads Stripe and is idempotent by construction. Add an `event.id` table later if adding non-reconciling handlers. |
| 4 | `stripePriceId` + `stripeCurrentPeriodEnd` columns — worth the migration? | Yes — cheap, and lets `/settings` show "Pro (yearly) · renews Mar 3" without a Stripe round-trip. |
| 5 | Cancel Stripe subscription on account deletion? | Yes, best-effort before `prisma.user.delete`. |
| 6 | Publishable key needed? | No — hosted Checkout only needs the secret key. Keep the stub blank. |
| 7 | Proration when switching monthly ↔ yearly? | Leave to the Stripe Billing Portal's default proration; no app code. |
