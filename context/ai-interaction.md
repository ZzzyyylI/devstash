# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the project spec
- Never delete files without clarification

## Workflow

This is the common workflow that we will use for every single feature/fix:

1. **Document** - Document the feature in @context/current-feature.md.
2. **Branch** - Create new branch for feature, fix, etc
3. **Implement** - Implement the feature/fix that I create in @context/current-feature.md
4. **Test** - Verify it works in the browser. Add/adjust Vitest unit tests for any new or changed server actions (`src/actions/**`) and utilities (`src/lib/**`) — see the Testing section below. Run `npm run test`, `npm run lint`, and `npm run build`; fix any errors.
5. **Iterate** - Iterate and change things if needed
6. **Commit** - Only after tests, lint, and build pass and everything works
7. **Merge** - Merge to main
8. **Delete Branch** - Delete branch after merge
9. **Review** - Review AI-generated code periodically and on demand.
10. Mark as completed in @context/current-feature.md and add to history

Do NOT commit without permission and until the build passes. If build fails, fix the issues first.

## Branching

We will create a new branch for every feature/fix. Name branch **feature/[feature]** or **fix[fix]**, etc. Ask to delete the branch once merged.

## Commits

- Ask before committing (don't auto-commit)
- Use conventional commit messages (feat:, fix:, chore:, etc.)
- Keep commits focused (one feature/fix per commit)
- Never put "Generated With Claude" in the commit messages

## Testing

- **Framework**: Vitest (`npm run test` one-shot, `npm run test:watch` while developing). Config: `vitest.config.mts`.
- **Scope**: server actions (`src/actions/**`) and utilities/helpers (`src/lib/**`) only. We do **not** unit-test React components or do DOM/browser testing — components are still verified manually in the browser.
- **Location**: tests sit next to the code they cover as `*.test.ts` (e.g. `src/lib/base-url.ts` → `src/lib/base-url.test.ts`). Only `src/{actions,lib}/**/*.test.ts` is picked up.
- **Environment**: plain `node` (no jsdom). Use the Web `Request`/`Response` globals directly when a helper takes one.
- **DB / external deps**: never hit a real database or network. Mock the Prisma singleton with `vi.mock("@/lib/prisma", …)` and mock `@/auth` for anything that imports it (see `src/lib/tokens.test.ts` and `src/actions/auth.test.ts` for the pattern).
- **Env vars**: use `vi.stubEnv(...)` + `vi.unstubAllEnvs()` in `afterEach`; pass `undefined` to unset a variable.
- Prefer pure functions that are easy to test. When adding a utility, add its test in the same commit.

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Preserve existing patterns in the codebase

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases)
- Patterns (matches existing codebase?)
