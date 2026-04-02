# Database Schema

This repository keeps Railway PostgreSQL DDL in one canonical file:

```bash
psql "$DATABASE_URL" -f ./packages/db/schema.sql
```

For Prisma projects, apply the SQL first and then sync Prisma metadata if required:

```bash
npm run db:railway:migrate
npm run db:prisma:push
```

## Automatic Prisma sync (create/update tables from schema.prisma)

Use this command to automatically create missing tables and update existing table fields to match `packages/db/prisma/schema.prisma`:

```bash
npm run db:prisma:sync
```

Force sync (for changes that require data-loss acceptance):

```bash
npm run db:prisma:sync:force
```

Backend start now includes automatic Prisma sync before bootstrapping.

## Force-reset and migrate (fresh schema)

To drop all existing tables/fields and recreate the schema from scratch:

```bash
npm run db:railway:reset
```

To also re-sync Prisma metadata immediately after reset:

```bash
npm run db:railway:fresh
```
