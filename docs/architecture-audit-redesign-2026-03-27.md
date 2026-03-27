# Internship Management Platform — Technical Audit & Redesign Blueprint

_Date: 2026-03-27_

## 1) Executive Audit Summary

### Critical findings (from current implementation)

1. **State model is fragmented and non-canonical.**
   - Internships are created as `SENT_TO_DEPARTMENT`, published only when `ACCEPTED`, and public stats still query `OPEN`, which is not in the canonical status constant map.
   - This creates observability mismatch and dashboard confusion.

2. **Vacancy logic is mutable and race-prone.**
   - Vacancy is decremented in a separate `UPDATE` statement after application acceptance.
   - No atomic guard prevents double-allocation when two acceptance requests race.

3. **Visibility is separate from lifecycle but not represented as a unified workflow.**
   - `student_visibility` is toggled independently of status.
   - This is operationally acceptable but semantically fragile because status and visibility are not transition-validated together.

4. **Write paths are inconsistent in durability checks.**
   - Some writes check `result.meta.changes`, some do not.
   - Frontend success UX can become detached from actual persistence results.

5. **Schema evolution is spread between migrations and runtime “ensure” mutations.**
   - Multiple `ensure*Schema` methods run per request path to patch live tables.
   - This increases non-determinism and makes compliance/audit signoff difficult.

---

## 2) Root-Cause Analysis Mapped to Current Code

### A. Vacancy mismatch and over-allocation risk
- Department-side application acceptance decreases vacancy after accepting the application, but without a transactional check that vacancy was still available at commit time.
- The decrement operation (`vacancy = vacancy - 1 when > 0`) is separate from status transition.

**Impact:** can over-accept under concurrent requests; vacancy counters drift.

### B. Idea acceptance -> publish -> student visibility gaps
- Publish route only allows status `ACCEPTED` and toggles `student_visibility`.
- Student listing endpoint filters by both `status='ACCEPTED'` and `student_visibility=1`.

**Impact:** if accepted but not explicitly published (or publish fails silently), students never see approved opportunities.

### C. Inconsistent status taxonomy
- Public stats aggregate vacancy with `status='OPEN'`, but intern lifecycle uses `DRAFT/SENT_TO_DEPARTMENT/ACCEPTED/REJECTED`.

**Impact:** misleading analytics and admin dashboards.

### D. Persistence trust gap
- UI may show successful flow despite partial persistence because not all backend write statements validate changed rows and transaction integrity.

---

## 3) Target Architecture (Production-Ready, Multi-College)

## 3.1 Bounded Contexts

1. **Identity & Access**
   - Users, RBAC policies, organization scoping.
2. **Internship Pipeline**
   - Idea, review, publish, application, allocation lifecycle.
3. **Placement Operations**
   - Vacancy ledger, allocation engine, anti-overbooking.
4. **Outcome Evaluation**
   - CO-PO mapping definitions, scoring, attainment reports.
5. **Notifications & Audit**
   - Event outbox + delivery logs + immutable transition history.

## 3.2 Source-of-Truth Model

- `internship_ideas` holds draft/review intent from department.
- `internships` holds publishable allocation artifact.
- **Single lifecycle state** (`workflow_state`) is mandatory and transition-validated.
- Vacancy is controlled by **one authoritative record** (`internships`) with `total_vacancy`, `filled_vacancy`, `remaining_vacancy` and strict checks.

---

## 4) Revised Relational Schema (D1-Safe SQL)

> Full executable SQL is provided in `docs/sql/internship-platform-v2.sql`.

### Core design choices
- Emulate enums via `TEXT CHECK (...)` for SQLite/D1.
- Keep both `created_at` and `updated_at` on every transactional table.
- Add `deleted_at` only on soft-delete domains.
- Add `version` integer on high-contention rows for optimistic locking.

### Core tables included
- `users`
- `departments`
- `organizations`
- `internship_ideas`
- `internships`
- `applications`
- `allocations`
- `evaluation_schemes`, `evaluation_components`, `evaluation_results`
- `workflow_transitions` (append-only state history)
- `notifications`, `outbox_events`

