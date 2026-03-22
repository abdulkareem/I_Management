import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../server.js';

test('student registration requires verification before password creation', async () => {
  const app = buildServer();

  const registration = await app.inject({
    method: 'POST',
    url: '/api/auth/register/student',
    payload: {
      name: 'Asha Student',
      email: 'asha@example.edu',
      collegeId: 'college-1',
      collegeStudentId: 'C123',
      universityRegistrationNumber: 'REG-2026-001',
    },
  });

  assert.equal(registration.statusCode, 201);

  const prematurePassword = await app.inject({
    method: 'POST',
    url: '/api/auth/set-password',
    payload: {
      email: 'asha@example.edu',
      password: 'SecurePass123',
    },
  });

  assert.equal(prematurePassword.statusCode, 403);
  await app.close();
});

test('verified users can create passwords and authenticate', async () => {
  const app = buildServer();

  const registration = await app.inject({
    method: 'POST',
    url: '/api/auth/register/industry',
    payload: {
      name: 'Rahul HR',
      email: 'rahul@company.com',
      industryId: 'industry-1',
    },
  });

  const preview = registration.json() as { verificationPreview: { token: string } };

  const verification = await app.inject({
    method: 'POST',
    url: '/api/auth/verify-email',
    payload: {
      email: 'rahul@company.com',
      token: preview.verificationPreview.token,
    },
  });
  assert.equal(verification.statusCode, 200);

  const passwordSet = await app.inject({
    method: 'POST',
    url: '/api/auth/set-password',
    payload: {
      email: 'rahul@company.com',
      password: 'SecurePass123',
    },
  });
  assert.equal(passwordSet.statusCode, 200);

  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login/industry',
    payload: {
      email: 'rahul@company.com',
      password: 'SecurePass123',
    },
  });
  assert.equal(login.statusCode, 200);
  assert.ok((login.json() as { accessToken: string }).accessToken);
  await app.close();
});

test('upload endpoint returns the 200 KB passport photo policy', async () => {
  const app = buildServer();

  const registration = await app.inject({
    method: 'POST',
    url: '/api/auth/register/college',
    payload: {
      name: 'College Admin',
      email: 'college-admin@example.edu',
      collegeId: 'college-1',
    },
  });
  const preview = registration.json() as { verificationPreview: { token: string } };

  await app.inject({
    method: 'POST',
    url: '/api/auth/verify-email',
    payload: { email: 'college-admin@example.edu', token: preview.verificationPreview.token },
  });
  await app.inject({
    method: 'POST',
    url: '/api/auth/set-password',
    payload: { email: 'college-admin@example.edu', password: 'SecurePass123' },
  });
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login/college',
    payload: { email: 'college-admin@example.edu', password: 'SecurePass123' },
  });
  const token = (login.json() as { accessToken: string }).accessToken;

  const upload = await app.inject({
    method: 'POST',
    url: '/api/files/presign',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      kind: 'student-passport-photo',
      fileName: 'photo.jpg',
      entityId: 'student-1',
      contentType: 'image/jpeg',
    },
  });

  assert.equal(upload.statusCode, 200);
  assert.equal(upload.json().policy.maxBytes, 200000);
  await app.close();
});
