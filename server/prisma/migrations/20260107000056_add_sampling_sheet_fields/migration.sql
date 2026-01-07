-- AlterTable
ALTER TABLE "SamplingTemplate" ADD COLUMN "startMessage" TEXT;

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationNumber" TEXT NOT NULL,
    "description" TEXT,
    "clientName" TEXT,
    "fileUrl" TEXT,
    "extractedText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "aiData" TEXT,
    "complianceResult" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "oitId" TEXT,
    "category" TEXT NOT NULL,
    "aiOutput" TEXT NOT NULL,
    "userCorrection" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "feedbackType" TEXT NOT NULL,
    "fieldName" TEXT,
    "correctValue" TEXT,
    "notes" TEXT,
    "applied" BOOLEAN NOT NULL DEFAULT false,
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
    "quotationId" TEXT,
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
    "serviceDates" TEXT,
    "fieldFormUrl" TEXT,
    "fieldFormAnalysis" TEXT,
    "samplingSheetUrl" TEXT,
    "samplingSheetAnalysis" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OIT_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OIT" ("aiData", "createdAt", "description", "finalAnalysis", "finalReportUrl", "id", "labResultsAnalysis", "labResultsUrl", "location", "oitFileUrl", "oitNumber", "pendingSync", "planningAccepted", "planningProposal", "quotationFileUrl", "resources", "samplingData", "samplingProgress", "samplingReportUrl", "scheduledDate", "selectedTemplateIds", "status", "stepValidations", "updatedAt") SELECT "aiData", "createdAt", "description", "finalAnalysis", "finalReportUrl", "id", "labResultsAnalysis", "labResultsUrl", "location", "oitFileUrl", "oitNumber", "pendingSync", "planningAccepted", "planningProposal", "quotationFileUrl", "resources", "samplingData", "samplingProgress", "samplingReportUrl", "scheduledDate", "selectedTemplateIds", "status", "stepValidations", "updatedAt" FROM "OIT";
DROP TABLE "OIT";
ALTER TABLE "new_OIT" RENAME TO "OIT";
CREATE UNIQUE INDEX "OIT_oitNumber_key" ON "OIT"("oitNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");
