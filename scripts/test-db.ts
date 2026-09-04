import "dotenv/config";

import { prisma } from "../src/lib/prisma";

/**
 * Ad-hoc connectivity check for the Neon database.
 *
 *   npx tsx scripts/test-db.ts   (or: npm run test:db)
 *
 * Verifies the connection string loads, a query round-trips, and reports what is
 * currently in the core tables.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set - copy .env.example to .env");
  }
  console.log(`Connecting to ${new URL(url).host} ...`);

  const [{ now, version }] = await prisma.$queryRaw<
    { now: Date; version: string }[]
  >`SELECT now() AS now, version() AS version`;
  console.log(`Connected. Server time: ${now.toISOString()}`);
  console.log(`Server: ${version.split(",")[0]}`);

  const systemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
    orderBy: { id: "asc" },
  });
  console.log(`\nSystem item types (${systemTypes.length}):`);
  for (const type of systemTypes) {
    console.log(`  - ${type.name.padEnd(10)} ${type.id}  ${type.color}`);
  }

  const counts = {
    users: await prisma.user.count(),
    items: await prisma.item.count(),
    itemTypes: await prisma.itemType.count(),
    collections: await prisma.collection.count(),
    tags: await prisma.tag.count(),
  };
  console.log("\nRow counts:", counts);
  console.log("\nDatabase check passed.");
}

main()
  .catch((error) => {
    console.error("\nDatabase check failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
