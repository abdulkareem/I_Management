# Internship Cloud ERP SaaS Upgrade Blueprint

## 1. Infra cost per college

### Assumptions used

- Railway backend: **$20–50/month**
- Railway PostgreSQL: **$5–20/month**
- Cloudflare frontend hosting: operationally near-zero at current scale
- Hostinger domain + email overhead: **₹800–₹1,200/year**
- Exchange rate used for planning: **₹83/USD**
- Average stored student data: **100 KB**
- Archived student data after compression: **30–40 KB effective footprint**

### Cost baseline

- Annual infra budget for a lean production deployment: roughly **₹65,000–₹70,000/year**.
- At 8,000–10,000 active students platform-wide, the modeled active workflow cost is about **₹8.4 per active student per semester**.
- Archived student storage cost drops to about **₹0.72 per archived student per year** when records become read-only and documents move to compressed storage.

### Per-college examples

| College profile  | Active students | Archived students | Estimated annual infra cost | Recommended annual fee |
| ---------------- | --------------: | ----------------: | --------------------------: | ---------------------: |
| Small college    |             500 |             2,000 |                      ₹4,300 |                ₹22,000 |
| Mid-size college |           1,200 |             4,000 |                      ₹7,200 |                ₹50,000 |
| Large college    |           2,000 |             6,000 |                      ₹9,800 |                ₹75,000 |

## 2. Active vs archived cost model

### Active students

Counted in subscription pricing because they consume:

- API traffic
- authentication and active sessions
- attendance, logbook, and application writes
- approval workflow events
- higher-frequency reporting and notification load

### Archived students

Not counted in active billing because they are:

- read-only
- low-access
- compressed
- mainly retained for reports, accreditation, and placement history

### Storage optimization strategy

1. Keep only essential searchable fields in primary tables.
2. Create archive snapshot records for reporting.
3. Compress resumes, certificates, and reports in object storage.
4. Shift inactive documents to cheaper storage classes where feasible.
5. Remove archived students from active dashboards, seat allocation, and billing counters.

## 3. Final pricing model

### Foundation

- **₹22,000/year**
- Up to **500 active students per semester**
- Up to **2,000 archived students included**
- Basic analytics, internship workflows, and partner-college sharing
- Extra active students: **₹15/student/semester**

### Growth

- **₹50,000/year**
- Up to **2,000 active students per semester**
- Up to **6,000 archived students included**
- Advanced analytics and priority support
- Extra active students: **₹12/student/semester**

### Statewide

- **₹75,000+/year**
- Up to **5,000 active students per semester**
- Up to **20,000 archived students included**
- Multi-campus/statewide rollout features and custom support
- Extra active students: **₹10/student/semester**

### Profitability logic

- Every modeled plan is engineered to maintain **5× or better** gross margin multiples under expected usage.
- Colleges should still be moved up-plan once archive or active-student usage consistently approaches the included limits.

## 4. Archive monetization strategy

### Recommended hybrid model

- Every plan includes a built-in archive allowance.
- When the archive limit is crossed, charge a storage add-on in blocks.

### Recommended pricing

- Foundation: **₹2,000 per extra 500 archived students/year**
- Growth: **₹1,800 per extra 500 archived students/year**
- Statewide: **₹1,500 per extra 500 archived students/year**

### Why hybrid wins

- Easy for colleges to understand
- Avoids punishing normal historical retention
- Keeps long-tail archive costs monetized
- Preserves trust because active billing and archive billing are clearly separated

## 5. Product architecture decisions

### User roles

- **College**: paying tenant, owns student records and internal analytics
- **Student**: linked to one college and one active semester cycle
- **Industry**: free account with controlled student visibility
- **Super Admin**: platform operator

### Isolation rules

- College data isolation is enforced by `collegeId` on tenant-owned records.
- Student access is limited to their own record set and published opportunities.
- Industry access starts only after student application or college assignment.
- Shared listings use explicit sharing tables rather than raw student visibility.

### Semester lifecycle

- Each internship belongs to one semester cycle.
- When the cycle closes, eligible students move from `ACTIVE` to `ARCHIVED`.
- Archived students remain queryable for reports but are removed from active billing and live workflow actions.

## 6. Database upgrade plan

### Additions

- `SemesterCycle`
- `StudentLifecycleStatus`
- `ArchivedStudentSnapshot`
- `InternshipListing`
- `InternshipListingCollege`
- `PartnerCollegeLink`
- `CollegePlanTier`
- `AuthScope`

### Indexing priorities

- `Student(collegeId, lifecycleStatus, semester)`
- `Student(semesterCycleId, lifecycleStatus)`
- `Internship(collegeId, semesterCycleId, status)`
- `Application(collegeId, workflowState)`
- `SemesterCycle(collegeId, status, semesterNumber)`

## 7. API and security upgrades

- Separate JWT audience per role surface: college, student, industry, super admin.
- Tenant guard middleware before business logic execution.
- Archive analytics endpoint for super admin and college billing views.
- Swagger docs updated to describe semester lifecycle and archive-aware SaaS positioning.

## 8. SaaS readiness checklist

- [x] College-only revenue model
- [x] Free industry participation
- [x] Semester-based lifecycle design
- [x] Archive-aware billing strategy
- [x] Mobile-first PWA frontend
- [x] Controlled partner-college sharing
- [x] Multi-tenant schema direction
- [x] Compliance rule preservation
- [ ] JWT implementation middleware
- [ ] Background jobs for automatic semester closure and archival
- [ ] File compression pipeline and object storage lifecycle policies
