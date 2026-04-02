# Frontend/Backend Connectivity Audit — 2026-04-02

## Scope
- Frontend pages scanned: `frontend/app/**/*.tsx`
- API client modules scanned: `frontend/lib/*.ts`
- Backend route sources scanned:
  - `backend/src/server.ts` (Express runtime)
  - `backend/src/services/legacy-api.ts` (Worker/legacy runtime)

## Method
A static route audit was run to:
1. Extract frontend API paths used by `fetchWithSession`, `apiRequest`, and `fetchData`.
2. Extract backend routes from Express declarations and legacy `pathname` checks.
3. Normalize template variables like `${id}` to a generic parameter token and compare route coverage.

## Result Summary
- Frontend API call sites found: **62**
- Matched in backend route inventory: **17**
- Not matched: **45**

## Critical issue fixed in this commit
The Super Admin login flow was failing at `POST /api/admin/send-otp` in the Express server.

Implemented in `backend/src/server.ts`:
- `POST /api/admin/send-otp`
- `POST /api/admin/verify-otp`
- `POST /api/auth/login`

This restores frontend ↔ backend connectivity for admin OTP login in environments using `backend/src/server.ts`.

## Highest-priority remaining gaps
These frontend routes still need backend implementation/alignment:
- Super Admin management dynamic routes: `/api/${entity}/${id}`, `/api/${entity}/${id}/${action}`
- Multiple department workflow endpoints under `/api/department/...` with dynamic IDs
- IPO workflow endpoints under `/api/ipo/...` and `/api/ipo-requests/...`
- Some college/department mutation endpoints with path params

## Notes
- The project currently has two API implementations (Express server and legacy Worker handler). Route parity between them is incomplete and is the main source of page/API disconnections.
- Recommend creating a single canonical OpenAPI spec and generating both frontend API clients and backend route conformance checks from it.
