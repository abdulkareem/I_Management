-- Safe production patch for Prisma migration blockers on Internship.
-- 1) backfill NULL duration/vacancy,
-- 2) normalize legacy/invalid targetType values before enum validation,
-- 3) enforce defaults and NOT NULL safely.

BEGIN;

-- Step 1: Backfill NULL values to safe minimum defaults.
UPDATE "Internship"
SET "duration" = 60
WHERE "duration" IS NULL;

UPDATE "Internship"
SET "vacancy" = 1
WHERE "vacancy" IS NULL;

-- Step 1b: Normalize invalid targetType values (including FREE) to INTERNAL.
-- This prevents: Invalid enum value. Expected 'INTERNAL' | 'EXTERNAL', received 'FREE'.
UPDATE "Internship"
SET "targetType" = 'INTERNAL'
WHERE "targetType" IS NULL
   OR "targetType"::text NOT IN ('INTERNAL', 'EXTERNAL');

-- Optional safety: ensure type is valid as well.
UPDATE "Internship"
SET "type" = 'FREE'
WHERE "type" IS NULL;

-- Step 2: Verify no blocker rows remain.
-- Expect 0 rows.
-- SELECT id, "duration", "vacancy", "targetType", "type"
-- FROM "Internship"
-- WHERE "duration" IS NULL
--    OR "vacancy" IS NULL
--    OR "targetType" IS NULL
--    OR "targetType"::text NOT IN ('INTERNAL', 'EXTERNAL');

-- Step 3: Enforce constraints/defaults after data is clean.
ALTER TABLE "Internship"
  ALTER COLUMN "duration" SET DEFAULT 60,
  ALTER COLUMN "duration" SET NOT NULL,
  ALTER COLUMN "vacancy" SET DEFAULT 1,
  ALTER COLUMN "vacancy" SET NOT NULL,
  ALTER COLUMN "targetType" SET DEFAULT 'INTERNAL';

COMMIT;
