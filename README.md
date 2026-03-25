# InternSuite Cloudflare SaaS Monorepo

## Structure

```text
apps/
  api/   # Cloudflare Worker (Hono + D1)
  web/   # Next.js frontend deployed on Cloudflare Pages
packages/
  db/    # D1 SQL migrations
  types/ # shared types
  utils/ # shared helpers
```

## Required env vars

### Frontend (`apps/web`)
- `NEXT_PUBLIC_API_BASE_URL`

### API Worker (`apps/api`)
- `DB` (D1 binding)
- `JWT_SECRET`
- `OTP_SECRET`

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
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

1. Create D1 DB and run migration in `packages/db/migrations/0001_init.sql`.
2. Configure `apps/api/wrangler.toml` with database id.
3. Deploy API worker: `npm run deploy:api`.
4. Set `NEXT_PUBLIC_API_BASE_URL` in Pages.
5. Deploy web: `npm run deploy:web`.
