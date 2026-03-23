# InternSuite Single-Workspace Platform

InternSuite is a production-ready full-stack PWA built as two standalone npm apps:

- `backend/` – Fastify + Prisma API for Railway.
- `frontend/` – Next.js PWA for Cloudflare.

There are no workspace dependencies, no pnpm workspace files, and no shared package indirection.

## Folder Structure

```text
backend/
  prisma/
  src/
frontend/
  app/
  components/
  lib/
  public/
```

## Local Development

```bash
npm install --prefix backend
npm install --prefix frontend
npm run dev --prefix backend
npm run dev --prefix frontend
```

## Production Deployment

### Railway Backend

```bash
npm install --prefix backend
npm run prisma:generate --prefix backend
npm run build --prefix backend
npm run prisma:migrate:deploy --prefix backend
npm run start --prefix backend
```

Required environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `APP_URL`
- `PUBLIC_ASSET_BASE_URL`
- `RESEND_API_KEY` (optional)
- `RESEND_FROM_EMAIL` (optional)

### Cloudflare Frontend

```bash
npm install --prefix frontend
npm run build --prefix frontend
```

Suggested Cloudflare settings:

- Framework preset: `Next.js`
- Root directory: repository root
- Build command: `npm run pages:build` (the checked-in `wrangler.toml` uses this automatically)
- Build output directory: `frontend/out`
- Node version: `18+`

## Product Experience

- **Student-first mobile UX** with one-tap internship applications and status tracking.
- **College dashboard** for MoU approvals and student monitoring.
- **Industry dashboard** for opportunity publishing, candidate review, and attendance management.
- **PWA installability** via manifest, service worker, offline route, and Android-friendly metadata.
