# Production Upgrade - Internship Management Platform (2026-03-27)

## Bug List + Fixes

1. **Low contrast text in login/dashboard cards**
   - Fixed by switching card surfaces to solid white + dark text and updating high-risk `text-white` and low-contrast class usage across dashboard/login screens.
2. **No global primary/secondary/accent theme tokens**
   - Added Tailwind config (`primary`, `secondary`, `accent`) and updated button system to `bg-primary text-white`.
3. **Missing strict workflow schema for IPO → Department → Student flow**
   - Added workflow tables: `internship_mappings`, `applications`, `evaluations`, `internship_feedback`, `users` and upgraded `internships` with vacancy + publish fields.
4. **Vacancy over-allocation risk when accepting applications**
   - Added transactional accept flow in `/api/ipo/application/accept` with guarded update (`filled_vacancy < total_vacancy`) and rollback.
5. **No workflow-specific API contract validation**
   - Added Zod validation for all new workflow APIs.

## Deployment Steps

### 1) Environment Variables

Backend (Worker):
- `JWT_SECRET`
- `OTP_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Frontend (Pages):
- `NEXT_PUBLIC_API_BASE_URL` (points to worker URL)

### 2) Cloudflare D1 binding

Ensure `backend/wrangler.toml` has:
- `[[d1_databases]]`
  - `binding = "DB"`
  - valid `database_name`
  - valid `database_id`
  - `migrations_dir = "migrations"`

### 3) Run migrations

```bash
cd backend
npx wrangler d1 migrations apply internmanagementdata --remote
```

### 4) Deploy Worker

```bash
cd backend
npm run deploy
```

### 5) Deploy Frontend

```bash
cd frontend
npm run build
npm run deploy
```

### 6) Smoke Test (E2E)

1. IPO creates internship (`POST /api/ipo/internship`)
2. Department lists + maps + publishes internship (`GET /api/department/internships`, `POST /api/department/map-internship`, `POST /api/department/publish`)
3. Student reads internships + applies (`GET /api/student/internships`, `POST /api/student/apply`)
4. IPO accepts application and vacancy updates (`POST /api/ipo/application/accept`)
5. IPO completes with feedback (`POST /api/ipo/complete`)
6. Department evaluates (`POST /api/department/evaluate`)
7. Student downloads marksheet from dashboard PDF flow.
