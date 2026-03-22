# Internship Cloud ERP for Colleges

Internship Cloud ERP is a production-oriented multi-tenant SaaS PWA for colleges that need to manage internship governance, host-industry collaboration, semester-based student lifecycles, archival retention, payments, attendance, evaluation, and academic compliance under existing university internship frameworks.

## Platform Highlights

- **College-paid SaaS model** where colleges are the only paying customers.
- **Free industry participation** to grow internship supply without subscription friction.
- **Semester lifecycle architecture** so completed students move to archive and stop counting in active billing.
- **Logical multi-tenancy** with isolated college dashboards, billing, students, and analytics.
- **Shared internship discovery** through public and selected-college listing visibility.
- **PWA-ready Next.js frontend** for mobile-first access and installability.
- **Node.js + PostgreSQL + Prisma backend** ready for Railway deployment.
- **Preserved compliance engine** for internship duration, semester window, MoU, private provider, own-college, and evaluation rules.

## Monorepo Layout

- `frontend/` – Next.js PWA frontend with lifecycle-focused role dashboards and public onboarding pages.
- `backend/` – Fastify backend for Railway with production deployment hooks, auth, file-storage, document-engine, and ERP blueprint endpoints.
- `packages/database` – Prisma schema for multi-tenant identity, internship lifecycle automation, generated documents, and storage isolation.
- `packages/compliance` – University rule engine that preserves existing workflow logic.
- `packages/types` – Shared domain and reporting types.
- `docs/saas-upgrade.md` – Cost model, pricing strategy, architecture decisions, and SaaS readiness blueprint.

## Core Rules Preserved

The compliance package continues to enforce:

1. Internship type tagging for major, minor, interdisciplinary, and allied streams.
2. Minimum hours of **60**, or **120** for **BBA/BCA**.
3. Approved provider categories only.
4. External internship submissions through portals such as KSHEC.
5. Private organization validation against 10-year experience or 10+ year partner linkage.
6. Mandatory MoU upload before private industry approval.
7. Department council approval workflow.
8. Own-college internship restriction.
9. Multiple internship support with consolidated reporting.
10. Online and offline internship modes.
11. Semester 1–5 and schedule-safe timeline guardrails.
12. Mandatory host-industry supervisor assignment.
13. Digital logbook + supervisor approval flow.
14. Report, certificate, and work-register submission before semester 6.
15. English and Malayalam report support.
16. Evaluation split: **CCA 15 / ESE 35 / Total 50**.

## Getting Started

```bash
pnpm install
pnpm --filter @prism/database prisma:generate
pnpm dev
```

## Deployment Targets

- **Frontend:** Cloudflare Pages
  - Root directory: `frontend`
  - Build command: `pnpm --filter @prism/web build`
  - Output directory: `out`
- **Backend:** Railway
- **Database:** PostgreSQL

## Key Product Pages

- `/` – Landing page for colleges
- `/pricing` – College-only pricing and cost comparison
- `/portal/college` – Semester operations dashboard
- `/portal/student` – Student application workspace
- `/portal/industry` – Free industry posting panel
- `/portal/college/archive` – Past internship records and archived students
- `/portal/college/partners` – Connected institutions and sharing rules
- `/portal/super-admin` – SaaS profitability and readiness overview
