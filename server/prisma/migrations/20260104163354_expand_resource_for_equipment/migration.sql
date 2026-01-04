-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "serial" TEXT,
    "location" TEXT,
    "maintenanceType" TEXT,
    "maintenanceFrequency" TEXT,
    "requiresCalibration" BOOLEAN NOT NULL DEFAULT false,
    "calibrationFrequency" TEXT,
    "calibrationExpiry" DATETIME,
    "variable" TEXT,
    "workRange" TEXT,
    "resolution" TEXT,
    "calibrationPoints" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "observations" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Resource" ("createdAt", "id", "name", "quantity", "status", "type", "updatedAt") SELECT "createdAt", "id", "name", "quantity", "status", "type", "updatedAt" FROM "Resource";
DROP TABLE "Resource";
ALTER TABLE "new_Resource" RENAME TO "Resource";
CREATE UNIQUE INDEX "Resource_code_key" ON "Resource"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
