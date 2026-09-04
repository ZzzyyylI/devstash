# Current Feature

<!-- Feature Name -->

_None — ready for the next feature._

## Status

<!-- Not Started|In Progress|Completed -->

Not Started

## Goals

<!-- Goals & requirements -->

## Notes

<!-- Any extra notes -->

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Initial Next.js and Tailwind setup committed and pushed to GitHub
- Dashboard UI Phase 1 — ShadCN init (radix-nova preset) + button/input components, `/dashboard` route with layout shell, dark mode by default, display-only top bar (search + New Collection/New Item), placeholder sidebar & main area
- Dashboard UI Phase 2 — Functional sidebar: `DashboardShell` client wrapper owning sidebar state, collapsible `w-64`/`w-16` rail on desktop + radix `Dialog` drawer on mobile, `TopBar` PanelLeft toggle, `Sidebar` with collapsible Types (links to `/items/[type]`, colored icons, counts, active state) and Collections (Favorites + Recent) sections, bottom user avatar area, `/items/[type]` stub route
- Dashboard UI Phase 3 — Main workspace built out (server components, mock data imported directly): `page.tsx` composes a "Dashboard" header, `StatsSection` (4 `StatCard`s — total items, collections, favorite items, favorite collections), `CollectionsSection` (`CollectionCard` grid with color-coded left accent border + item-type icon strip), and two `ItemsSection` lists sharing `ItemRow` (Pinned items, 10 Recent items sorted by `updatedAt`). Shared `src/lib/type-presentation.ts` for type icon/color maps
- Prisma + Neon PostgreSQL Setup — **Prisma 7** (pinned `7.10`, npm `latest` is the v8 RC). New Rust-free `prisma-client` generator with required `output = "../src/generated/prisma"` (gitignored); datasource `url` removed from `schema.prisma` and moved to root `prisma.config.ts` (`import "dotenv/config"` + typed `env()`). `src/lib/prisma.ts` singleton uses the mandatory `PrismaPg` driver adapter. Schema: `User`/`Account`/`Session`/`VerificationToken` (Auth.js) + `Item`/`ItemType`/`Collection`/`Tag`/`ItemTag`, with FK indexes, `Item(userId, updatedAt)` composite index, `Tag(userId, name)` unique, cascade deletes on user-owned rows + `ItemTag`, `SetNull` on `Item.collectionId`, `Restrict` on `Item.typeId`. Initial migration `20260904034818_init` created with `migrate dev` (never `db push`) and applied to the Neon dev branch. `prisma/seed.ts` (wired via `migrations.seed`) upserts 7 system item types — run with `npx prisma db seed`. `scripts/test-db.ts` (`npm run test:db`) verifies Neon connectivity and prints row counts. `build` script runs `prisma generate && next build`. Follow-ups: run `prisma migrate deploy` on prod deploy; swap dashboard mock-data imports for Prisma queries.
