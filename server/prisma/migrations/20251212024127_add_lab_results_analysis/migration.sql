-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "oitId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_oitId_fkey" FOREIGN KEY ("oitId") REFERENCES "OIT" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Standard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SamplingTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "oitType" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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
    "selectedTemplateId" TEXT,
    "planningProposal" TEXT,
    "planningAccepted" BOOLEAN NOT NULL DEFAULT false,
    "samplingProgress" TEXT,
    "stepValidations" TEXT,
    "finalAnalysis" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_OIT" ("aiData", "createdAt", "description", "finalAnalysis", "id", "oitFileUrl", "oitNumber", "quotationFileUrl", "resources", "samplingProgress", "samplingReportUrl", "status", "stepValidations", "updatedAt") SELECT "aiData", "createdAt", "description", "finalAnalysis", "id", "oitFileUrl", "oitNumber", "quotationFileUrl", "resources", "samplingProgress", "samplingReportUrl", "status", "stepValidations", "updatedAt" FROM "OIT";
DROP TABLE "OIT";
ALTER TABLE "new_OIT" RENAME TO "OIT";
CREATE UNIQUE INDEX "OIT_oitNumber_key" ON "OIT"("oitNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
