# InternSuite Cloudflare SaaS Monorepo

## Structure

```text
backend/   # Cloudflare Worker API + D1 bindings
frontend/  # Next.js frontend deployed on Cloudflare Pages
packages/
  db/      # D1 SQL migrations
  types/   # shared types
  utils/   # shared helpers
```

## Required env vars

### Frontend (`frontend`)
- `NEXT_PUBLIC_API_BASE_URL` (must point to your Worker URL)

### API Worker (`backend`)
- `DB` (D1 binding)
- `RESEND_API_KEY` (required for admin OTP emails)

## D1 binding (`frontend/wrangler.toml`)

```toml
[[d1_databases]]
binding = "DB"
database_name = "internsuite-db"
database_id = "<your-database-id>"
```

## API Routes

- `GET /api/health`
- `GET /api/colleges`
- `GET /api/departments?collegeId=...`
- `GET /api/courses?departmentId=...`
- `GET /api/ipo-types`
- `POST /api/college/register`
- `POST /api/student/register`
- `POST /api/ipo/register`
- `POST /api/admin/send-otp`
- `POST /api/admin/verify-otp`

All responses use:

```json
{
  "success": true,
  "message": "string",
  "data": {}
}
```

## Deploy

1. Run D1 migrations in `packages/db/migrations`.
2. Configure `frontend/wrangler.toml` with your Cloudflare Worker name/domain, D1, and runtime vars.
3. Add secrets in Cloudflare (for example `RESEND_API_KEY`) using `wrangler secret put` or the dashboard.
4. Set `NEXT_PUBLIC_API_BASE_URL` in Pages project to your Worker URL.
5. Deploy web: `npm run deploy:web`.
