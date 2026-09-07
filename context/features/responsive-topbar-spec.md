# Responsive Dashboard Top Bar

## Problem

On small screens the dashboard top bar (`src/components/dashboard/TopBar.tsx`)
overflows horizontally. At 375 px the `ml-auto` action group (`New Collection` +
`New Item` + Favorites star) is ~280 px wide and extends ~100 px past the
viewport, so:

- the page scrolls sideways (`document.scrollWidth` 474 vs client 375),
- "New Item" is entirely off-screen and "New Collection" is clipped,
- the search field is squished to ~123 px and its "Search items..." placeholder
  wraps onto two lines.

The bar only becomes comfortable from ~768 px up.

## Goals

Make the top bar fit every width down to 320 px with no horizontal page scroll,
while keeping the full three-button layout on `sm:`+ screens unchanged.

1. **Consolidated create menu below `sm`.** Replace the separate `New Collection`
   and `New Item` buttons with a single primary `+ New` button that opens a
   `DropdownMenu` (reuse `src/components/ui/dropdown-menu.tsx`) with two items:
   "New item" and "New collection", each opening its existing dialog. At `sm:`
   and up, hide the dropdown trigger and show the two labelled buttons as today.

2. **Icon-only search below `sm`.** Below `sm`, render the search affordance as an
   icon-only ghost button (Search icon, `aria-label`) that opens the command
   palette. From `sm:` up, show the current full field (border, "Search items..."
   placeholder, `⌘K` kbd). The `⌘K` kbd stays hidden until `md` (no meta key on
   phones).

3. **Overflow guards.** `min-w-0` on the search field so it can shrink; `shrink-0`
   on the icon buttons and the action group; tighter `gap-2` / `px-3` on mobile
   (restoring `sm:gap-3` / `sm:px-4`). The header must never make the page scroll
   horizontally.

4. Favorites star stays as the compact icon button it already is.

## Non-goals

- No change to `DashboardShell` / layout props — `TopBar` is self-contained.
- No change to the palette, dialogs, or the desktop appearance from `sm:` up.
- No new dependencies (dropdown primitive already exists).

## Testing

`TopBar` is a client component, so no Vitest coverage (per project testing
scope). Verify in the browser with Playwright at 320 / 375 / 640 / 1280:
`document.scrollWidth === clientWidth` at every width, the mobile `+ New` menu
opens both dialogs, the mobile search icon opens the palette, and the `sm:`+
layout is visually unchanged. Run `npm run lint` and `npm run build`.
