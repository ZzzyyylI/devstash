# Current Feature

Actions folder DRY pass — extract the repeated Server Action boilerplate in
`src/actions/` into shared helpers under `src/lib/actions/`.

## Status

Implemented + verified — awaiting commit / merge (no auto-commit).

`npm run test` **423 pass / 46 files** (was 403 / 44 — +20 from the two new
helper suites). `npm run lint` clean (only the pre-existing
`prototypes/homepage/script.js` warning). `npm run build` green — all routes
unchanged. `src/actions/` dropped ~186 net lines (`ai.ts` 285 → 131, `items.ts`
180 → 145, `editor-preferences.ts` 51 → 41); shared logic now lives in ~200
tested lines under `src/lib/actions/`.

## Goals

From a duplication scan of `src/actions/` — the **high** and **medium** impact
findings only:

1. **`ActionResult<T>` defined three times** (`ai.ts`, `items.ts`,
   `editor-preferences.ts`) → move to `src/lib/actions/types.ts` and re-export.
   No consumer imports the type (components read the result structurally), so
   this is a safe move.

2. **Repeated Zod-failure block** (7×: 4 in `ai.ts`, 2 in `items.ts`, 1 in
   `editor-preferences.ts`) — the identical
   `{ success: false, error, fieldErrors: parsed.error.flatten().fieldErrors }`
   shape, only the message string varies → `parseInput(schema, input, message?)`
   in `src/lib/actions/guards.ts` returning a discriminated
   `{ ok: true; value } | { ok: false; result }`.

3. **`ai.ts` — four near-identical action bodies** (`generateAutoTags`,
   `generateItemDescription`, `explainCode`, `optimizePrompt`), ~50 lines each,
   repeating the same 5-gate preamble (signed-in → Pro → AI configured →
   per-user rate limit → Zod) plus a `try/catch` tail that only differs in
   three values (Pro message, rate-limit bucket name, schema) and the
   per-action copy → `runAiAction(input, config)` in
   `src/lib/actions/ai-action.ts`. Each exported action becomes a ~6-line thin
   wrapper; per-action JSDoc stays on the wrapper.

4. **`items.ts` — session guard + id guard + not-found/catch tail** (session
   guard 4×, `typeof itemId !== "string" || itemId.length === 0` 3×, the
   `null → notFound` / `throw → console.error + generic` tail 4×) →
   `requireUser(signedOutMessage?)` + `runMutation(actionName, op, { notFound,
   failed })` in `src/lib/actions/guards.ts`. `setItemFavorite` and `deleteItem`
   collapse to a few lines; `createItem` / `updateItem` keep their extra
   Zod/limit steps but share the guards + tail.

**Out of scope (low impact):** the `console.error("<fn> action failed", …)`
string (absorbed into the wrappers anyway); `auth.ts` (16 lines, nothing to
share).

**Behaviour must not change** — every existing user-facing error string, gate
order, and return shape is preserved (the action test suites assert them
exactly).

## Notes

- New module layout (all under `src/lib/actions/`):
  - `types.ts` — `ActionResult<T>` (was duplicated in `ai.ts` / `items.ts` /
    `editor-preferences.ts`; nothing imported it as a type, so the move is safe).
  - `guards.ts` — `requireUser(signedOutMessage?)` → `Guarded<{ id, isPro }>`;
    `parseInput(schema, input, message?)` → `Guarded<T>` (the shared Zod-failure
    shape; `fieldErrors` cast to `Record<string, string[]>` — Zod v4's
    `flatten().fieldErrors` is `{ [k]?: string[] }`); `runMutation(actionName,
    op, { notFound, failed })` → maps falsy → `notFound`, throw → `console.error`
    + `failed`, else `{ success: true, data }`. `op` returns the final payload,
    so `deleteItem` does `() => (await deleteItemQuery(id)) && { id }`.
  - `ai-action.ts` — `runAiAction(input, config)`: the 5-gate preamble
    (signed-in → Pro → AI configured → `checkUserRateLimit` w/ `AI_RATE_LIMIT` →
    Zod) + try/catch tail. `config` = `{ actionName, rateLimitName, proMessage,
    schema, run, emptyError?, failError }`. `run` returns `null` → `emptyError`
    (falls back to `failError`).
- `guards.test.ts` (13) + `ai-action.test.ts` (10) added in the same change.
- Every user-facing string / gate order / return shape preserved — verified by
  the unchanged `ai.test.ts` / `items.test.ts` / `editor-preferences.test.ts`
  suites (all still green).
- Divergent auth copy in `items.ts` ("to create items" / "to edit items" /
  "to update items" / "to delete items") kept as-is — passed into `requireUser`
  per call site (the tests pin each string).
- `auth.ts` untouched (16 lines, nothing to share).
- Pre-existing unrelated dirty files on the tree (`.env.example`,
  `prisma/seed.ts`, `scripts/test-db.ts`, `src/app/{register,sign-in}/page.tsx`,
  `src/auth.config.ts`, `src/proxy.ts`; untracked `.claude/agents/*`,
  `scripts/reset-oauth-user.ts`) are **excluded** from this feature's commit.

## History

- _(previous features in git log)_
