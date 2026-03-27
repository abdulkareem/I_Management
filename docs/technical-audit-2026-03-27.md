# Technical Audit – UI Readability, Dashboard Logic, and Data Flow

_Date: 2026-03-27_

## Scope covered
- Readability/contrast review of shared UI surfaces (`Card`, dashboard shell, input controls, data tables).
- Student dashboard (`/dashboard/student`) logic and backend data flow verification.
- Cross-page architecture check for dashboard and registration flows against current backend endpoints and D1 schema migrations.

## Findings

### 1) UI readability issue root cause
- The app shell and dashboard cards were using light translucent backgrounds with several text styles hard-coded for dark themes (`text-white`, `text-slate-300`, `text-cyan-200`).
- This caused low contrast and mixed-theme rendering depending on card and section composition.

### 2) `/dashboard/student` data and logic audit
- Data source: `GET /student/dashboard` from `frontend/app/dashboard/student/page.tsx`.
- Actions:
  - Apply to internships via `POST /api/applications`.
  - Open IPO profile via `GET /api/ipo/:industryId`.
  - Email marksheet via `POST /api/student/applications/:applicationId/marksheet/email`.
- Selection constraints are correctly enforced in UI with:
  - max active applications (`maxSelectableApplications`),
  - active lock (`activeApplicationLock`), and
  - dynamic available slots (`availableSlots` memo).
- UX bug fixed: successful marksheet email previously reused `error` state; now uses dedicated success notice state.

### 3) Menu/cards/fields database integration status
- Student dashboard cards and table fields are already backed by server DTOs from the student dashboard response and related API calls.
- No static/mock values were found in the student dashboard data path for internships, policy, application status, or IPO details.

## Upgrades completed in this change
1. Increased contrast for global glass surfaces and default typography baseline.
2. Updated role dashboard shell text/link contrast for readability.
3. Updated shared input field styling to readable light-surface variant.
4. Updated shared data table visual treatment to readable light-surface variant.
5. Updated student dashboard section/table text and badges to high-contrast tokens.
6. Added explicit success notice rendering for marksheet email action.

## Next-phase recommendations (not yet implemented)
- Apply same tokenized contrast updates to `industry`, `college`, and `department` dashboard pages where `text-white` appears on light cards.
- Add explicit API loading/empty/error states in all dashboards using a shared status component.
- Add integration tests for student application constraints (`maxSelectableApplications` and lock behavior).
- Add backend response contracts (zod/io-ts) to prevent schema drift between frontend DTOs and D1 query payloads.
