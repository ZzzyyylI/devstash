# Item Types

Reference for DevStash's 7 built-in item types: their identity (name, icon, color),
their purpose, and which `Item` fields each one actually uses.

> Research date: 2026-09-05. Sources: `context/project-overview.md`,
> `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/type-presentation.ts`,
> `src/lib/db/items.ts`, `src/components/dashboard/Sidebar.tsx`,
> `src/components/dashboard/ItemRow.tsx`, and the live Neon `development` branch.
>
> The research prompt pointed at `src/lib/constants.tsx` — that file does not
> exist. The canonical icon/color presentation logic lives in
> `src/lib/type-presentation.ts`. Legacy values also live in `src/lib/mock-data.ts`
> (no longer wired to the UI — see [Legacy / mock values](#legacy--mock-values)).

---

## The 7 system types

All 7 are seeded by `prisma/seed.ts` as **global** rows (`isSystem: true`,
`userId: null`) with stable ids, so every account shares them. Values below are
verified against the live `development` branch and match the seed exactly.

| Type | `ItemType.id` | `name` | `icon` (seed/DB) | Icon rendered in UI | Color (hex) | Tailwind class | Pro-gated? |
|------|---------------|--------|------------------|---------------------|-------------|----------------|------------|
| Snippet | `type_snippet` | `snippet` | `Code` | `Code` | `#3b82f6` | `text-blue-500` | No |
| Prompt | `type_prompt` | `prompt` | `Sparkles` | `Sparkles` | `#8b5cf6` | `text-violet-500` | No |
| Command | `type_command` | `command` | `Terminal` | `Terminal` | `#f97316` | `text-orange-500` | No |
| Note | `type_note` | `note` | `StickyNote` | `FileText` ⚠️ | `#fde047` | `text-yellow-300` | No |
| File | `type_file` | `file` | `File` | `File` | `#6b7280` | `text-gray-500` | **Yes** |
| Image | `type_image` | `image` | `Image` | `Image` | `#ec4899` | `text-pink-500` | **Yes** |
| Link | `type_link` | `link` | `Link` | `Link` | `#10b981` | `text-emerald-500` | No |

Notes on the table:

- **`name` is stored lowercase.** The UI capitalizes it for display
  (`capitalize()` in `Sidebar.tsx`) and lowercases it for routing
  (`/items/${type.name.toLowerCase()}` → e.g. `/items/snippet`).
- **Icons** are Lucide component names. The DB `icon` column is currently
  informational only — `TYPE_ICON` in `type-presentation.ts` maps by
  **`ItemType.id`**, not by the stored string. ⚠️ For `type_note` the two
  disagree: the DB says `StickyNote`, the UI renders `FileText`
  (`FALLBACK_ICON` is also `FileText`).
- **Colors**: hex is stored on `ItemType.color`. No inline styles are allowed
  (Tailwind v4 / coding standards), so `type-presentation.ts`'s `PALETTE` maps
  each hex to a `{ text, border, dot }` set of utility classes. An unknown hex
  falls back to `{ text-muted-foreground, border-l-border, bg-border }`.
- **Pro-gated** = flagged with a `PRO` badge in the sidebar
  (`PRO_TYPE_NAMES = new Set(["file", "image"])` in `Sidebar.tsx`). This is a
  display hint only; no server-side enforcement exists yet. It is also slightly
  inconsistent with `context/project-overview.md`, which lists "image uploads"
  as a Free-tier feature and only "File uploads" as Pro.
- **Display order** (sidebar Types list, profile breakdown): snippet → prompt →
  command → note → file → image → link. Defined by `TYPE_ORDER` /
  `compareTypeOrder` in `src/lib/db/items.ts`; custom types sort alphabetically
  after all system types.

---

## Per-type detail

Each type shares the same `Item` model — there is no per-type table or schema
variation. "Key fields" below is which of the optional `Item` columns each type
meaningfully populates, inferred from `prisma/seed.ts` (and the one `file`
example in `mock-data.ts`, since no seed item exercises `file`/`image`).

### Snippet — `type_snippet`

- **Icon / color**: `Code` / `#3b82f6` (blue).
- **Purpose**: reusable blocks of source code — hooks, utilities, patterns,
  config files. The largest category in the seed (React patterns, a `groupBy`
  util, a GitHub Actions workflow).
- **`contentType`**: `text`.
- **Key fields**: `title`, `content` (the code), `language` (e.g. `typescript`,
  `yaml`), `description`, `tags`, `collectionId`.
- **Unused**: `url`, `fileUrl`, `fileName`, `fileSize`.
- Live count on `development`: 4 items.

### Prompt — `type_prompt`

- **Icon / color**: `Sparkles` / `#8b5cf6` (violet).
- **Purpose**: reusable LLM prompts and prompt templates (code-review prompt,
  doc-generation prompt, refactor prompt). Often contain `{{placeholder}}`
  tokens.
- **`contentType`**: `text`.
- **Key fields**: `title`, `content` (the prompt text), `description`, `tags`,
  `collectionId`.
- **Unused**: `language` (not set on any seeded prompt), `url`, `fileUrl`,
  `fileName`, `fileSize`.
- Live count on `development`: 3 items.

### Command — `type_command`

- **Icon / color**: `Terminal` / `#f97316` (orange).
- **Purpose**: single shell commands / one-liners to copy and run
  (`docker system prune`, "kill the process on a port", a deploy command).
- **`contentType`**: `text`.
- **Key fields**: `title`, `content` (the command), `language` (`bash` in the
  seed), `description`, `tags`, `collectionId`.
- **Unused**: `url`, `fileUrl`, `fileName`, `fileSize`.
- Live count on `development`: 5 items.

### Note — `type_note`

- **Icon / color**: `StickyNote` in DB, **`FileText` in the UI** / `#fde047`
  (yellow-300).
- **Purpose**: free-form Markdown notes / cheat sheets (e.g. a Big-O cheat
  sheet in the mock data). The project spec calls for a Markdown editor for text
  items.
- **`contentType`**: `text`.
- **Key fields**: `title`, `content` (Markdown body), `description`, `tags`,
  `collectionId`. `language` is typically `null`.
- **Unused**: `url`, `fileUrl`, `fileName`, `fileSize`.
- Live count on `development`: 0 items (no seed coverage).

### File — `type_file`

- **Icon / color**: `File` / `#6b7280` (gray).
- **Purpose**: uploaded documents / templates / boilerplate (e.g. a
  `CLAUDE.md` starter). Intended to be backed by Cloudflare R2 storage.
- **`contentType`**: `file`.
- **Key fields**: `title`, `fileUrl` (R2 object URL), `fileName`, `fileSize`
  (bytes), `description`, `tags`, `collectionId`.
- **Unused**: `content`, `language`, `url`.
- **Pro-gated** in the sidebar.
- Live count on `development`: 0 items (no seed coverage; the only example is
  `mock-data.ts`).

### Image — `type_image`

- **Icon / color**: `Image` / `#ec4899` (pink).
- **Purpose**: uploaded images / screenshots / diagrams. Same storage model as
  File.
- **`contentType`**: `file` (same shape as File).
- **Key fields**: `title`, `fileUrl`, `fileName`, `fileSize`, `description`,
  `tags`, `collectionId`.
- **Unused**: `content`, `language`, `url`.
- **Pro-gated** in the sidebar.
- Live count on `development`: 0 items. No example anywhere in the codebase —
  the least-specified type.

### Link — `type_link`

- **Icon / color**: `Link` / `#10b981` (emerald).
- **Purpose**: bookmarked URLs — docs and references (Docker docs, Tailwind
  docs, shadcn/ui, Lucide, etc.). Well covered by the seed.
- **`contentType`**: `text` (it is **not** `file`; the seed never sets
  `contentType` on links, so it takes the schema default `"text"`).
- **Key fields**: `title`, `url` (the destination), `description`, `tags`,
  `collectionId`.
- **Unused**: `content` (`null`), `language`, `fileUrl`, `fileName`, `fileSize`.
- Live count on `development`: 6 items.

---

## Summary: text vs file vs URL

`context/project-overview.md` describes items conceptually as text / file / URL,
but the schema only has a two-value `Item.contentType` (`"text" | "file"`,
default `"text"`, plain `String` — no enum). URL items are a text item with the
`url` column populated. So the real classification is:

| Class | Types | `contentType` | Where the payload lives | Other populated columns |
|-------|-------|---------------|-------------------------|-------------------------|
| **Text** | snippet, prompt, command, note | `text` | `content` (string) | `language` (snippet/command; optional elsewhere) |
| **File** | file, image | `file` | `fileUrl` (+ `fileName`, `fileSize`) | — |
| **URL** | link | `text` | `url` (string) | — |

- Text types differ mainly by `language` usage and intended editor behavior
  (Markdown for notes, syntax highlighting for snippet/command).
- File and image are structurally identical; they differ only by icon, color,
  and the expected MIME of the upload.
- Link is a text-class item distinguished purely by carrying `url` instead of
  `content`.

## Shared properties (every item, regardless of type)

From `model Item` in `prisma/schema.prisma`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` (cuid) | PK |
| `title` | `String` | required |
| `contentType` | `String` | `"text"` \| `"file"`, default `"text"` |
| `content` | `String?` | text payload |
| `fileUrl` / `fileName` / `fileSize` | `String?` / `String?` / `Int?` | file payload |
| `url` | `String?` | link destination |
| `description` | `String?` | short blurb, shown under the title |
| `isFavorite` | `Boolean` | default `false` |
| `isPinned` | `Boolean` | default `false` |
| `language` | `String?` | free-form language slug for highlighting |
| `userId` → `User` | relation | `onDelete: Cascade` |
| `typeId` → `ItemType` | relation | `onDelete: Restrict` (a type can't be deleted while items reference it) |
| `collectionId` → `Collection?` | relation | `onDelete: SetNull` |
| `tags` → `ItemTag[]` | m-n | join table, cascades from Item/Tag |
| `createdAt` / `updatedAt` | `DateTime` | `updatedAt` drives the "Recent" ordering |

Indexes: `@@index([userId])`, `@@index([typeId])`, `@@index([collectionId])`,
`@@index([userId, updatedAt])`.

## Display differences

There is no per-type view/editor yet — the item drawer and full-screen editor
from the design spec are not built, and `/items/[type]` is a placeholder page.
Today, type only affects three things:

1. **Icon** — `TYPE_ICON[type.id]` (Lucide component), tinted with
   `palette(color).text`. Falls back to `FileText` for unknown ids.
2. **Accent color** — `palette(color)` returns:
   - `text-*` — used to tint the icon (sidebar Types list, `ItemRow`, profile
     type chips).
   - `border-l-*` — the 2px left accent border on `ItemRow` cards and on
     `CollectionCard` (keyed to the collection's most-used type).
   - `bg-*` (`dot`) — the small solid dot next to non-favorite collections in
     the sidebar.
3. **Sidebar Types list** — each type is a link to `/items/<name>` showing the
   tinted icon, capitalized name, a `PRO` badge for `file`/`image`, and the live
   item count (`getItemTypesWithCounts()`).

`ItemRow` itself renders identically for every type: icon tile + accent border,
title, `Pin`/`Star` markers, `description` (1 line, clamped), and up to N tag
chips. It does not branch on `contentType` — a link's `url`, a file's
`fileName`/`fileSize`, and a snippet's `language` are **not** surfaced anywhere
in the current dashboard UI.

---

## Custom types (Pro)

`ItemType` supports user-scoped rows: `isSystem: false` with `userId` set.
Per `context/project-overview.md` these are a Pro-only feature. Queries that
list types use `where: { OR: [{ isSystem: true }, { userId }] }`
(`getItemTypesWithCounts`, `getItemTypeByName`, `getProfileStats`). Custom types
have no entry in `TYPE_ICON` / `PALETTE`, so they render with the fallback icon
(`FileText`) and the fallback muted palette, and `compareTypeOrder` sorts them
alphabetically after the 7 system types. No creation UI exists yet.

## Legacy / mock values

`src/lib/mock-data.ts` (`mockItemTypes`) predates the seed and is **no longer
rendered** — the dashboard, sidebar, and profile all read from Prisma. Its
values differ and should not be treated as authoritative:

| Type | mock name | mock icon | mock color | Seeded/DB icon | Seeded/DB color |
|------|-----------|-----------|------------|----------------|-----------------|
| snippet | `Snippets` | `Code2` | `#3b82f6` | `Code` | `#3b82f6` |
| prompt | `Prompts` | `Sparkles` | `#a855f7` | `Sparkles` | `#8b5cf6` |
| command | `Commands` | `SquareChevronRight` | `#f97316` | `Terminal` | `#f97316` |
| note | `Notes` | `FileText` | `#eab308` | `StickyNote` | `#fde047` |
| file | `Files` | `File` | `#94a3b8` | `File` | `#6b7280` |
| image | `Images` | `Image` | `#ec4899` | `Image` | `#ec4899` |
| link | `Links` | `Link` | `#14b8a6` | `Link` | `#10b981` |

`type-presentation.ts`'s `PALETTE` still carries **both** hex sets so nothing
breaks if a legacy hex resurfaces.
