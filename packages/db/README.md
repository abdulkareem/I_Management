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
