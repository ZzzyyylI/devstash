-- Item <-> Collection is now many-to-many via an explicit join table
-- (mirrors ItemTag). Order matters: create the join table, copy the existing
-- single-collection links into it, THEN drop Item.collectionId.

-- CreateTable
CREATE TABLE "CollectionItem" (
    "collectionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("collectionId","itemId")
);

-- CreateIndex
CREATE INDEX "CollectionItem_itemId_idx" ON "CollectionItem"("itemId");

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: carry every existing Item.collectionId link into the join table.
INSERT INTO "CollectionItem" ("collectionId", "itemId")
SELECT "collectionId", "id" FROM "Item" WHERE "collectionId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_collectionId_fkey";

-- DropIndex
DROP INDEX "Item_collectionId_idx";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "collectionId";
