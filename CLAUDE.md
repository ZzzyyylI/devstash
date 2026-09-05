# DevStash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Commands

- **Dev server**: `npm run dev` (runs on http://localhost:3000)
- **Build**: `npm run build`
- **Production server**: `npm run start`
- **Lint**: `npm run lint`
- **Unit tests**: `npm run test` (Vitest, one-shot) / `npm run test:watch` (watch mode). Covers server actions (`src/actions/**`) and utilities (`src/lib/**`) only — no component/DOM tests.

## Neon MCP

- Org: `org-purple-cell-39466609` (Siyi)
- Project: `devstash` — id `summer-lake-87791392`
- Branches:
  - `development` — id `br-patient-sunset-ayl1jjv2` — **default target for all Neon MCP operations**
  - `production` — id `br-mute-cloud-aym5mkru` (this is the project's default/primary branch in Neon, despite the name)

**Always target the `devstash` project's `development` branch for any Neon MCP tool call** (queries, migrations, schema inspection, etc.) unless I explicitly say "production" or name the production branch. Never run destructive or write operations against `production` without explicit confirmation first, even if a tool defaults to the project's primary branch.