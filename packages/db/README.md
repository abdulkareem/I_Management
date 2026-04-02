# D1 Schema

This repo now uses a **single merged migration**:

```bash
wrangler d1 execute internsuite-db --file ./packages/db/migrations/0001_init.sql --remote
```

For local development:

```bash
wrangler d1 execute internsuite-db --file ./packages/db/migrations/0001_init.sql --local
```
