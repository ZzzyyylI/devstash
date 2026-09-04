import "dotenv/config";

import { prisma } from "../src/lib/prisma";

/**
 * Built-in item types. These are global (no `userId`) and every account can use
 * them. Ids are stable so items and migrations can reference them reliably.
 */
const SYSTEM_ITEM_TYPES = [
  { id: "type_snippet", name: "Snippets", icon: "Code2", color: "#3b82f6" },
  { id: "type_prompt", name: "Prompts", icon: "Sparkles", color: "#a855f7" },
  { id: "type_command", name: "Commands", icon: "SquareChevronRight", color: "#f97316" },
  { id: "type_note", name: "Notes", icon: "FileText", color: "#eab308" },
  { id: "type_file", name: "Files", icon: "File", color: "#94a3b8" },
  { id: "type_image", name: "Images", icon: "Image", color: "#ec4899" },
  { id: "type_link", name: "Links", icon: "Link", color: "#14b8a6" },
] as const;

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

  const count = await prisma.itemType.count({ where: { isSystem: true } });
  console.log(`Seeded ${count} system item types.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
