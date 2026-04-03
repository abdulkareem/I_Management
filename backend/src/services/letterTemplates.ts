export type LetterTemplateData = {
  studentName: string;
  internshipTitle: string;
  department: string;
  programme: string;
  college: string;
  industryName?: string | null;
  duration: number;
  mode: string;
  registerNumber?: string | null;
  period?: string;
  supervisorName?: string | null;
  supervisorDesignation?: string | null;
};

export const templates = {
  approval: (data: LetterTemplateData) => [
    'INTERNSHIP APPROVAL LETTER',
    `Department: ${data.department}`,
    `Internship Title: ${data.internshipTitle}`,
    `Programme: ${data.programme}`,
    `Duration: ${data.duration} hours`,
    `Mode: ${data.mode}`,
    `Student Name: ${data.studentName}`,
    `College: ${data.college}`,
  ].join('\n'),
  allotment: (data: LetterTemplateData) => [
    'STUDENT INTERNSHIP ALLOTMENT LETTER',
    `Student Name: ${data.studentName}`,
    `Register No: ${data.registerNumber ?? '-'}`,
    `Programme: ${data.programme}`,
    `Organization: ${data.industryName ?? '-'}`,
    `Duration: ${data.duration} hours`,
    `Period: ${data.period ?? `${data.duration} hours`}`,
  ].join('\n'),
  acceptance: (data: LetterTemplateData) => [
    'INTERNSHIP ACCEPTANCE LETTER',
    `Organization: ${data.industryName ?? '-'}`,
    `Internship Title: ${data.internshipTitle}`,
    `Student Name: ${data.studentName}`,
    `Programme: ${data.programme}`,
    `Department: ${data.department}`,
    `Supervisor: ${data.supervisorName ?? '-'}`,
    `Supervisor Designation: ${data.supervisorDesignation ?? '-'}`,
  ].join('\n'),
};