---

## 5) Workflow Engine (Canonical State Machine)

```text
IDEA_SUBMITTED
  -> IPO_REVIEW
  -> ACCEPTED
  -> PUBLISHED
  -> STUDENT_APPLY
  -> ALLOCATED
  -> COMPLETED
  -> EVALUATED
```

### Allowed transitions
- `IDEA_SUBMITTED -> IPO_REVIEW`
- `IPO_REVIEW -> ACCEPTED | REJECTED`
- `ACCEPTED -> PUBLISHED`
- `PUBLISHED -> STUDENT_APPLY`
- `STUDENT_APPLY -> ALLOCATED`
- `ALLOCATED -> COMPLETED`
- `COMPLETED -> EVALUATED`

### Enforcement contract
- Backend endpoint must call a shared transition validator:
  - validates current -> next state,
  - writes transition row in `workflow_transitions`,
  - updates aggregate flags (`is_published`, timestamps),
  - emits `outbox_events`.

---

## 6) API Refactor Plan (Route + Logic)

## 6.1 POST `/internship-idea`
- Validate payload (`title`, `departmentId`, `organizationId`, `vacancy`).
- Insert `internship_ideas` as `IDEA_SUBMITTED`.
- Append transition history.

## 6.2 POST `/accept-idea`
- Ensure actor role = IPO reviewer.
- Transition `IPO_REVIEW -> ACCEPTED`.
- Materialize/refresh `internships` row with vacancy fields initialized.

## 6.3 POST `/publish-idea`
- Require `workflow_state='ACCEPTED'`.
- Transition `ACCEPTED -> PUBLISHED`.
- Set `published_at` + `is_published=1`.

## 6.4 GET `/student/internships`
- Only `is_published=1`, `workflow_state IN ('PUBLISHED','STUDENT_APPLY')`, `remaining_vacancy > 0`.
- Join org + department metadata.

## 6.5 POST `/apply`
- Enforce one active accepted allocation per student (policy flag configurable).
- Prevent duplicate application by unique `(student_id, internship_id)`.
- Transition internship to `STUDENT_APPLY` if first live application.

## 6.6 POST `/allocate`
- **Single transaction**:
  1. Verify application pending.
  2. Atomic vacancy claim: `remaining_vacancy > 0` in same statement.
  3. Set application `ALLOCATED`.
  4. Insert allocation row.
  5. Recompute filled/remaining.
  6. Append workflow transition.

---

## 7) Critical Code Patterns (Implementation Snippets)

## 7.1 Transition guard
```ts
const ALLOWED: Record<WorkflowState, WorkflowState[]> = {
  IDEA_SUBMITTED: ['IPO_REVIEW'],
  IPO_REVIEW: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['PUBLISHED'],
  PUBLISHED: ['STUDENT_APPLY'],
  STUDENT_APPLY: ['ALLOCATED'],
  ALLOCATED: ['COMPLETED'],
  COMPLETED: ['EVALUATED'],
  EVALUATED: [],
  REJECTED: [],
};

export function assertTransition(from: WorkflowState, to: WorkflowState) {
  if (!ALLOWED[from]?.includes(to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }
}
```

## 7.2 Atomic vacancy claim (D1)
```sql
UPDATE internships
SET filled_vacancy = filled_vacancy + 1,
    remaining_vacancy = remaining_vacancy - 1,
    version = version + 1,
    updated_at = datetime('now')
WHERE id = ?
  AND workflow_state IN ('PUBLISHED','STUDENT_APPLY')
  AND remaining_vacancy > 0;
```

Then enforce `meta.changes === 1`; else return `409 Vacancy exhausted`.

## 7.3 End-to-end allocation transaction
```ts
await db.batch([
  claimVacancyStmt,
  markApplicationAllocatedStmt,
  insertAllocationStmt,
  insertWorkflowHistoryStmt,
  insertOutboxEventStmt,
]);
```

