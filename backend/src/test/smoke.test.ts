import assert from 'node:assert/strict';
import test from 'node:test';
import { AttendanceStatus, MouStatus, prisma } from '@prism/database';
import { buildServer } from '../server.js';

const nowIso = new Date('2026-03-23T10:00:00.000Z').toISOString();

test('single workspace platform covers college registration, MoU approval, student application, acceptance, and attendance', async () => {
  const app = buildServer();
  await app.ready();

  const collegeRegister = await app.inject({
    method: 'POST',
    url: '/api/auth/register/college',
    payload: {
      email: 'principal@testcollege.edu',
      password: 'Passw0rd123',
      name: 'Priya Principal',
      collegeName: 'Test College',
      address: 'MG Road, Kochi',
      departments: ['Computer Science', 'Commerce'],
    },
  });
  assert.equal(collegeRegister.statusCode, 201);
  const collegeSession = (collegeRegister.json() as { data: { accessToken: string; profile: { collegeId: string } } }).data;

  const industryRegister = await app.inject({
    method: 'POST',
    url: '/api/auth/register/industry',
    payload: {
      email: 'hr@testindustry.com',
      password: 'Passw0rd123',
      name: 'Ishaan HR',
      companyName: 'Test Industry',
      description: 'A clean room for internship automation testing.',
    },
  });
  assert.equal(industryRegister.statusCode, 201);
  const industrySession = (industryRegister.json() as { data: { accessToken: string } }).data;

  const catalog = await app.inject({ method: 'GET', url: '/api/catalog/colleges' });
  const colleges = (catalog.json() as { data: { colleges: Array<{ id: string; departments: Array<{ id: string }> }> } }).data.colleges;
  const createdCollege = colleges.find((item) => item.id === collegeSession.profile.collegeId)!;

  const studentRegister = await app.inject({
    method: 'POST',
    url: '/api/auth/register/student',
    payload: {
      email: 'student@testcollege.edu',
      password: 'Passw0rd123',
      name: 'Teena Student',
      collegeId: createdCollege.id,
      departmentId: createdCollege.departments[0].id,
      universityRegNo: 'TC-2026-001',
      dob: '2004-03-20T00:00:00.000Z',
      whatsapp: '+919900000001',
      address: 'Kakkanad, Kochi',
    },
  });
  assert.equal(studentRegister.statusCode, 201);
  const studentSession = (studentRegister.json() as { data: { accessToken: string; profile: { studentId: string } } }).data;

  const mouRequest = await app.inject({
    method: 'POST',
    url: '/api/industry/mous/request',
    headers: { authorization: `Bearer ${industrySession.accessToken}` },
    payload: { collegeId: createdCollege.id },
  });
  assert.equal(mouRequest.statusCode, 201);
  const mouId = (mouRequest.json() as { data: { mou: { id: string } } }).data.mou.id;

  const approveMou = await app.inject({
    method: 'POST',
    url: `/api/college/mous/${mouId}/approve`,
    headers: { authorization: `Bearer ${collegeSession.accessToken}` },
  });
  assert.equal(approveMou.statusCode, 200);
  const approvedMou = await prisma.moU.findUniqueOrThrow({ where: { id: mouId } });
  assert.equal(approvedMou.status, MouStatus.ACCEPTED);
  assert.ok(approvedMou.pdfUrl);

  const createOpportunity = await app.inject({
    method: 'POST',
    url: '/api/industry/opportunities',
    headers: { authorization: `Bearer ${industrySession.accessToken}` },
    payload: {
      title: 'QA Automation Intern',
      description: 'Ship tests, dashboards, and clear student-first product feedback loops.',
    },
  });
  assert.equal(createOpportunity.statusCode, 201);
  const opportunityId = (createOpportunity.json() as { data: { opportunity: { id: string } } }).data.opportunity.id;

  const apply = await app.inject({
    method: 'POST',
    url: `/api/student/applications/${opportunityId}`,
    headers: { authorization: `Bearer ${studentSession.accessToken}` },
  });
  assert.equal(apply.statusCode, 201);
  const applicationId = (apply.json() as { data: { application: { id: string } } }).data.application.id;

  const accept = await app.inject({
    method: 'POST',
    url: `/api/industry/applications/${applicationId}/accept`,
    headers: { authorization: `Bearer ${industrySession.accessToken}` },
  });
  assert.equal(accept.statusCode, 200);
  const acceptedBody = accept.json() as { data: { acceptanceUrl: string } };
  assert.ok(acceptedBody.data.acceptanceUrl.includes('offer-letter-'));

  const attendance = await app.inject({
    method: 'POST',
    url: '/api/industry/attendance',
    headers: { authorization: `Bearer ${industrySession.accessToken}` },
    payload: {
      studentId: studentSession.profile.studentId,
      date: nowIso,
      status: AttendanceStatus.PRESENT,
    },
  });
  assert.equal(attendance.statusCode, 201);

  const studentDashboard = await app.inject({
    method: 'GET',
    url: '/api/student/dashboard',
    headers: { authorization: `Bearer ${studentSession.accessToken}` },
  });
  assert.equal(studentDashboard.statusCode, 200);
  const dashboard = studentDashboard.json() as { data: { applications: Array<{ status: string }> } };
  assert.equal(dashboard.data.applications[0]?.status, 'ACCEPTED');

  await app.close();
});
