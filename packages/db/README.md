# D1 Schema

Run migrations in order:

```bash
wrangler d1 execute internsuite-db --file ./packages/db/migrations/0001_init.sql --remote
wrangler d1 execute internsuite-db --file ./packages/db/migrations/0002_multitenant_registration.sql --remote
```
