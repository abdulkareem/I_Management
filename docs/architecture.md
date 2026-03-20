# PRISM Architecture

## Tenancy Model

- `College` is the primary tenant boundary.
- `UserCollegeMembership` assigns users to one or more colleges with scoped roles.
- `IndustryCollegePartnership` stores per-college partnership state and MoU lifecycle.
- Shared `Industry` records provide a common ecosystem across colleges.

## Core Bounded Contexts

### Admissions & Identity

- Multi-role users: super admin, principal, internship coordinator, department coordinator, faculty mentor, student, industry admin, and industry supervisor.
- College and department mapping.

### Internship Governance

- Applications and internships are separate entities so students can apply, be approved, and then execute.
- Compliance checks happen at draft, approval, and final submission stages.
- Private-industry pathways require MoU, provider validation, and department approval.

### Academic Delivery

- Daily attendance and logbooks.
- Work-register export and PDF-ready report payloads.
- Semester-sensitive report/certificate submission before semester 6.
- Marksheets generated from fixed 15/35 split.

### Commercial SaaS

- College subscriptions priced per student per month.
- Payment verification requires faculty mentor and coordinator review.
- Internal and external internship fee mapping.

### AI & Allocation

- Recommendation payloads combine department, skills, geography, and provider category.
- Rank-based auto-allocation can sort students by score and allocate seats fairly.

## Suggested Production Deployment

- **Cloudflare Pages** for the Next.js app with edge caching and static assets.
- **Railway** for the Node.js API, background jobs, and PDF generation workers.
- **PostgreSQL** as the transactional system of record.
- **Object storage** (S3/R2) for MoUs, reports, certificates, and attendance PDFs.
- **Queue** for WhatsApp alerts, reminders, and report-generation jobs.

## Security Notes

- Tenant-aware row filtering at service and query layers.
- Signed upload URLs for sensitive academic documents.
- Audit logs around approvals, evaluation edits, and payment verification.
- Encrypted secrets for WhatsApp, email, and payment integrations.
