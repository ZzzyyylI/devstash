import "dotenv/config";

import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";

/**
 * Seeds the database with sample data for development and demos.
 *
 *   npx prisma db seed
 *
 * Idempotent: system item types are upserted, and the demo user's collections,
 * items and tags are cleared and rebuilt on every run.
 */

const DEMO_USER = {
  email: "demo@devstash.io",
  name: "Demo User",
  password: "12345678",
};

/**
 * Built-in item types. Global (no `userId`) and available to every account. Ids
 * are stable so items and migrations can reference them reliably; name / icon /
 * colour come from context/features/seed-spec.md. Icons are Lucide component
 * names.
 */
const SYSTEM_ITEM_TYPES = [
  { id: "type_snippet", name: "snippet", icon: "Code", color: "#3b82f6" },
  { id: "type_prompt", name: "prompt", icon: "Sparkles", color: "#8b5cf6" },
  { id: "type_command", name: "command", icon: "Terminal", color: "#f97316" },
  { id: "type_note", name: "note", icon: "StickyNote", color: "#fde047" },
  { id: "type_file", name: "file", icon: "File", color: "#6b7280" },
  { id: "type_image", name: "image", icon: "Image", color: "#ec4899" },
  { id: "type_link", name: "link", icon: "Link", color: "#10b981" },
] as const;

interface SeedItem {
  title: string;
  typeId: string;
  description: string;
  content?: string;
  url?: string;
  language?: string;
}

interface SeedCollection {
  name: string;
  description: string;
  isFavorite?: boolean;
  items: SeedItem[];
}

const USE_DEBOUNCE = `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}`;

const COMPOUND_COMPONENT = `import { createContext, useContext, useState, type ReactNode } from "react";

const TabsContext = createContext<{
  active: string;
  setActive: (id: string) => void;
} | null>(null);

export function Tabs({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  const [active, setActive] = useState(defaultValue);
  return <TabsContext.Provider value={{ active, setActive }}>{children}</TabsContext.Provider>;
}

export function Tab({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tab must be used inside Tabs");
  return (
    <button data-active={ctx.active === value} onClick={() => ctx.setActive(value)}>
      {children}
    </button>
  );
}`;

const GROUP_BY = `export function groupBy<T, K extends PropertyKey>(
  items: readonly T[],
  selector: (item: T) => K,
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of items) {
    const key = selector(item);
    (result[key] ??= []).push(item);
  }
  return result;
}`;

const CI_WORKFLOW = `name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build`;

const REVIEW_PROMPT = `You are a senior engineer reviewing a pull request.

Review the diff below for:
- Correctness and edge cases
- Security issues (auth, input validation, injection)
- Performance (N+1 queries, unnecessary re-renders)
- Readability and consistency with the surrounding code

Reply with a short summary, then a bulleted list of concrete, actionable
comments. Reference file and line for each. Skip praise.

--- DIFF ---
{{diff}}`;

const DOCS_PROMPT = `Generate reference documentation for the module below.

For every exported function, type and constant, produce:
- A one-line description
- Parameter and return descriptions
- One realistic usage example

Output GitHub-flavoured Markdown with a \`##\` heading per export. Do not
invent behaviour that is not in the code.

--- SOURCE ---
{{source}}`;

const REFACTOR_PROMPT = `Refactor the code below without changing its observable behaviour.

Goals:
- Reduce duplication and nesting
- Improve naming
- Extract cohesive helpers

Constraints:
- Keep the public API identical
- Preserve existing comments that still apply
- List every change you made and why

--- CODE ---
{{code}}`;

