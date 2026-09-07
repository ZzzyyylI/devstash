# Homepage — Real App Route

Turn the static mock-up in `prototypes/homepage/` into the actual marketing homepage at
`/` (`src/app/page.tsx`), using the project's stack (Next server/client components,
Tailwind v4, shadcn `Button`, `lucide-react`, existing theme tokens).

The prototype stays where it is — it is the visual reference, not code to import.

---

## Goals

- Replace the placeholder `src/app/page.tsx` with the full homepage.
- Faithfully reproduce the prototype's sections, layout, copy, and responsive behavior.
- Split into server components by default; `"use client"` only where there is
  interactivity (nav scroll state, chaos animation, pricing toggle, scroll-reveal).
- No inline styles (coding standard) except the imperative `el.style.transform`
  writes inside the requestAnimationFrame loop.
- Keep it DRY — section content lives in one shared data module, repeated markup
  (section heading, feature card) is a single component.

## Non-goals

- No new routes, no auth changes, no DB work, no changes to `/dashboard`.
- Not deleting or wiring up `prototypes/homepage/`.
- No mobile hamburger menu (prototype has none).

---

## Files

### Route
- `src/app/page.tsx` — **server component**. Exports `metadata` (title +
  description from the prototype `<head>`). Composes the sections in order:
  `HomeNav`, `Hero`, `FeaturesSection`, `AiSection` (`id="ai"`),
  `HowItWorksSection`, `PricingSection`, `CtaSection`, `HomeFooter`.
  May call `auth()` and pass `signedIn` down so the nav / hero primary CTA can
  read "Go to dashboard" → `/dashboard` instead of "Get started" → `/register`
  (recommended, optional).

### Shared content — `src/lib/home-content.ts`
Plain data + types, no JSX. Single source of truth for:
- `ITEM_TYPES` — the seven types with their prototype hex and the matching
  Tailwind classes for icon color + card top-border, e.g.
  `{ name: "Snippet", hex: "#3b82f6", icon: "text-[#3b82f6]", topBorder: "border-t-[#3b82f6]" }`
  (arbitrary-value classes are static strings, so JIT picks them up — no inline style).
- `FEATURES` — 6 entries `{ title, blurb, typeName, icon }` (lucide icon component),
  mapping to a color via `ITEM_TYPES`.
- `AI_CAPABILITIES` — 4 checklist strings.
- `HOW_STEPS` — 3 `{ title, blurb }`.
- `PRICING` — `{ monthly: { amount, cycle, period }, yearly: {…} }` (values from
  `script.js` `PRICES`), plus `FREE_FEATURES` / `PRO_FEATURES` string lists.
- `FOOTER_COLUMNS` — `{ heading, links: { label, href }[] }[]`.
- `CHAOS_SOURCES` — labels for the 8 scattered-tool icons.

### Components — `src/components/home/`
- `SectionHeading.tsx` (server) — `{ title, subtitle }`, the centered
  `.section__head` pattern.
- `FeatureCard.tsx` (server) — one `FEATURES` entry; accent color from its type.
- `HomeNav.tsx` (**client**) — fixed top nav. `useEffect` scroll listener toggles
  a "scrolled" state → adds `bg-background/80 backdrop-blur border-b border-border`
  (transparent at top). Logo → `/` / `#top`; Features → `#features`;
  Pricing → `#pricing`; Sign In → `/sign-in`; Get Started → `/register`
  (or Dashboard when `signedIn`). Buttons use `<Button asChild>` + `next/link`.
  Below `sm`, the Features/Pricing link group hides; action buttons stay,
  padding tightens (match prototype).
- `Hero.tsx` (server) — pill, `<h1>` with the gradient `<span>` (Tailwind
  `bg-gradient-to-r from-[#3b82f6] to-[#6366f1] bg-clip-text text-transparent`),
  sub-copy, two CTAs (`/register`, `#features`). Renders `<ChaosOrderFlow />`.
- `ChaosOrderFlow.tsx` (**client**) — the three-part "chaos → order" visual:
  1. **Chaos field** — 8 absolutely-positioned tool icons. Port `script.js`'s
     physics into a `useEffect`: `requestAnimationFrame` loop with per-icon
     position/velocity, wall bounce, drift, rotation + scale pulse, and
     cursor-repel (softer/​slower while hovering). Store nodes in a
     `useRef<HTMLDivElement[]>`; write `el.style.transform` directly. Read
     bounds from the container; `resize` listener re-measures. Bail out (static
     layout) when `matchMedia("(prefers-reduced-motion: reduce)")` matches.
     Cancel the frame + remove listeners on cleanup.
  2. **Arrow** — lucide `ArrowRight` in a pulsing wrapper (`animate-pulse` or a
     small keyframe); `max-md:rotate-90` to point down when stacked.
  3. **Dashboard preview** — static faux-app: mini sidebar nav list, a
     `Search… ⌘K` bar + `+ New` pill, and a 9-card grid where each card has a
     colored top border from `ITEM_TYPES` + skeleton bars. Pure markup.
  Container is a 3-column grid that collapses to 1 column at `max-md`.
