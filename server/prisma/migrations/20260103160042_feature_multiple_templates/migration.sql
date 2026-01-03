/*
  Warnings:

  - You are about to drop the column `selectedTemplateId` on the `OIT` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OIT" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "oitNumber" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "oitFileUrl" TEXT,
    "quotationFileUrl" TEXT,
    "samplingReportUrl" TEXT,
    "labResultsUrl" TEXT,
    "finalReportUrl" TEXT,
    "labResultsAnalysis" TEXT,
    "aiData" TEXT,
    "resources" TEXT,
    "scheduledDate" DATETIME,
    "samplingData" TEXT,
    "pendingSync" BOOLEAN NOT NULL DEFAULT false,
    "selectedTemplateIds" TEXT,
    "planningProposal" TEXT,
    "planningAccepted" BOOLEAN NOT NULL DEFAULT false,
    "samplingProgress" TEXT,
    "stepValidations" TEXT,
    "finalAnalysis" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_OIT" ("aiData", "createdAt", "description", "finalAnalysis", "finalReportUrl", "id", "labResultsAnalysis", "labResultsUrl", "location", "oitFileUrl", "oitNumber", "pendingSync", "planningAccepted", "planningProposal", "quotationFileUrl", "resources", "samplingData", "samplingProgress", "samplingReportUrl", "scheduledDate", "status", "stepValidations", "updatedAt") SELECT "aiData", "createdAt", "description", "finalAnalysis", "finalReportUrl", "id", "labResultsAnalysis", "labResultsUrl", "location", "oitFileUrl", "oitNumber", "pendingSync", "planningAccepted", "planningProposal", "quotationFileUrl", "resources", "samplingData", "samplingProgress", "samplingReportUrl", "scheduledDate", "status", "stepValidations", "updatedAt" FROM "OIT";
DROP TABLE "OIT";
ALTER TABLE "new_OIT" RENAME TO "OIT";
CREATE UNIQUE INDEX "OIT_oitNumber_key" ON "OIT"("oitNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
