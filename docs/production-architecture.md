# InternSuite Production Architecture Blueprint

## 1. Deployment Stability on Railway

- **Package manager:** PNPM only. The repository now declares `packageManager: pnpm@10.13.1`, uses a shared workspace lockfile, and removes any documented npm build path.
- **Monorepo resolution:** Railway installs dependencies from the repository root so `workspace:*` dependencies are resolved before the backend service is built.
- **Build pipeline:** `nixpacks.toml` enables Corepack, activates PNPM, runs `pnpm install --frozen-lockfile`, executes `prisma generate`, and builds the entire workspace.
- **Runtime pipeline:** the start command runs `prisma migrate deploy` before starting the Fastify API service, which is the correct pattern for non-interactive Railway releases.

## 2. Authentication and Identity

- **Primary identity:** email is the only canonical login identifier.
- **Student identity hardening:** student registration requires `collegeStudentId` and `universityRegistrationNumber`, while the Prisma schema adds `@@unique([email, universityRegistrationNumber])`.
- **Verification:** registration creates a pending identity and sends both OTP and verification-link options through Resend-compatible delivery.
- **Password creation:** users cannot create passwords until email verification succeeds.
- **Session model:** JWT access tokens are issued with a revocable session identifier so logout and forced revocation are possible.

## 3. File Storage and Media Controls

- **Provider:** Cloudflare R2 through S3-compatible presigned uploads.
- **Validation:** upload policies are centralized by asset type.
  - College logo: 300 KB.
  - Industry logo: 300 KB.
  - Student passport photo: **200 KB**.
  - Student resume: 2 MB PDF.
  - Generated PDFs: 5 MB.
- **Isolation:** every object key is tenant-scoped to prevent cross-college leakage.

## 4. Reusable Document Engine

Document templates are standardized as generated assets backed by `GeneratedDocument` and `FileStorage` records.

### Supported documents
1. **MoU**
2. **Internship approval letter**
3. **Attendance report**
4. **Final marksheet**

### Generation flow
1. Resolve role authorization and tenant ownership.
2. Fetch logos and supporting uploads from storage metadata.
3. Inject workflow data into the selected template version.
4. Render and store the PDF in R2.
5. Persist the resulting URL and metadata in the database.

## 5. Internship ERP Lifecycle

1. Industry posts an internship with terms and selected colleges.
2. College reviews and approves the request.
3. System generates the MoU PDF.
4. Student applies from a verified account.
5. College approves/rejects the application.
6. System generates the internship approval letter.
7. Industry supervisor submits attendance batches.
8. College reviews attendance and publishes the attendance report.
9. College records evaluation and issues the final marksheet.

## 6. Multi-Tenant Data Model

The Prisma schema now includes the following production entities:

- `Tenant`
- `User`
- `Session`
- `IdentityChallenge`
- `College`
- `Industry`
- `Student`
- `Internship`
- `InternshipTargetCollege`
- `CollegeApproval`
- `Application`
- `Mou`
- `AttendanceBatch`
- `AttendanceRecord`
- `Evaluation`
- `Marksheet`
- `FileStorage`
- `GeneratedDocument`

### Isolation rules
- Every operational record stores `tenantId`.
- Student, application, attendance, and evaluation records also store college-specific ownership to support row-level filtering.
- File keys are namespaced by tenant and entity.

## 7. Frontend Structure

### Public pages
- `/`
- `/pricing`
- `/internships`
- `/signup/college`
- `/signup/student`
- `/signup/industry`
- `/verify-email`
- `/forgot-password`
- `/reset-password`

### Role dashboards
- `/portal/college`
- `/portal/student`
- `/portal/industry`
- `/portal/super-admin`

## 8. Recommended Environment Variables

- `DATABASE_URL`
- `JWT_SECRET`
- `APP_BASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`

## 9. QA Strategy

- Auth flow smoke tests verify register → verify → set password → login.
- Upload policy smoke tests verify student passport photos remain capped at 200 KB.
- `prisma validate` should run in CI with a valid `DATABASE_URL`.
- Railway release validation should confirm migrations deploy before API startup.
