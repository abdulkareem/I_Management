# InternSuite Single Workspace Refactor

## Final folder structure

```text
backend/
  src/
    index.ts
    server.ts
    lib/
      bootstrap.ts
      documents.ts
      http.ts
      mailer.ts
      security.ts
      storage.ts
    routes/
      auth.ts
      catalog.ts
      college.ts
      industry.ts
      student.ts
    test/
      smoke.test.ts
frontend/
  app/
    page.tsx
    login/page.tsx
    join/
      student/page.tsx
      college/page.tsx
      industry/page.tsx
    dashboard/
      student/page.tsx
      college/page.tsx
      industry/page.tsx
    offline/page.tsx
  components/
    landing-page.tsx
    role-dashboard-shell.tsx
    service-worker-register.tsx
    ui/
  lib/
    api.ts
    auth.ts
  public/
    icon.svg
    manifest.webmanifest
    sw.js
packages/
  database/
    prisma/
      schema.prisma
      migrations/20260323120000_single_workspace_platform/migration.sql
  types/
    src/index.ts
docs/
  single-workspace-platform.md
```

## Backend controller map

- `backend/src/routes/auth.ts`: registration/login flows for student, college, and industry accounts.
- `backend/src/routes/student.ts`: approved opportunity feed + one-click applications.
- `backend/src/routes/college.ts`: dashboard aggregation + MoU approval with signed PDF generation.
- `backend/src/routes/industry.ts`: MoU request, internship creation, application acceptance, attendance recording.
- `backend/src/routes/catalog.ts`: public college catalog for student onboarding.

## Frontend layout map

- Landing page: hero + three primary calls to action.
- Join flows: role-specific pages with compact forms.
- Student dashboard: journey progress, application status, approved internship cards.
- College dashboard: pending MoU cards, approved industry cards, student activity stats.
- Industry dashboard: quick-create internship panel + card-based application queue.

## PWA configuration

- `frontend/public/manifest.webmanifest`: modern manifest with standalone display, scope, theme color, and maskable icon.
- `frontend/public/sw.js`: offline-first cache for shell routes and stale-while-revalidate fetches.
- `frontend/components/service-worker-register.tsx`: client-side service worker registration.
- `frontend/public/_headers`: Cloudflare-friendly cache directives for shell assets and service worker.

## Deployment steps

### Railway backend

1. Provision a PostgreSQL database on Railway.
2. Set environment variables: `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `PUBLIC_ASSET_BASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
3. Run `pnpm install --frozen-lockfile`.
4. Run `pnpm prisma:generate`.
5. Run `pnpm prisma:migrate:deploy`.
6. Run `pnpm --filter @prism/api build`.
7. Start with `pnpm railway:start`.

### Cloudflare Pages frontend

1. Set `NEXT_PUBLIC_API_BASE_URL` to the Railway API base URL plus `/api`.
2. Build command: `pnpm install --frozen-lockfile && pnpm --filter @prism/web build`.
3. Output directory: `frontend/out`.
4. Ensure HTTPS is enabled so the manifest and service worker remain installable on Android.
5. Upload the `_headers` file to keep the service worker fresh.

### Cloudflare R2 storage

1. Create an R2 bucket for generated documents.
2. Point `PUBLIC_ASSET_BASE_URL` to the public R2 custom domain.
3. If running without R2 during development, the backend serves documents from `/assets/:fileName`.

## Migration plan from the old system

1. Freeze writes on the multi-tenant platform.
2. Export existing tenants, users, opportunities, applications, and attendance data.
3. Collapse tenant/workspace identity into direct entities:
   - tenant admin → `User` with `COLLEGE_COORDINATOR` or `INDUSTRY`
   - tenant profile → `College` or `Industry`
   - learner profile → `Student`
4. Populate `Department` records from workspace-specific academic structures.
5. Translate tenant-level partner relationships into `MoU` rows.
6. Recreate opportunities under `InternshipOpportunity.industryId`.
7. Re-link student applications using `Application.studentId` and `Application.opportunityId`.
8. Rebuild attendance history with `Attendance.studentId`, `Attendance.industryId`, and `Attendance.date`.
9. Run verification queries for duplicates before cutover:
   - duplicate emails in `User`
   - duplicate `universityRegNo` in `Student`
   - duplicate `(collegeId, industryId)` in `MoU`
10. Cut DNS and environment variables to the new Railway + Cloudflare deployment.

## End-to-end validation flow

1. College registers and creates departments.
2. Industry registers and requests an MoU.
3. College approves the MoU and downloads the generated PDF.
4. Industry publishes an internship.
5. Student registers under that college and sees only approved internships.
6. Student applies with one click.
7. Industry accepts the application and triggers an offer letter email/PDF.
8. Industry records attendance for the accepted student.
