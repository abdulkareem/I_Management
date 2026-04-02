# InternSuite Cloudflare SaaS Monorepo

## Structure

```text
backend/   # Cloudflare Worker API
frontend/  # Next.js frontend for Cloudflare Pages
shared/    # shared contracts (optional), packages/types remains source of truth
packages/
  db/      # D1 SQL migrations
  types/   # shared types
  utils/   # shared helpers
```

## Required env vars

### Frontend (`frontend`)
- `NEXT_PUBLIC_API_BASE_URL` (must point to your backend base URL)

### API Worker (`backend`)
- `DB` (D1 binding)
- `JWT_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

## API ownership

All `/api/*` business logic is served by `backend` (Cloudflare Worker).  
Frontend is UI-only and calls `${NEXT_PUBLIC_API_BASE_URL}/api/...`.

## Build & deploy

1. Install deps: `npm install`
2. Run the consolidated migration:
   - `npm run db:migrate` (remote D1)
   - `npm run db:migrate:local` (local D1)
3. Deploy backend Worker:
   - configure `backend/wrangler.toml` D1 binding
   - `npm run deploy:backend`
4. Deploy frontend to Cloudflare Pages:
   - build command: `npm run build --workspace @internsuite/web`
   - output directory: `.next`
   - set `NEXT_PUBLIC_API_BASE_URL` in Pages environment
