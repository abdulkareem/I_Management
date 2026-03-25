# Internship Management Platform (Cloudflare D1) - Production SQL

This document provides a production-grade relational schema, migration commands, seed data, Worker query examples, and error-handling patterns for Cloudflare Workers + D1.

## 1) Full SQL schema

Use `packages/db/schema.sql` as the canonical schema file.

### Highlights
- Full foreign keys with `PRAGMA foreign_keys = ON`.
- Entity-level approval workflow (`pending/approved/rejected`) for colleges and industries.
- Department activation lifecycle fields.
- OTP store with verification and expiration support.
- Role-based identity mapping via `auth_identities` supporting: `superadmin`, `admin`, `college`, `department`, `industry`, `student`, `external_student`.
- Audit trail table (`approval_audit_log`) for compliance and traceability.

## 2) D1 migration commands

```bash
wrangler d1 create internship_db
wrangler d1 execute internship_db --file=./packages/db/schema.sql
```

If you prefer migration numbering:

```bash
wrangler d1 migrations apply internship_db --remote
```

## 3) Seed data

Use `packages/db/seed.sql`.

```bash
wrangler d1 execute internship_db --file=./packages/db/seed.sql
```

This inserts:
- Superadmin: `abdulkareem@psmocollege.ac.in`
- Default industry types

## 4) Worker query examples

> Assumption: `env.DB` is your D1 binding and IDs are generated using `crypto.randomUUID()`.

### 4.1 Insert college (pending)

```ts
await env.DB.prepare(`
  INSERT INTO colleges (
    id, name, address, university, mobile,
    coordinator_name, coordinator_email, password, status, is_active
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
`).bind(
  crypto.randomUUID(),
  body.name,
  body.address ?? null,
  body.university ?? null,
  body.mobile ?? null,
  body.coordinatorName,
  body.coordinatorEmail.toLowerCase(),
  body.passwordHash
).run();
```

### 4.2 Approve college (superadmin)

```ts
await env.DB.batch([
  env.DB.prepare(`
    UPDATE colleges
    SET status = 'approved',
        is_active = 1,
        approved_by_admin_id = ?,
        approved_at = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ? AND status = 'pending'
  `).bind(superadminId, collegeId),

  env.DB.prepare(`
    INSERT INTO approval_audit_log (
      id, entity_type, entity_id, action, previous_status, new_status, actor_admin_id
    ) VALUES (?, 'college', ?, 'approved', 'pending', 'approved', ?)
  `).bind(crypto.randomUUID(), collegeId, superadminId)
]);
```

### 4.3 Insert department

```ts
await env.DB.prepare(`
  INSERT INTO departments (
    id, college_id, name,
    coordinator_name, coordinator_email, coordinator_mobile,
    password, is_active, activated_by_college_id, activated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
`).bind(
  crypto.randomUUID(),
  body.collegeId,
  body.name,
  body.coordinatorName,
  body.coordinatorEmail.toLowerCase(),
  body.coordinatorMobile ?? null,
  body.passwordHash,
  body.collegeId
).run();
```

### 4.4 Get students by department

```ts
const result = await env.DB.prepare(`
  SELECT s.id, s.name, s.email, s.phone, s.created_at,
         p.name AS program_name
  FROM students s
  JOIN programs p ON p.id = s.program_id
  WHERE s.department_id = ?
  ORDER BY s.created_at DESC
`).bind(departmentId).all();
```

### 4.5 Accept internship application

```ts
await env.DB.prepare(`
  UPDATE internship_applications
  SET status = 'accepted',
      reviewed_by_industry_id = ?,
      reviewed_at = datetime('now'),
      updated_at = datetime('now')
  WHERE id = ? AND status = 'pending'
`).bind(industryId, applicationId).run();
```

## 5) Error-handling patterns

### Duplicate email handling

```ts
try {
  // insert...
} catch (err: any) {
  if (String(err?.message ?? '').includes('UNIQUE constraint failed')) {
    return Response.json({
      ok: false,
      code: 'DUPLICATE_EMAIL',
      message: 'Email already exists.'
    }, { status: 409 });
  }
  throw err;
}
```

### Approval check before login

```ts
const account = await env.DB.prepare(`
  SELECT id, status, is_active
  FROM colleges
  WHERE coordinator_email = ?
`).bind(email).first();

if (!account) {
  return Response.json({ ok: false, message: 'Invalid credentials.' }, { status: 401 });
}

if (account.status !== 'approved' || account.is_active !== 1) {
  return Response.json({
    ok: false,
    code: 'WAITING_FOR_APPROVAL',
    message: 'Your account is waiting for approval.'
  }, { status: 403 });
}
```

### "Waiting for approval" response contract

```json
{
  "ok": false,
  "code": "WAITING_FOR_APPROVAL",
  "message": "Your account is waiting for approval.",
  "status": "pending"
}
```
