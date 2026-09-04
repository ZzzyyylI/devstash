# Current Feature

<!-- Feature Name -->

Dashboard UI Phase 3 — Main workspace area

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

See @context/features/dashboard-phase-3-spec.md for the full spec.

Phase 3 of 3 for the dashboard UI layout. Build out the main content area to the
right of the sidebar, using the design screenshot and importing mock data
directly (`@src/lib/mock-data.js`) until the database is implemented.

- Main area to the right
- Recent collections
- Pinned items
- 10 recent items
- 4 stats cards at the top: number of items, collections, favorite items,
  favorite collections (not in screenshot)

## Notes

<!-- Any extra notes -->

- References: `@context/screenshots/dashboard-ui-main.png`,
  `@context/project-overview.md`, `@src/lib/mock-data.js`,
  `@context/features/dashboard-phase-1-spec.md`,
  `@context/features/dashboard-phase-2-spec.md`

## History

<!-- Keep this updated. Earliest to latest -->

- Project setup and boilerplate cleanup
- Initial Next.js and Tailwind setup committed and pushed to GitHub
- Dashboard UI Phase 1 — ShadCN init (radix-nova preset) + button/input components, `/dashboard` route with layout shell, dark mode by default, display-only top bar (search + New Collection/New Item), placeholder sidebar & main area
- Dashboard UI Phase 2 — Functional sidebar: `DashboardShell` client wrapper owning sidebar state, collapsible `w-64`/`w-16` rail on desktop + radix `Dialog` drawer on mobile, `TopBar` PanelLeft toggle, `Sidebar` with collapsible Types (links to `/items/[type]`, colored icons, counts, active state) and Collections (Favorites + Recent) sections, bottom user avatar area, `/items/[type]` stub route
- Dashboard UI Phase 3 — Main workspace built out (server components, mock data imported directly): `page.tsx` composes a "Dashboard" header, `StatsSection` (4 `StatCard`s — total items, collections, favorite items, favorite collections), `CollectionsSection` (`CollectionCard` grid with color-coded left accent border + item-type icon strip), and two `ItemsSection` lists sharing `ItemRow` (Pinned items, 10 Recent items sorted by `updatedAt`). Shared `src/lib/type-presentation.ts` for type icon/color maps