const COLLECTIONS: SeedCollection[] = [
  {
    name: "React Patterns",
    description: "Reusable React patterns and hooks",
    isFavorite: true,
    items: [
      {
        title: "useDebounce hook",
        typeId: "type_snippet",
        language: "typescript",
        description: "Debounce a fast-changing value inside a component.",
        content: USE_DEBOUNCE,
      },
      {
        title: "Compound component pattern",
        typeId: "type_snippet",
        language: "typescript",
        description: "Share state between related components via context.",
        content: COMPOUND_COMPONENT,
      },
      {
        title: "groupBy utility",
        typeId: "type_snippet",
        language: "typescript",
        description: "Group an array into a record keyed by a selector.",
        content: GROUP_BY,
      },
    ],
  },
  {
    name: "AI Workflows",
    description: "AI prompts and workflow automations",
    items: [
      {
        title: "Code review prompt",
        typeId: "type_prompt",
        description: "Ask an LLM for a focused, actionable code review.",
        content: REVIEW_PROMPT,
      },
      {
        title: "Documentation generation prompt",
        typeId: "type_prompt",
        description: "Generate reference docs from a source module.",
        content: DOCS_PROMPT,
      },
      {
        title: "Refactoring assistant prompt",
        typeId: "type_prompt",
        description: "Guide an LLM through a behaviour-preserving refactor.",
        content: REFACTOR_PROMPT,
      },
    ],
  },
  {
    name: "DevOps",
    description: "Infrastructure and deployment resources",
    items: [
      {
        title: "GitHub Actions CI workflow",
        typeId: "type_snippet",
        language: "yaml",
        description: "Lint and build on every push to main and on PRs.",
        content: CI_WORKFLOW,
      },
      {
        title: "Deploy to production",
        typeId: "type_command",
        language: "bash",
        description: "Build locally and promote to the production alias.",
        content: "npm run build && npx vercel deploy --prebuilt --prod",
      },
      {
        title: "Docker documentation",
        typeId: "type_link",
        url: "https://docs.docker.com/",
        description: "Official Docker reference and how-to guides.",
      },
      {
        title: "GitHub Actions documentation",
        typeId: "type_link",
        url: "https://docs.github.com/en/actions",
        description: "Workflow syntax and CI/CD reference.",
      },
    ],
  },
  {
    name: "Terminal Commands",
    description: "Useful shell commands for everyday development",
    isFavorite: true,
    items: [
      {
        title: "Delete merged git branches",
        typeId: "type_command",
        language: "bash",
        description: "Remove local branches already merged into main.",
        content: "git branch --merged main | grep -vE '^\\*|main' | xargs -r git branch -d",
      },
      {
        title: "Reclaim Docker disk space",
        typeId: "type_command",
        language: "bash",
        description: "Prune unused containers, images, networks and volumes.",
        content: "docker system prune -af --volumes",
      },
      {
        title: "Kill the process on a port",
        typeId: "type_command",
        language: "bash",
        description: "Free a port held by a stuck dev server.",
        content: "lsof -ti tcp:3000 | xargs -r kill -9",
      },
      {
        title: "List outdated npm packages",
        typeId: "type_command",
        language: "bash",
        description: "Show dependencies with newer versions available.",
        content: "npm outdated --long",
      },
    ],
  },
  {
    name: "Design Resources",
    description: "UI/UX resources and references",
    items: [
      {
        title: "Tailwind CSS documentation",
        typeId: "type_link",
        url: "https://tailwindcss.com/docs",
        description: "Utility class reference and configuration.",
      },
      {
        title: "shadcn/ui",
        typeId: "type_link",
        url: "https://ui.shadcn.com/",
        description: "Copy-paste React components built on Radix UI.",
      },
      {
        title: "Radix UI Primitives",
        typeId: "type_link",
        url: "https://www.radix-ui.com/primitives",
        description: "Unstyled, accessible component primitives.",
      },
      {
        title: "Lucide icons",
        typeId: "type_link",
        url: "https://lucide.dev/icons/",
        description: "Open-source icon set used throughout DevStash.",
      },
    ],
  },
];

async function main() {
  for (const type of SYSTEM_ITEM_TYPES) {
    await prisma.itemType.upsert({
      where: { id: type.id },
      update: { name: type.name, icon: type.icon, color: type.color, isSystem: true },
      create: {
        id: type.id,
        name: type.name,
        icon: type.icon,
        color: type.color,
        isSystem: true,
      },
    });
  }
  console.log(`Upserted ${SYSTEM_ITEM_TYPES.length} system item types.`);

  const passwordHash = await bcrypt.hash(DEMO_USER.password, 12);
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {
      name: DEMO_USER.name,
      password: passwordHash,
      isPro: false,
      emailVerified: new Date(),
    },
    create: {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      password: passwordHash,
      isPro: false,
      emailVerified: new Date(),
    },
  });
  console.log(`Upserted demo user ${user.email} (${user.id}).`);

  // Rebuild the demo user's content from scratch so re-runs stay clean.
  // ItemTag rows cascade from Item / Tag deletes.
  await prisma.item.deleteMany({ where: { userId: user.id } });
  await prisma.collection.deleteMany({ where: { userId: user.id } });
  await prisma.tag.deleteMany({ where: { userId: user.id } });

  let itemCount = 0;
  for (const collection of COLLECTIONS) {
    const created = await prisma.collection.create({
      data: {
        name: collection.name,
        description: collection.description,
        isFavorite: collection.isFavorite ?? false,
        userId: user.id,
        items: {
          create: collection.items.map((item) => ({
            title: item.title,
            description: item.description,
            content: item.content ?? null,
            url: item.url ?? null,
            language: item.language ?? null,
            userId: user.id,
            typeId: item.typeId,
          })),
        },
      },
      include: { items: true },
    });
    itemCount += created.items.length;
    console.log(`  ${created.name.padEnd(20)} ${created.items.length} items`);
  }

  console.log(`\nSeeded ${COLLECTIONS.length} collections and ${itemCount} items.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
