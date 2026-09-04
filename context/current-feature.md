# Current Feature

<!-- Feature Name -->

## Status

<!-- Not Started|In Progress|Completed -->

Completed

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
