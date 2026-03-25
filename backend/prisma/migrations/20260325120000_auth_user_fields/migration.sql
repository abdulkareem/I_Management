-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "name" TEXT NOT NULL DEFAULT 'User',
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "universityRegNo" TEXT,
  ADD COLUMN "collegeId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "otp" TEXT,
  ADD COLUMN "otpExpiry" TIMESTAMP(3);

-- Backfill placeholders for unique constraints
UPDATE "User"
SET "phone" = CONCAT('PENDING-', "id"),
    "universityRegNo" = CONCAT('REG-', "id")
WHERE "phone" IS NULL OR "universityRegNo" IS NULL;

-- Make required and unique
ALTER TABLE "User"
  ALTER COLUMN "phone" SET NOT NULL,
  ALTER COLUMN "universityRegNo" SET NOT NULL;

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_universityRegNo_key" ON "User"("universityRegNo");
