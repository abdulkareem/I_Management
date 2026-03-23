import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../server.js';

const studentRegistration = {
  email: 'asha@example.edu',
  role: 'student',
  registration: {
    fullName: 'Asha Student',
    universityRegNo: 'REG-2026-001',
    photoUrl: 'https://cdn.internsuite.app/photo/asha.jpg',
    photoSizeBytes: 180000,
    dob: '2005-05-01',
    whatsappNumber: '919999999999',
    address: 'Calicut, Kerala, India',
    programme: 'BCA',
    year: 3,
    semester: 6,
    collegeId: 'college-demo',
  },
};


test('email discovery routes existing and new users correctly', async () => {
  const app = buildServer();

  const existing = await app.inject({
    method: 'POST',
    url: '/api/auth/discover',
    payload: { email: 'student@internsuite.app', role: 'student' },
  });
  assert.equal(existing.statusCode, 200);
  assert.equal((existing.json() as { exists: boolean; redirectTo: string }).exists, true);
  assert.equal((existing.json() as { redirectTo: string }).redirectTo, '/login/student');

  const fresh = await app.inject({
    method: 'POST',
    url: '/api/auth/discover',
    payload: { email: 'new-college@example.edu', role: 'college' },
  });
  assert.equal(fresh.statusCode, 200);
  assert.equal((fresh.json() as { exists: boolean; redirectTo: string }).exists, false);
  assert.equal((fresh.json() as { redirectTo: string }).redirectTo, '/signup/college');

  await app.close();
});

test('student registration requires OTP verification before password creation', async () => {
  const app = buildServer();

  const registration = await app.inject({
    method: 'POST',
    url: '/api/auth/send-otp',
    payload: studentRegistration,
  });

  assert.equal(registration.statusCode, 201);

  const prematurePassword = await app.inject({
    method: 'POST',
    url: '/api/auth/set-password',
    payload: {
      email: studentRegistration.email,
      password: 'Demo1234',
    },
  });

  assert.equal(prematurePassword.statusCode, 403);
  await app.close();
});

test('verified users can create passwords and authenticate', async () => {
  const app = buildServer();

  const registration = await app.inject({
    method: 'POST',
    url: '/api/auth/send-otp',
    payload: {
      email: 'rahul@company.com',
      role: 'industry',
      registration: {
        industryName: 'Rahul Industries',
        logoUrl: 'https://cdn.internsuite.app/logo/rahul.png',
        logoSizeBytes: 120000,
        industryField: 'IT',
        description: 'Production software engineering internship partner for InternSuite.',
        internshipRoles: ['Backend Intern'],
      },
    },
  });

  const preview = registration.json() as { otpPreview: string };

  const verification = await app.inject({
    method: 'POST',
    url: '/api/auth/verify-otp',
    payload: {
      email: 'rahul@company.com',
      otp: preview.otpPreview,
    },
  });
  assert.equal(verification.statusCode, 200);

  const passwordSet = await app.inject({
    method: 'POST',
    url: '/api/auth/set-password',
    payload: {
      email: 'rahul@company.com',
      password: 'Demo1234',
    },
  });
  assert.equal(passwordSet.statusCode, 200);

  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: 'rahul@company.com',
      password: 'Demo1234',
    },
  });
  assert.equal(login.statusCode, 200);
  assert.ok((login.json() as { accessToken: string }).accessToken);
  await app.close();
});

test('industry posting, student apply, college approve, and marksheet workflow returns expected artifacts', async () => {
  const app = buildServer();

  const collegeLogin = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'college@internsuite.app', password: 'Demo1234' },
  });

  const industryLogin = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'industry@internsuite.app', password: 'Demo1234' },
  });

  const studentLogin = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'student@internsuite.app', password: 'Demo1234' },
  });

  const collegeToken = (collegeLogin.json() as { accessToken: string }).accessToken;
  const industryToken = (industryLogin.json() as { accessToken: string }).accessToken;
  const studentToken = (studentLogin.json() as { accessToken: string }).accessToken;

  const internship = await app.inject({
    method: 'POST',
    url: '/api/industry/internship',
    headers: { authorization: `Bearer ${industryToken}` },
    payload: {
      title: 'Node API Intern',
      description: 'Work on Fastify services, Prisma schema design, and SaaS automation flows.',
      field: 'IT',
      duration: '12 weeks',
      stipend: 10000,
      visibility: 'PUBLIC',
      collegeId: 'college-demo',
    },
  });
  assert.equal(internship.statusCode, 201);
  const internshipId = (internship.json() as { internshipId: string }).internshipId;

  const approveInternship = await app.inject({
    method: 'POST',
    url: '/api/college/approve',
    headers: { authorization: `Bearer ${collegeToken}` },
    payload: { entity: 'internship', targetId: internshipId, status: 'APPROVED' },
  });
  assert.equal(approveInternship.statusCode, 200);

  const application = await app.inject({
    method: 'POST',
    url: '/api/student/apply',
    headers: { authorization: `Bearer ${studentToken}` },
    payload: { internshipId },
  });
  assert.equal(application.statusCode, 201);
  const applicationId = (application.json() as { applicationId: string }).applicationId;

  const approveApplication = await app.inject({
    method: 'POST',
    url: '/api/college/approve',
    headers: { authorization: `Bearer ${collegeToken}` },
    payload: { entity: 'application', targetId: applicationId, status: 'APPROVED' },
  });
  assert.equal(approveApplication.statusCode, 200);

  const evaluation = await app.inject({
    method: 'POST',
    url: '/api/college/evaluation',
    headers: { authorization: `Bearer ${collegeToken}` },
    payload: { studentId: 'student-demo', marks: 93, grade: 'A+', remarks: 'Excellent performance' },
  });
  assert.equal(evaluation.statusCode, 201);
  const marksheetId = (evaluation.json() as { marksheetId: string }).marksheetId;

  const marksheet = await app.inject({
    method: 'GET',
    url: `/api/pdf/marksheet/${marksheetId}`,
    headers: { authorization: `Bearer ${studentToken}` },
  });
  assert.equal(marksheet.statusCode, 200);
  assert.match((marksheet.json() as { fileUrl: string }).fileUrl, /marksheet/);
  await app.close();
});
