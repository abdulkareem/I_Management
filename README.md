# PRISM – PSMO Rural Internship & Skill Mission

PRISM is a production-oriented multi-tenant SaaS PWA for colleges that need to manage internship governance, host-industry collaboration, payments, attendance, evaluation, and academic compliance under the University of Calicut FYUGP internship framework.

## Platform Highlights

- **Multi-tenant architecture** for multiple colleges with isolated dashboards and subscriptions.
- **Shared industry network** so approved organizations can partner with several colleges while still signing separate MoUs per college.
- **FYUGP compliance engine** that validates internship type, minimum hours, semester window, own-college restrictions, private organization eligibility, MoU requirements, mandatory host supervisor assignment, and submission deadlines.
- **PWA-ready Next.js frontend** for mobile-first access and installability.
- **Node.js + PostgreSQL + Prisma backend** ready for Railway deployment.
- **AI-ready matching contracts** for internship recommendations, local opportunity discovery, and rank-based allocation.

## Monorepo Layout

- `apps/web` – Next.js Cloudflare Pages frontend.
- `apps/api` – Fastify backend for Railway.
- `packages/database` – Prisma schema for all core entities.
- `packages/compliance` – Calicut FYUGP rule engine.
- `packages/types` – Shared domain types.
- `docs/architecture.md` – System architecture and deployment notes.

## Core Compliance Built In

The shared compliance engine enforces:

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
13. Internship cell structure for principal, coordinator, and department coordinators.
14. Digital logbook + supervisor approval flow.
15. Report, certificate, and work-register submission before semester 6.
16. Report template guidance.
17. English and Malayalam report support.
18. Evaluation split: **CCA 15 / ESE 35 / Total 50**.

## Getting Started

```bash
pnpm install
pnpm --filter @prism/database prisma generate
pnpm dev
```

## Deployment Targets

- **Frontend:** Cloudflare Pages
- **Backend:** Railway
- **Database:** PostgreSQL

## Super Admin

Default super-admin bootstrap email:

- `abdulkareem@psmocollege.ac.in`
