You are a senior full-stack engineer (Node.js + Express + Prisma + Cloudflare D1 + React).

Upgrade the existing internship management system into a **University-Compliant Internship Evaluation & Outcome Management Platform with Audit-Ready Transparency**.

## Non-Negotiable Constraint

- **Do not change existing business logic or current workflows.**
- All updates must be **additive, backward-compatible, and modular**.
- Existing routes/UI behavior should continue to work as-is.

---

# 🎯 OBJECTIVE

Build a **complete internship lifecycle system** that includes:

- CO–PO mapping
- Student application workflow (internal + external)
- Internship evaluation (CCA + ESE)
- Outcome assessment engine (multi-evaluator weighted system)
- Fully transparent calculation reporting (audit-ready)
- Printable reports + email delivery

System must comply with **University, NAAC, NBA, and audit verification standards**.

---

# 👥 USER ROLES

- Admin
- Department Coordinator
- Industry Supervisor
- Student

---

# 🧩 1. DEPARTMENT DASHBOARD ENHANCEMENT

Page:
https://i-management.pages.dev/dashboard/department

## Add Card: "Internship Outcomes Setup"

### Features

- Add Internship Course Outcomes (CO1–CO6)
- Add Internship Programme Outcomes (PO1–PO10)

### Tables

#### `internship_cos`

- id
- code
- description
- department_id

#### `internship_pos`

- id
- code
- description
- department_id

## Integration with Internship Idea

Inside:
### "Suggest Industry Internship Idea"

Allow mapping:

- Internship → COs
- Internship → POs

Table:

#### `internship_outcome_map`

- id
- internship_id
- outcome_id
- type (CO / PO)

---

# 📥 2. APPLICATION MANAGEMENT SYSTEM

## Internal Applications

Display:

- Student Name
- Email
- Internship Title

Actions:

- Accept
- Reject
- Mark Completed

## When "Mark Completed" is clicked

Enable button:

### "Enter Evaluation"

## External Applications

Section:
### "Applications Received from External Students"

Same workflow:

- Accept / Reject
- Mark Completed → Enable evaluation

---

# 📊 3. INTERNSHIP EVALUATION ENGINE

## 🎯 Module: Internship Evaluation Engine

## CCA (30% = 15 Marks)

| Component     | Input                  | Marks | Logic           |
| ------------- | ---------------------- | ----- | --------------- |
| Attendance    | System                 | 9     | Auto from hours |
| Work Register | Department Coordinator | 6     | Manual          |

## ESE (70% = 35 Marks)

| Component    | Input                  | Marks |
| ------------ | ---------------------- | ----- |
| Presentation | Department Coordinator | 14    |
| Viva         | Department Coordinator | 14    |
| Report       | Department Coordinator | 7     |

## Database Table

#### `internship_evaluations`

- id
- student_id
- internship_id
- attendance_marks
- work_register_marks
- presentation_marks
- viva_marks
- report_marks
- cca_total
- ese_total
- final_total
- created_at

## Calculation Logic

- CCA = attendance + work_register
- ESE = presentation + viva + report
- Final Total = CCA + ESE

---

# 🧾 4. PRINTABLE MARK STATEMENT

Generate:
### "Internship Evaluation Report"

Include:

- Student details
- Internship details

### Marks Table

| Component     | Marks |
| ------------- | ----- |
| Attendance    | X/9   |
| Work Register | X/6   |
| CCA Total     | X/15  |
| Presentation  | X/14  |
| Viva          | X/14  |
| Report        | X/7   |
| ESE Total     | X/35  |
| Final Total   | X/50  |

## Show Calculation

- CCA = Attendance + Work Register
- ESE = Presentation + Viva + Report
- Final = CCA + ESE

## Output

- Print (A4)
- Download PDF

---

# 📧 5. EMAIL SYSTEM

After evaluation, send email containing:

- Student Name
- Internship Title
- Final Marks
- Attached PDF report

---

# 🧠 6. OUTCOME ASSESSMENT ENGINE (CO–PO)

## Multi-Evaluator Inputs

- Student (20%)
- Industry Supervisor (50%)
- Department Coordinator (30%)

## Database Update

#### `outcome_results`

- student_score
- supervisor_score
- coordinator_score
- weighted_score
- percentage

---

# 🧮 7. CALCULATION TRANSPARENCY (CRITICAL)

System MUST store and display all intermediate calculations.

## Formula 1: Weighted Score

Final Score =
(Student × 0.2) + (Industry Supervisor × 0.5) + (Department Coordinator × 0.3)

## Formula 2: Percentage

Percentage (%) = (Final Score / 5) × 100

## Formula 3: CO Achievement

CO Achievement (%) = Average of all CO percentages

## Formula 4: PO Achievement

PO Achievement (%) = Average of all PO percentages

---

# 📄 8. PRINTABLE OUTCOME ACHIEVEMENT STATEMENT

## SECTION 1: Student & Internship Details

## SECTION 2: Evaluation Weights

| Evaluator              | Weight |
| ---------------------- | ------ |
| Student                | 20%    |
| Industry Supervisor    | 50%    |
| Department Coordinator | 30%    |

## SECTION 3: Outcome-wise Calculation Table

| Outcome | Student | Supervisor | Coordinator | Calculation | Final Score | % |

### Calculation Column Format (MANDATORY)

Example:

Final Score = (4 × 0.2) + (5 × 0.5) + (4 × 0.3)
= 0.8 + 2.5 + 1.2
= 4.5

Percentage = (4.5 / 5) × 100 = 90%

## SECTION 4: CO Summary

CO Achievement (%) = (Sum of CO %) / Number of COs

## SECTION 5: PO Summary

Same as CO.

## SECTION 6: Performance Classification

| %     | Level        |
| ----- | ------------ |
| <50   | Beginner     |
| 50–60 | Basic        |
| 60–75 | Intermediate |
| 75–90 | Proficient   |
| >90   | Advanced     |

## SECTION 7: Interpretation

Strengths:

- ≥ 75%

Gaps:

- < 60%

## SECTION 8: Declaration

"This report is generated based on a structured, multi-evaluator, weighted assessment system aligned with CO–PO mapping standards."

---

# 📊 9. API REQUIREMENTS

`GET /outcome/report/:student_id`

Return:

- raw_scores
- weighted_scores
- calculation_steps
- percentages
- classification
- strengths
- gaps

---

# 🎨 10. FRONTEND (PRINT VIEW)

- A4 optimized
- Clear equations
- Table aligned
- No truncation
- Download PDF button

---

# 🔐 11. VALIDATION RULES

- Evaluation only after "Mark Completed"
- All evaluators must submit
- Prevent duplicate entries
- Lock after finalization

---

# ⚡ 12. PERFORMANCE OPTIMIZATION

- No heavy uploads
- Structured data only
- On-demand PDF generation

---

# 🚀 EXPECTED OUTPUT

- Full internship lifecycle system
- CO–PO integrated evaluation
- Transparent, audit-ready calculations
- Printable + emailable reports
- Clean UI + scalable backend

---

Ensure modular architecture, clean APIs, and production-grade code quality.
