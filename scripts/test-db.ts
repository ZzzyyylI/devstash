import "dotenv/config";

import { prisma } from "../src/lib/prisma";

/**
 * Ad-hoc check for the Neon database.
 *
 *   npx tsx scripts/test-db.ts   (or: npm run test:db)
 *
 * Verifies the connection string loads, a query round-trips, and prints the demo
 * data created by `npx prisma db seed`.
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
    console.log(`  - ${type.name.padEnd(10)} ${type.id}  ${type.color}  ${type.icon}`);
  }

  const demo = await prisma.user.findUnique({
    where: { email: "demo@devstash.io" },
    include: {
      collections: {
        orderBy: { name: "asc" },
        include: {
          items: {
            orderBy: { item: { title: "asc" } },
            include: { item: { include: { type: true } } },
          },
        },
      },
    },
  });

  if (!demo) {
    throw new Error("Demo user not found - run `npx prisma db seed`");
  }

  console.log(
    `\nDemo user: ${demo.name} <${demo.email}>  isPro=${demo.isPro}  ` +
      `emailVerified=${demo.emailVerified?.toISOString() ?? "null"}  ` +
      `password=${demo.password ? "set (hashed)" : "null"}`,
  );

  const itemTotal = demo.collections.reduce((sum, c) => sum + c.items.length, 0);
  console.log(`\nCollections (${demo.collections.length}), items (${itemTotal}):`);
  for (const collection of demo.collections) {
    console.log(`\n  ${collection.name} - ${collection.description}`);
    for (const { item } of collection.items) {
      const detail = item.url ?? (item.content ?? "").split("\n")[0];
      console.log(
        `    [${item.type.name.padEnd(8)}] ${item.title.padEnd(32)} ${detail.slice(0, 60)}`,
      );
    }
  }

  const counts = {
    users: await prisma.user.count(),
    items: await prisma.item.count(),
    itemTypes: await prisma.itemType.count(),
    collections: await prisma.collection.count(),
    tags: await prisma.tag.count(),
  };
  console.log("\nRow counts:", counts);

  const expected = { collections: 5, items: 18, systemTypes: 7 };
  if (
    demo.collections.length !== expected.collections ||
    itemTotal !== expected.items ||
    systemTypes.length !== expected.systemTypes
  ) {
    throw new Error(
      `Seed data mismatch - expected ${JSON.stringify(expected)}, ` +
        `got collections=${demo.collections.length}, items=${itemTotal}, ` +
        `systemTypes=${systemTypes.length}`,
    );
  }

  console.log("\nDatabase check passed.");
}

main()
  .catch((error) => {
    console.error("\nDatabase check failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
