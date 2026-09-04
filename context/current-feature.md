# Current Feature

<!-- Feature Name -->

_None — ready for the next feature._

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

Populate the database with realistic sample data for development and demos, per
`@context/features/seed-spec.md`.

- Rewrite `prisma/seed.ts` so it is idempotent and can be re-run (`npx prisma db seed`).
- Seed one demo user (`demo@devstash.io` / `Demo User`, password `12345678` hashed
  with bcryptjs at 12 rounds, `isPro: false`, `emailVerified` set to now).
- Upsert the 7 system item types (name / Lucide icon / colour from the spec table,
  keeping the stable `type_*` ids so items reference them reliably).
- Create 5 collections owned by the demo user, with the items listed in the spec:
  - **React Patterns** — 3 TypeScript snippets (custom hook, component pattern, utility)
  - **AI Workflows** — 3 prompts (code review, doc generation, refactoring)
  - **DevOps** — 1 snippet, 1 command, 2 real documentation links
  - **Terminal Commands** — 4 commands (git, docker, process management, package manager)
  - **Design Resources** — 4 real links (CSS/Tailwind, component library, design system, icons)
- Update `scripts/test-db.ts` to fetch and print the seeded user, collections, and
  their items so `npm run test:db` verifies the data landed.
- `npm run build` must pass.

## Notes

<!-- Any extra notes -->

- Added `bcryptjs` as a dependency for password hashing (v3 ships its own types).
- The dashboard still reads from `src/lib/mock-data.js`; wiring it to these Prisma
  rows is a separate follow-up and out of scope here.

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Initial Next.js and Tailwind setup committed and pushed to GitHub
- Dashboard UI Phase 1 — ShadCN init (radix-nova preset) + button/input components, `/dashboard` route with layout shell, dark mode by default, display-only top bar (search + New Collection/New Item), placeholder sidebar & main area
- Dashboard UI Phase 2 — Functional sidebar: `DashboardShell` client wrapper owning sidebar state, collapsible `w-64`/`w-16` rail on desktop + radix `Dialog` drawer on mobile, `TopBar` PanelLeft toggle, `Sidebar` with collapsible Types (links to `/items/[type]`, colored icons, counts, active state) and Collections (Favorites + Recent) sections, bottom user avatar area, `/items/[type]` stub route
- Dashboard UI Phase 3 — Main workspace built out (server components, mock data imported directly): `page.tsx` composes a "Dashboard" header, `StatsSection` (4 `StatCard`s — total items, collections, favorite items, favorite collections), `CollectionsSection` (`CollectionCard` grid with color-coded left accent border + item-type icon strip), and two `ItemsSection` lists sharing `ItemRow` (Pinned items, 10 Recent items sorted by `updatedAt`). Shared `src/lib/type-presentation.ts` for type icon/color maps
- Prisma + Neon PostgreSQL Setup — **Prisma 7** (pinned `7.10`, npm `latest` is the v8 RC). New Rust-free `prisma-client` generator with required `output = "../src/generated/prisma"` (gitignored); datasource `url` removed from `schema.prisma` and moved to root `prisma.config.ts` (`import "dotenv/config"` + typed `env()`). `src/lib/prisma.ts` singleton uses the mandatory `PrismaPg` driver adapter. Schema: `User`/`Account`/`Session`/`VerificationToken` (Auth.js) + `Item`/`ItemType`/`Collection`/`Tag`/`ItemTag`, with FK indexes, `Item(userId, updatedAt)` composite index, `Tag(userId, name)` unique, cascade deletes on user-owned rows + `ItemTag`, `SetNull` on `Item.collectionId`, `Restrict` on `Item.typeId`. Initial migration `20260904034818_init` created with `migrate dev` (never `db push`) and applied to the Neon dev branch. `prisma/seed.ts` (wired via `migrations.seed`) upserts 7 system item types — run with `npx prisma db seed`. `scripts/test-db.ts` (`npm run test:db`) verifies Neon connectivity and prints row counts. `build` script runs `prisma generate && next build`. Follow-ups: run `prisma migrate deploy` on prod deploy; swap dashboard mock-data imports for Prisma queries.
- Seed Data — Added `bcryptjs` dependency (v3, bundled types). Rewrote `prisma/seed.ts` as an idempotent seed per `context/features/seed-spec.md`: upserts the 7 system item types (spec names/icons/colours, stable `type_*` ids), upserts demo user `demo@devstash.io` / `Demo User` (password `12345678` hashed with bcryptjs 12 rounds, `isPro: false`, `emailVerified: now`), then clears and rebuilds that user's collections/items/tags — 5 collections (React Patterns, AI Workflows, DevOps, Terminal Commands, Design Resources) and 18 items (snippets w/ `language`, prompts, `bash`/`yaml` commands + snippet, real-URL links). `scripts/test-db.ts` now fetches and prints the demo user + collections/items and asserts 5 collections / 18 items / 7 system types. Ran `npx prisma db seed`, `npm run test:db`, `npm run build`, `npm run lint` — all pass. Dashboard still reads `src/lib/mock-data.js`; wiring it to Prisma remains a follow-up.
