import type {
  ApiEndpointBlueprint,
  GeneratedDocumentBlueprint,
  IdentityBlueprint,
  UploadPolicy,
  WorkflowBlueprint,
} from '@prism/types';
import { getUploadPolicy } from './storage.js';

export const identityBlueprint: IdentityBlueprint = {
  canonicalIdentifier: 'EMAIL',
  studentRequirements: [
    'Students must submit email, college ID, and university registration number.',
    'The data model enforces unique email plus university registration number pairs.',
    'Passwords can only be created after email verification succeeds.',
  ],
  verification: {
    provider: 'RESEND',
    methods: ['OTP', 'LINK'],
    passwordCreationPolicy: 'Minimum 8 characters, hashed with bcrypt before storage.',
  },
  sessions: {
    tokenType: 'JWT',
    rotation: 'Issue a new token per login and persist a revocable session record with JWT ID.',
    revocation: 'Logout and administrative revocation both invalidate the stored session entry.',
  },
};

export const uploadBlueprints: UploadPolicy[] = [
  getUploadPolicy('college-logo'),
  getUploadPolicy('industry-logo'),
  getUploadPolicy('student-passport-photo'),
  getUploadPolicy('student-resume'),
  getUploadPolicy('generated-pdf'),
];

export const documentBlueprints: GeneratedDocumentBlueprint[] = [
  {
    type: 'MOU',
    templateVersion: '2026.03',
    visibility: ['college', 'industry', 'student'],
    requiredAssets: ['college logo', 'industry logo', 'signature placeholders'],
    sections: ['Parties', 'Scope', 'Compliance obligations', 'Signatures'],
  },
  {
    type: 'APPROVAL_LETTER',
    templateVersion: '2026.03',
    visibility: ['college', 'student'],
    requiredAssets: ['college logo', 'student profile', 'internship details'],
    sections: ['Student identity', 'Internship approval', 'Validity', 'Authorized signatory'],
  },
  {
    type: 'ATTENDANCE_REPORT',
    templateVersion: '2026.03',
    visibility: ['college', 'industry', 'student'],
    requiredAssets: ['college logo', 'industry logo', 'attendance matrix'],
    sections: ['Reporting window', 'Attendance summary', 'Supervisor notes', 'College review'],
  },
  {
    type: 'MARKSHEET',
    templateVersion: '2026.03',
    visibility: ['college', 'student'],
    requiredAssets: ['college logo', 'evaluation rubric', 'marks breakup'],
    sections: ['Student profile', 'Evaluation rubric', 'Total marks', 'Result declaration'],
  },
];

export const lifecycleWorkflow: WorkflowBlueprint = {
  name: 'InternSuite internship lifecycle',
  steps: [
    {
      id: 'industry-posting',
      title: 'Industry publishes internship and targets colleges',
      owner: 'industry',
      outputs: ['Internship posting', 'Selected colleges', 'Compliance terms'],
    },
    {
      id: 'college-approval',
      title: 'College approves or rejects the industry request',
      owner: 'college',
      outputs: ['Approval decision', 'MoU trigger'],
    },
    {
      id: 'mou-generation',
      title: 'System generates MoU PDF and stores it in tenant document storage',
      owner: 'system',
      outputs: ['MOU PDF', 'Stored file URL', 'Visibility for all participating roles'],
    },
    {
      id: 'student-application',
      title: 'Student applies and college reviews the application',
      owner: 'student',
      outputs: ['Application record', 'Approval or rejection'],
    },
    {
      id: 'approval-letter',
      title: 'System generates internship approval letter after student approval',
      owner: 'system',
      outputs: ['Approval letter PDF'],
    },
    {
      id: 'attendance',
      title: 'Industry supervisor records attendance and college reviews it',
      owner: 'industry',
      outputs: ['Attendance batches', 'Attendance report PDF'],
    },
    {
      id: 'evaluation',
      title: 'College captures marks and publishes final marksheet',
      owner: 'college',
      outputs: ['Evaluation record', 'Marksheet PDF'],
    },
  ],
};

export const apiBlueprint: ApiEndpointBlueprint[] = [
  { method: 'POST', path: '/api/auth/register/:role', owner: 'system', purpose: 'Create a pending identity and dispatch verification email.' },
  { method: 'POST', path: '/api/auth/verify-email', owner: 'system', purpose: 'Verify a pending user via OTP or verification link token.' },
  { method: 'POST', path: '/api/auth/set-password', owner: 'system', purpose: 'Allow verified users to create their password.' },
  { method: 'POST', path: '/api/auth/login/:role', owner: 'system', purpose: 'Issue JWT-backed session tokens for each role-specific application.' },
  { method: 'POST', path: '/api/auth/forgot-password', owner: 'system', purpose: 'Send time-limited password reset emails via Resend.' },
  { method: 'POST', path: '/api/files/presign', owner: 'system', purpose: 'Generate R2 upload targets with content-type and size validation.' },
  { method: 'GET', path: '/api/erp/workflow', owner: 'system', purpose: 'Expose the end-to-end ERP lifecycle automation blueprint.' },
  { method: 'GET', path: '/api/erp/documents', owner: 'system', purpose: 'Expose reusable PDF template contracts and visibility rules.' },
  { method: 'GET', path: '/api/erp/security', owner: 'system', purpose: 'Expose role isolation, JWT, and data-segmentation policies.' },
];