- `FeaturesSection.tsx` (server) — `id="features"`, `SectionHeading` +
  `FEATURES.map(FeatureCard)` in a `sm:grid-cols-2 lg:grid-cols-3` grid.
- `AiSection.tsx` (server) — `id="ai"`. Two columns (`lg:grid-cols-2`):
  left = shadcn `Badge` "Pro Feature" + heading + lead + `AI_CAPABILITIES`
  checklist (lucide `Check`) + `<Button asChild>` "Unlock AI features" → `#pricing`.
  Right = a static editor mock: title bar with traffic-light dots +
  `debounce.ts`, a `font-mono` code block (plain text, no real highlighter —
  a few `<span>`s with token colors is fine), and an "AI Generated Tags" row of
  `Badge`s.
- `HowItWorksSection.tsx` (server) — `SectionHeading` + a `lg:grid-cols-2` row:
  left an ordered list of `HOW_STEPS` with numbered badges, right the mono
  "stage" panel (3 color-left-bordered rows). Static.
- `PricingSection.tsx` (server) — `id="pricing"`, `SectionHeading`, renders the
  **client** `<PricingPlans />`.
- `PricingPlans.tsx` (**client**) — `useState<"monthly" | "yearly">`. A segmented
  toggle (two `<button>`s, `aria-pressed`) drives the Pro card's amount / cycle /
  period from `PRICING`. Free card ($0, `FREE_FEATURES`, outline "Get started" →
  `/register`); Pro card is highlighted with a "Most Popular" `Badge`
  (`PRO_FEATURES`, primary "Go Pro" → `/register`).
- `CtaSection.tsx` (server) — heading, line, `<Button asChild size="lg">`
  "Create your stash" → `/register`.
- `HomeFooter.tsx` (server) — brand + tagline, `FOOTER_COLUMNS` link columns,
  `© {new Date().getFullYear()} DevStash`. Product column links to `#features` /
  `#pricing` / `#ai`; columns with no real destination render `#` placeholders.
- `Reveal.tsx` (**client**) — thin wrapper: `IntersectionObserver` adds an
  `opacity-100 translate-y-0` state (from `opacity-0 translate-y-2`) once in view,
  then disconnects. No-op (renders visible immediately) under reduced-motion.
  Wrap section heads / cards to match the prototype's fade-in.

---

## Styling notes

- Root layout already forces `.dark` and loads Geist Sans/Mono — no font work.
- Use theme tokens: `bg-background`, `text-foreground`, `text-muted-foreground`,
  `bg-card`, `border-border`. Accent colors come only from the `ITEM_TYPES`
  arbitrary-value classes.
- Reuse `Button` variants (`default`, `outline`, `ghost`, `link`) with `asChild`
  for every link-button; do not restyle from scratch.
- `scroll-behavior: smooth` + `scroll-padding-top` for the fixed nav: add via a
  utility class on a wrapper or a small rule already covered by
  `html { scroll-padding-top }` — keep it minimal.
- Guard against horizontal overflow (`overflow-x-clip` on the page wrapper).
- Optional: the ambient radial-gradient background glow as one fixed decorative
  `div` with Tailwind arbitrary gradients.

## Link map (must all resolve)

| Element | Target |
| --- | --- |
| Nav logo, footer logo | `/` |
| Nav "Features", "See Features", footer Product/Features | `#features` |
| Nav "Pricing", AI "Unlock AI features", footer Product/Pricing | `#pricing` |
| Footer Product/AI | `#ai` |
| Nav "Sign In" | `/sign-in` |
| Nav "Get Started", hero "Start for Free", both pricing buttons, CTA button | `/register` |
| Nav CTA when `signedIn` | `/dashboard` |
| Resources / Company footer links (no real page) | `#` |

---

## Testing

- No server actions or `src/lib` logic beyond static data, so no new Vitest
  suites are required. If any pure helper is added (e.g. a price formatter),
  co-locate a `*.test.ts` for it.
- Run `npm run lint` and `npm run build` — both must pass (watch for unused
  arbitrary classes being purged: keep them as literal strings in
  `home-content.ts`).
- Manual / Playwright verification mirroring the prototype check:
  - Every section renders at desktop (1280) and mobile (390); `scrollWidth ===
    clientWidth` at both.
  - Nav turns opaque after scrolling; all links/buttons navigate to the table above.
  - Pricing toggle swaps `$8/mo` ↔ `$72/yr` and the period line.
  - Chaos icons animate and repel from the cursor; `prefers-reduced-motion`
    disables the loop (icons static, no console errors).
  - Chaos/arrow/preview stack vertically and the arrow rotates to point down at
    `max-md`.

## Workflow

Document → branch `feature/homepage` → implement → verify in browser +
lint/build → commit (with permission) → merge to `main` → delete branch →
mark complete in `context/current-feature.md` history.
