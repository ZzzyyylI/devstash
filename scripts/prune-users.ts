import "dotenv/config";

import { prisma } from "../src/lib/prisma";

/**
 * Delete every user except the seeded demo account, along with all of their
 * owned data (items, collections, tags, custom item types, auth accounts &
 * sessions, and any dangling verification tokens).
 *
 *   npx tsx scripts/prune-users.ts            # dry run — prints what would go
 *   npx tsx scripts/prune-users.ts --yes      # actually delete
 *   (or: npm run db:prune-users -- --yes)
 *
 * System item types (`ItemType.userId = null`) are never touched.
 *
 * Targets whichever database `DATABASE_URL` points at. Per CLAUDE.md that is the
 * Neon `development` branch — do NOT point this at production.
 */
const KEEP_EMAIL = "demo@devstash.io";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env");
  }

  const apply = process.argv.slice(2).some((a) => a === "--yes" || a === "--force");

  console.log(`Database: ${new URL(url).host}`);
  console.log(`Keeping:  ${KEEP_EMAIL} (and all of its content)`);
  console.log(`Mode:     ${apply ? "DELETE" : "dry run (pass --yes to delete)"}\n`);

  const demo = await prisma.user.findUnique({
    where: { email: KEEP_EMAIL },
    select: { id: true },
  });
  if (!demo) {
    throw new Error(
      `Refusing to run: "${KEEP_EMAIL}" not found. Run \`npx prisma db seed\` first.`,
    );
  }

  const otherUserWhere = { id: { not: demo.id } } as const;
  const notDemoUser = { userId: { not: demo.id } } as const;
  // Custom types only: userId is set (system types are null) and not the demo's.
  const customTypeWhere = {
    NOT: [{ userId: null }, { userId: demo.id }],
  };

  const doomedUsers = await prisma.user.findMany({
    where: otherUserWhere,
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  });

  if (doomedUsers.length === 0) {
    console.log("Nothing to do — the demo user is the only user.");
    return;
  }

  const counts = {
    users: doomedUsers.length,
    items: await prisma.item.count({ where: notDemoUser }),
    collections: await prisma.collection.count({ where: notDemoUser }),
    tags: await prisma.tag.count({ where: notDemoUser }),
    customItemTypes: await prisma.itemType.count({ where: customTypeWhere }),
    accounts: await prisma.account.count({ where: notDemoUser }),
    sessions: await prisma.session.count({ where: notDemoUser }),
    verificationTokens: await prisma.verificationToken.count({
      where: { identifier: { not: KEEP_EMAIL } },
    }),
  };

  console.log(`Users to delete (${doomedUsers.length}):`);
  for (const u of doomedUsers) console.log(`  - ${u.email}`);
  console.log("\nRows to delete:", counts);

  if (!apply) {
    console.log("\nDry run only. Re-run with --yes to apply.");
    return;
  }

  const [itemTags, items, tags, collections, itemTypes, sessions, accounts, tokens, users] =
    await prisma.$transaction([
      prisma.itemTag.deleteMany({ where: { item: notDemoUser } }),
      prisma.item.deleteMany({ where: notDemoUser }),
      prisma.tag.deleteMany({ where: notDemoUser }),
      prisma.collection.deleteMany({ where: notDemoUser }),
      prisma.itemType.deleteMany({ where: customTypeWhere }),
      prisma.session.deleteMany({ where: notDemoUser }),
      prisma.account.deleteMany({ where: notDemoUser }),
      prisma.verificationToken.deleteMany({
        where: { identifier: { not: KEEP_EMAIL } },
      }),
      prisma.user.deleteMany({ where: otherUserWhere }),
    ]);

  console.log("\nDeleted:", {
    itemTags: itemTags.count,
    items: items.count,
    tags: tags.count,
    collections: collections.count,
    customItemTypes: itemTypes.count,
    sessions: sessions.count,
    accounts: accounts.count,
    verificationTokens: tokens.count,
    users: users.count,
  });

  const remaining = await prisma.user.findMany({
    select: { email: true },
    orderBy: { email: "asc" },
  });
  console.log(
    `\nRemaining users (${remaining.length}): ${remaining.map((u) => u.email).join(", ")}`,
  );
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error("\nprune-users failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
