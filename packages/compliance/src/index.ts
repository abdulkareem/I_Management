import type {
  AllocationResult,
  ComplianceResult,
  EvaluationMarks,
  InternshipDraft,
  PaymentRule,
  ProgramCode,
  SeatInventory,
  StudentRankingInput,
} from '@prism/types';

const DEFAULT_MIN_HOURS = 60;
const EXTENDED_HOUR_PROGRAMS: ProgramCode[] = ['BBA', 'BCA'];
const REPORT_LANGUAGES = ['English', 'Malayalam'];

export function getMinimumRequiredHours(program: ProgramCode): number {
  return EXTENDED_HOUR_PROGRAMS.includes(program) ? 120 : DEFAULT_MIN_HOURS;
}

export function validateInternshipCompliance(draft: InternshipDraft): ComplianceResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const minimumHoursRequired = getMinimumRequiredHours(draft.studentProgram);

  if (draft.totalHours < minimumHoursRequired) {
    errors.push(`Minimum internship hours requirement is ${minimumHoursRequired}.`);
  }

  if (draft.isOwnCollege) {
    errors.push('Internship cannot be completed in the student’s own college.');
  }

  if (draft.semester < 1 || draft.semester > 5) {
    errors.push('Internship is only permitted between semesters 1 and 5.');
  }

  if (draft.affectsAcademicSchedule) {
    errors.push('Internship must not affect the academic schedule.');
  }

  if (!draft.vacationPreferred) {
    warnings.push('Internship is preferably scheduled during vacation periods.');
  }

  if (!draft.industrySupervisorUserId) {
    errors.push('A host-organization internship supervisor is mandatory.');
  }

  if (!draft.departmentCouncilApproved) {
    errors.push('Department council approval is required before final approval.');
  }

  if (draft.providerIsPrivate) {
    const hasExperience = draft.providerYearsOfExperience >= 10;
    const hasExperiencedPartner = (draft.partnerYearsOfExperience ?? 0) >= 10;

    if (!hasExperience && !hasExperiencedPartner) {
      errors.push(
        'Private organizations require 10 years of experience or linkage to a partner with 10+ years of experience.',
      );
    }

    if (!draft.hasMoUUpload) {
      errors.push('A signed MoU upload is mandatory for private organizations.');
    }
  }

  if (draft.externalPlatform === 'KSHEC') {
    warnings.push('KSHEC internships still require internal college approval and compliance review.');
  }

  const start = new Date(draft.startDate);
  const end = new Date(draft.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    errors.push('Internship start and end dates must define a valid positive duration.');
  }

  return {
    isEligible: errors.length === 0,
    errors,
    warnings,
    derived: {
      minimumHoursRequired,
      evaluation: {
        cca: 15,
        ese: 35,
        total: 50,
      },
      reportLanguages: REPORT_LANGUAGES,
    },
  };
}

export function validateEvaluationMarks(marks: EvaluationMarks): string[] {
  const errors: string[] = [];
  if (marks.ccaMarks < 0 || marks.ccaMarks > 15) {
    errors.push('CCA marks must be between 0 and 15.');
  }
  if (marks.eseMarks < 0 || marks.eseMarks > 35) {
    errors.push('ESE marks must be between 0 and 35.');
  }
  return errors;
}

export function getPaymentRule(internshipSource: 'INTERNAL' | 'EXTERNAL'): PaymentRule {
  return {
    internshipSource,
    amountInInr: internshipSource === 'INTERNAL' ? 500 : 1000,
    requiresFacultyVerification: true,
    requiresCoordinatorVerification: true,
  };
}

export function allocateInternshipSeats(
  ranking: StudentRankingInput[],
  inventory: SeatInventory[],
): AllocationResult[] {
  const remainingSeats = new Map(inventory.map((item) => [item.internshipId, item.seats]));
  const allocations: AllocationResult[] = [];

  ranking
    .slice()
    .sort((a, b) => b.rankScore - a.rankScore)
    .forEach((student, index) => {
      for (const preferredInternshipId of student.preferredInternshipIds) {
        const seats = remainingSeats.get(preferredInternshipId) ?? 0;
        if (seats > 0) {
          remainingSeats.set(preferredInternshipId, seats - 1);
          allocations.push({
            internshipId: preferredInternshipId,
            studentId: student.studentId,
            rankScore: student.rankScore,
            allocationRank: index + 1,
          });
          break;
        }
      }
    });

  return allocations;
}

export function buildReportTemplate() {
  return {
    sections: [
      'Title',
      'Student details',
      'Organization',
      'Duration',
      'Work done',
      'Outcomes',
      'Supervisor signature',
    ],
    supportedLanguages: REPORT_LANGUAGES,
    submissionDeadline: 'Before Semester 6',
  };
}
