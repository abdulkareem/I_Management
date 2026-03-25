# Backend Rebuild Audit (Cloudflare Worker + D1)

## Rebuilt API Surface

### Registration + Login + OTP
- `POST /api/college/register`
- `POST /api/college/login`
- `POST /api/industry/register`
- `POST /api/industry/login`
- `POST /api/student/register`
- `POST /api/student/login`
- `POST /api/external-student/apply`
- `POST /api/admin/send-otp`
- `POST /api/admin/verify-otp`
- `POST /api/auth/login` (compatibility route for frontend)

### Supporting List/Data APIs
- `GET /api/health`
- `GET /api/colleges`
- `GET /api/departments?collegeId=...`
- `GET /api/courses?departmentId=...` (returns `programs` table rows for compatibility)
- `GET /api/industry-types`
- `GET /api/internships/public` (alias: `/internships/public`)

### Dashboard APIs
- `GET /api/dashboard/superadmin` (alias: `/super-admin/dashboard`)
- `GET /api/dashboard/college` (alias: `/college/dashboard`)
- `GET /api/dashboard/department` (alias: `/department/dashboard`)
- `GET /api/dashboard/industry` (alias: `/industry/dashboard`)
- `GET /api/dashboard/student` (alias: `/student/dashboard`)

## Strict Mapping: Frontend ↔ Backend ↔ DB

| Flow | Frontend input | Backend normalized field | DB column |
|---|---|---|---|
| College register | `collegeName` | `name` | `colleges.name` |
| College register | `coordinatorName` | `coordinator_name` | `colleges.coordinator_name` |
| College register | `email` | `coordinator_email` | `colleges.coordinator_email` |
| College register | `address` | `address` | `colleges.address` |
| College register | `university` | `university` | `colleges.university` |
| College register | `mobile` | `mobile` | `colleges.mobile` |
| College register/login | `password` | `password` | `colleges.password` |
| Industry register | `companyName` | `name` | `industries.name` |
| Industry register/login | `email` | `email` | `industries.email` |
| Industry register/login | `password` | `password` | `industries.password` |
| Industry register | `businessActivity` | `business_activity` | `industries.business_activity` |
| Industry register | `industryTypeId` | `industry_type_id` | `industries.industry_type_id` |
| Student register | `studentName` | `name` | `students.name` |
| Student register/login | `email` | `email` | `students.email` |
| Student register/login | `password` | `password` | `students.password` |
| Student register | `collegeId` | `college_id` | `students.college_id` |
| Student register | `departmentId` | `department_id` | `students.department_id` |
| Student register | `courseId` | `program_id` | `students.program_id` |
| External apply | `fullName` | `name` | `external_students.name` |
| External apply | `email` | `email` | `external_students.email` |
| External apply | `phone` | `phone` | `external_students.phone` |
| External apply | `whatsapp` | `whatsapp` | `external_students.whatsapp` |
| External apply | `college` | `college` | `external_students.college` |
| External apply | `university` | `university` | `external_students.university` |
| External apply | `regNumber` | `reg_number` | `external_students.reg_number` |
| External apply | `department` | `department` | `external_students.department` |
| External apply | `password` | `password` | `external_students.password` |
| External apply | `internshipId` | `internship_id` | `internship_applications.internship_id` |
| Admin OTP | `email` | `email` | `otp_codes.email` |
| Admin OTP verify | `otp` | `otp` | `otp_codes.otp` |

## Removed Error Classes

- Removed table/column mismatches:
  - `super_admins` → `admins`
  - `otps`/`expiresAt` → `otp_codes`/`expires_at`
  - `colleges.collegeName` → `colleges.name`
  - `colleges.email` → `colleges.coordinator_email`
  - `departments.collegeId` → `departments.college_id`
  - `courses` table usage → `programs`
  - `industries.companyName` → `industries.name`
  - `industries.industryTypeId` → `industries.industry_type_id`
  - `students.studentName` → `students.name`
  - `students.courseId` → `students.program_id`

- Removed status mismatch:
  - uppercase status values (e.g., `PENDING`) replaced with schema-valid lowercase values (`pending`, `approved`, `rejected`).

- Added consistent CORS + `OPTIONS` handling to stop preflight failures.

- Added consistent `{ success, message }` error envelope for validation and DB errors.

## Approval Behavior

- Registration inserts college/industry in `pending` state.
- Login for college/industry is blocked until `status = approved` and `is_active = 1`.
- Blocked logins return: `Waiting for approval`.

## Validation Behavior

- Required field checks implemented per route.
- Duplicate email checks implemented for college/industry/student/external student.
- Foreign key integrity checks implemented for student registration (`college_id`, `department_id`, `program_id`) and external application (`internship_id`).

## Logging + Debug

- Route logs: `console.log("PATH:", ...)`.
- Payload logs: `console.log("BODY:", ...)`.
- Error logs: `console.error("DB_ERROR:", ...)`.

## Testing Checklist

1. Typecheck worker: `npm run -w backend typecheck`.
2. Register college/industry/student/external student via API.
3. Verify duplicate email conflict responses.
4. Verify approval-blocked login for pending college/industry.
5. Verify superadmin OTP send and verify flow.
6. Verify dashboard API payloads for each role with Bearer token.
7. Verify CORS preflight on all POST endpoints.
