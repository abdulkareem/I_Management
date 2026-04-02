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


## Force-reset and migrate (fresh schema)

To drop all existing tables/fields and recreate the schema from scratch:

```bash
npm run db:railway:reset
```

To also re-sync Prisma metadata immediately after reset:

```bash
npm run db:railway:fresh
```