---

## 8) Frontend Redesign Plan (React + Tailwind)

## 8.1 Shared component primitives
- `StatusBadge` (state -> color token).
- `WorkflowStepper` (current state + timeline).
- `VacancyMeter` (`filled/total` with warning threshold).
- `ActionBar` (role-aware CTA rendering).

## 8.2 Dashboard plans

### Admin
- KPIs: total published, fill-rate, completion rate, evaluation coverage.
- Pending approvals queue.
- Colleges/IPOs health matrix.

### Department
- Idea submission wizard with server-validated draft saves.
- Timeline view: submitted/review/accepted/published.
- Allocation board by internship.

### IPO
- Review inbox (accept/reject with reason).
- Vacancy configuration (hard limits + notes).
- Publish center with “ready checks”.

### Student
- Search + filters on published opportunities.
- Apply CTA disabled with policy reason tooltip.
- Personal timeline: APPLIED -> SHORTLISTED -> ALLOCATED -> COMPLETED -> EVALUATED.

### UX rules
- Every mutation uses optimistic UI only after API `success=true`.
- Toast always includes server correlation id.
- Progressive disclosure of evaluation details.

---

## 9) Evaluation System (CO-PO) Redesign

1. `evaluation_schemes`: rubric version per program/semester.
2. `evaluation_components`: component weight (report, viva, mentor feedback).
3. `co_po_mappings`: matrix weight per CO->PO.
4. `evaluation_results`: per student allocation.
5. `evaluation_result_lines`: raw component marks.

### Formula transparency
- `component_score = obtained / max * weight`
- `co_attainment = Σ(component_score * co_weight)`
- `po_attainment = Σ(co_attainment * mapping_weight)`

### Audit pack
- Printable PDF sheet includes:
  - raw marks,
  - normalized components,
  - CO-wise attainment,
  - PO rollup,
  - final level band (L1/L2/L3).

---

## 10) Bug Register with Fixes

1. **Status drift (`OPEN` vs lifecycle states).**
   - Fix: replace ad-hoc status filters with `workflow_state` constants only.

2. **Non-atomic vacancy decrement.**
   - Fix: atomic guarded update + transactional allocation.

3. **Publish and visibility not workflow-coupled.**
   - Fix: publish is state transition (`ACCEPTED -> PUBLISHED`) and sets visibility in same transaction.

4. **Runtime schema mutation on live requests.**
   - Fix: remove `ensure*Schema` from request path; run explicit migration pipeline only.

5. **Partial write acknowledgment risk.**
   - Fix: normalize persistence helper that enforces `changes` expectations and throws typed errors.

---

## 11) Scalability & Multi-Tenant Readiness

1. Tenant isolation key (`tenant_id`) on all business tables.
2. Read-model tables for dashboards (`analytics_daily_facts`).
3. Outbox/event bus for async notifications and BI pipelines.
4. Caching layer for published internships query.
5. WebSocket/SSE channel for live status updates.
6. Idempotency keys for mutating APIs.
7. Rate limits by role + endpoint.

---

## 12) Bonus Features Implementation

### Notifications
- In-app notification center + email via queue workers.
- Events: idea accepted, published, application submitted, allocated, evaluation released.

### RBAC
- `roles`, `permissions`, `role_permissions`, `user_roles` tables.
- Route-level middleware + resource ownership policy checks.

### Analytics dashboard
- Fill rate by department/IPO.
- Time-to-publish SLA.
- Allocation conversion funnel.
- CO/PO attainment trendline by semester.

---

## 13) End-to-End Validation Scenario (Must Pass)

1. Department submits idea.
2. IPO accepts.
3. IPO publishes.
4. Student applies.
5. Department/IPO allocates.
6. Internship completed.
7. Evaluation computed and report generated.

Validation assertions:
- No silent write failures.
- `remaining_vacancy` never negative.
- Students only see published internships.
- Transition history is complete and immutable.
- Evaluation report reproducible from raw rows.
