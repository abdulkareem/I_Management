# Database / Backend / Frontend Sync Audit — 2026-04-02

## Scope
- Prisma schema inspected: `packages/db/prisma/schema.prisma`
- PostgreSQL canonical schema inspected: `packages/db/schema.sql`
- Backend API + validation inspected: `backend/src/services/legacy-api.ts`
- Frontend forms/API payloads inspected: `frontend/app/join/student/page.tsx`, `frontend/app/join/industry/page.tsx`

## Result summary
1. **Schema drift identified** between Railway PostgreSQL schema and runtime backend expectations.
2. **Incremental migration added**: `packages/db/migrations/0002_railway_sync.sql`.
3. **Base schema updated** with enum alignment and migration usage note.
4. **Frontend payload naming** was found compatible with backend alias handling (`ipoTypeId|industry_type_id`, `collegeId|college_id`, etc.).

## Key mismatches fixed
- Added missing PostgreSQL structures used by backend runtime SQL:
  - `programs`
  - `students`
  - `external_students`
  - `internship_applications`
  - `college_industry_links`
  - `internship_performance_feedback`
  - `logs`
- Added missing operational columns on existing tables:
  - `internships` (workflow + visibility + mapping + stipend + requirements fields)
  - `industries` (registration/company metadata)
  - `colleges` and `departments` (registration/profile fields)
- Added support for `role='IPO'` in PostgreSQL enum for compatibility with Prisma role model.
- Added core indexes for the above paths to keep query plans healthy.

## Database introspection note
Runtime introspection against Railway could not be executed in this environment because `DATABASE_URL` was not present in shell environment at execution time.

## Safe migration design notes
- Migration is idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, guarded enum value addition).
- Wrapped in a transaction.
- No table drops and no column drops.
