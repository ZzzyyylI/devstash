# Current Feature

<!-- Feature Name -->

_None — ready for the next feature._

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

Replace the dummy collection data in the dashboard's main area with real data from
the database, per `@context/features/dashboard-collections-spec.md`.

- Replace the dummy collection data displayed in the main area of the dashboard
  (right side) with actual data from the database — same 6 recent-collection cards,
  now sourced from Neon via Prisma instead of `src/lib/mock-data.ts`.
- Do not add the items underneath the collections yet — that's a later feature.
- Create `src/lib/db/collections.ts` with data fetching functions.
- Fetch collections directly in the server component.
- Collection card border color is derived from the most-used content type in that
  collection.
- Show small icons for all item types present in that collection.
- Keep the current design (reference `context/screenshots/dashboard-ui-main.png`
  if needed) — layout and design are already established.
- Update the collection stats display.

## Notes

<!-- Any extra notes -->

- `StatsSection`'s "Collections" and "Favorite collections" counts still read
  `mockCollections` — out of scope here (spec only covered the 6-card collections
  grid), left as a follow-up.

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Initial Next.js and Tailwind setup committed and pushed to GitHub
- Dashboard UI Phase 1 — ShadCN init (radix-nova preset) + button/input components, `/dashboard` route with layout shell, dark mode by default, display-only top bar (search + New Collection/New Item), placeholder sidebar & main area
- Dashboard UI Phase 2 — Functional sidebar: `DashboardShell` client wrapper owning sidebar state, collapsible `w-64`/`w-16` rail on desktop + radix `Dialog` drawer on mobile, `TopBar` PanelLeft toggle, `Sidebar` with collapsible Types (links to `/items/[type]`, colored icons, counts, active state) and Collections (Favorites + Recent) sections, bottom user avatar area, `/items/[type]` stub route
- Dashboard UI Phase 3 — Main workspace built out (server components, mock data imported directly): `page.tsx` composes a "Dashboard" header, `StatsSection` (4 `StatCard`s — total items, collections, favorite items, favorite collections), `CollectionsSection` (`CollectionCard` grid with color-coded left accent border + item-type icon strip), and two `ItemsSection` lists sharing `ItemRow` (Pinned items, 10 Recent items sorted by `updatedAt`). Shared `src/lib/type-presentation.ts` for type icon/color maps
- Prisma + Neon PostgreSQL Setup — **Prisma 7** (pinned `7.10`, npm `latest` is the v8 RC). New Rust-free `prisma-client` generator with required `output = "../src/generated/prisma"` (gitignored); datasource `url` removed from `schema.prisma` and moved to root `prisma.config.ts` (`import "dotenv/config"` + typed `env()`). `src/lib/prisma.ts` singleton uses the mandatory `PrismaPg` driver adapter. Schema: `User`/`Account`/`Session`/`VerificationToken` (Auth.js) + `Item`/`ItemType`/`Collection`/`Tag`/`ItemTag`, with FK indexes, `Item(userId, updatedAt)` composite index, `Tag(userId, name)` unique, cascade deletes on user-owned rows + `ItemTag`, `SetNull` on `Item.collectionId`, `Restrict` on `Item.typeId`. Initial migration `20260904034818_init` created with `migrate dev` (never `db push`) and applied to the Neon dev branch. `prisma/seed.ts` (wired via `migrations.seed`) upserts 7 system item types — run with `npx prisma db seed`. `scripts/test-db.ts` (`npm run test:db`) verifies Neon connectivity and prints row counts. `build` script runs `prisma generate && next build`. Follow-ups: run `prisma migrate deploy` on prod deploy; swap dashboard mock-data imports for Prisma queries.
- Seed Data — Added `bcryptjs` dependency (v3, bundled types). Rewrote `prisma/seed.ts` as an idempotent seed per `context/features/seed-spec.md`: upserts the 7 system item types (spec names/icons/colours, stable `type_*` ids), upserts demo user `demo@devstash.io` / `Demo User` (password `12345678` hashed with bcryptjs 12 rounds, `isPro: false`, `emailVerified: now`), then clears and rebuilds that user's collections/items/tags — 5 collections (React Patterns, AI Workflows, DevOps, Terminal Commands, Design Resources) and 18 items (snippets w/ `language`, prompts, `bash`/`yaml` commands + snippet, real-URL links). `scripts/test-db.ts` now fetches and prints the demo user + collections/items and asserts 5 collections / 18 items / 7 system types. Ran `npx prisma db seed`, `npm run test:db`, `npm run build`, `npm run lint` — all pass. Dashboard still reads `src/lib/mock-data.js`; wiring it to Prisma remains a follow-up.
- Dashboard Collections — Wire to Prisma — New `src/lib/db/collections.ts` (`getRecentCollections`) fetches the demo user's 6 most-recently-updated collections directly via Prisma, including each item's type, to compute per-collection item count, the most-used type (for the card's accent border), and the distinct type list (for the icon strip). `CollectionsSection` is now an async server component calling it instead of `mockCollections`; `CollectionCard` takes the real `CollectionWithStats` shape. `type-presentation.ts`'s hex-to-Tailwind palette extended with the seeded system-type colours (they differ from the old mock hexes) and `palette()` now accepts a nullable hex. `dashboard/page.tsx` marked `export const dynamic = "force-dynamic"` so it isn't statically baked in at build time with stale data. Item lists (Pinned/Recent) still read `mockItems` — out of scope, follow-up. `StatsSection`'s collection counts also still read mock data — follow-up. Ran `npm run build`, `npm run lint` — both pass; verified rendered HTML against the live Neon-seeded data.
