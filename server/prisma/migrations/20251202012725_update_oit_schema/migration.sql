/*
  Warnings:

  - You are about to drop the column `code` on the `OIT` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `OIT` table. All the data in the column will be lost.
  - Added the required column `oitNumber` to the `OIT` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OIT" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "oitNumber" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "oitFileUrl" TEXT,
    "quotationFileUrl" TEXT,
    "aiData" TEXT,
    "resources" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_OIT" ("createdAt", "description", "id", "status", "updatedAt") SELECT "createdAt", "description", "id", "status", "updatedAt" FROM "OIT";
DROP TABLE "OIT";
ALTER TABLE "new_OIT" RENAME TO "OIT";
CREATE UNIQUE INDEX "OIT_oitNumber_key" ON "OIT"("oitNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
