-- AlterTable
ALTER TABLE "SamplingTemplate" ADD COLUMN "reportTemplateFile" TEXT;

-- CreateTable
CREATE TABLE "OITAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "oitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OITAssignment_oitId_fkey" FOREIGN KEY ("oitId") REFERENCES "OIT" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OITAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OITAssignment_oitId_userId_key" ON "OITAssignment"("oitId", "userId");
