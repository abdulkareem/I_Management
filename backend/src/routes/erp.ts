import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  apiCatalog,
  applicationSchema,
  applications,
  approvalSchema,
  attendanceRecords,
  attendanceSchema,
  colleges,
  evaluations,
  evaluationSchema,
  frontendBlueprint,
  generateId,
  gradeFromMarks,
  industries,
  internshipSchema,
  internships,
  marksheets,
  mous,
  renderPdfDocument,
  students,
  validationAndSecurityBlueprint,
} from '../lib/internsuite.js';
import { requireAuth } from '../lib/security.js';

export const erpRoutes: FastifyPluginAsync = async (app) => {
  app.get('/erp/api-map', async () => apiCatalog);
  app.get('/erp/frontend-flow', async () => frontendBlueprint);
  app.get('/erp/security', async () => validationAndSecurityBlueprint);
  app.get('/erp/pdf-templates', async () => ({
    templates: [
      {
        type: 'MOU',
        structure: ['College logo', 'Industry logo', 'Terms', 'Signature placeholders'],
        eventTrigger: 'College approves an industry internship listing.',
      },
      {
        type: 'APPROVAL_LETTER',
        structure: ['Student identity', 'Internship details', 'Approval declaration', 'Authorized signatory'],
        eventTrigger: 'College approves a student application.',
      },
      {
        type: 'ATTENDANCE_REPORT',
        structure: ['Attendance matrix', 'Industry confirmation', 'College review'],
        eventTrigger: 'Industry submits attendance or college exports attendance review.',
      },
      {
        type: 'MARKSHEET',
        structure: ['Student profile', 'Marks', 'Grade', 'Remarks', 'Issued date'],
        eventTrigger: 'College submits evaluation.',
      },
    ],
  }));

  app.post('/college/students', { preHandler: requireAuth({ roles: ['college'], audience: 'college-app' }) }, async (request, reply) => {
    const payload = z.object({
      email: z.string().email(),
      fullName: z.string().min(2),
      universityRegNo: z.string().min(4),
      dob: z.string().date(),
      whatsappNumber: z.string().min(10),
      address: z.string().min(10),
      programme: z.string().min(2),
      year: z.number().int().min(1).max(8),
      semester: z.number().int().min(1).max(12),
      photoUrl: z.string().url().optional(),
      photoSizeBytes: z.number().int().positive().max(200000),
    }).parse(request.body);

    const collegeId = request.user?.collegeId!;
    const duplicate = Array.from(students.values()).find(
      (student) => student.collegeId === collegeId && student.universityRegNo === payload.universityRegNo,
    );
    if (duplicate) {
      reply.code(409);
      return { message: 'Student already exists for this college.' };
    }

    const studentId = generateId('student');
    students.set(studentId, {
      id: studentId,
      tenantId: request.user?.tenantId!,
      userId: studentId,
      collegeId,
      email: payload.email,
      fullName: payload.fullName,
      universityRegNo: payload.universityRegNo,
      dob: payload.dob,
      whatsappNumber: payload.whatsappNumber,
      address: payload.address,
      programme: payload.programme,
      year: payload.year,
      semester: payload.semester,
      photoUrl: payload.photoUrl,
      createdAt: new Date().toISOString(),
    });

    reply.code(201);
    return { message: 'Student created successfully.', studentId };
  });

  app.get('/college/applications', { preHandler: requireAuth({ roles: ['college'], audience: 'college-app' }) }, async (request) => {
    const collegeId = request.user?.collegeId!;
    return Array.from(applications.values()).filter((application) => application.collegeId === collegeId);
  });

  app.post('/college/approve', { preHandler: requireAuth({ roles: ['college'], audience: 'college-app' }) }, async (request, reply) => {
    const payload = approvalSchema.parse(request.body);
    const collegeId = request.user?.collegeId!;

    if (payload.entity === 'internship') {
      const internship = internships.get(payload.targetId);
      if (!internship || (internship.collegeId && internship.collegeId !== collegeId)) {
        reply.code(404);
        return { message: 'Internship not found for this college.' };
      }
      internship.collegeId = collegeId;
      internship.approvedByCollege = payload.status === 'APPROVED';
      if (payload.status === 'APPROVED') {
        const mouId = generateId('mou');
        mous.set(mouId, {
          id: mouId,
          tenantId: request.user?.tenantId!,
          collegeId,
          industryId: internship.createdByIndustryId,
          fileUrl: `https://cdn.internsuite.app/mou/${mouId}.pdf`,
          createdAt: new Date().toISOString(),
        });
      }
      return { message: `Internship ${payload.status.toLowerCase()}.`, mouGenerated: payload.status === 'APPROVED' };
    }

    if (payload.entity === 'application') {
      const application = applications.get(payload.targetId);
      if (!application || application.collegeId !== collegeId) {
        reply.code(404);
        return { message: 'Application not found for this college.' };
      }
      application.status = payload.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
      if (application.status === 'APPROVED') {
        application.approvalLetterUrl = `https://cdn.internsuite.app/approval-letter/${application.id}.pdf`;
      }
      return { message: `Application ${application.status.toLowerCase()}.`, approvalLetterGenerated: Boolean(application.approvalLetterUrl) };
    }

    const attendance = attendanceRecords.get(payload.targetId);
    if (!attendance || attendance.collegeId !== collegeId) {
      reply.code(404);
      return { message: 'Attendance record not found for this college.' };
    }
    attendance.approvedByCollege = payload.status === 'APPROVED';
    return { message: `Attendance ${payload.status.toLowerCase()}.` };
  });

  app.post('/college/evaluation', { preHandler: requireAuth({ roles: ['college'], audience: 'college-app' }) }, async (request, reply) => {
    const payload = evaluationSchema.parse(request.body);
    const student = students.get(payload.studentId);
    if (!student || student.collegeId !== request.user?.collegeId) {
      reply.code(404);
      return { message: 'Student not found for this college.' };
    }
    const evaluationId = generateId('evaluation');
    const marksheetId = generateId('marksheet');

    evaluations.set(evaluationId, {
      id: evaluationId,
      tenantId: request.user?.tenantId!,
      collegeId: request.user?.collegeId!,
      studentId: payload.studentId,
      marks: payload.marks,
      grade: payload.grade || gradeFromMarks(payload.marks),
      remarks: payload.remarks,
    });
    marksheets.set(marksheetId, {
      id: marksheetId,
      tenantId: request.user?.tenantId!,
      collegeId: request.user?.collegeId!,
      studentId: payload.studentId,
      fileUrl: `https://cdn.internsuite.app/marksheet/${marksheetId}.pdf`,
    });

    reply.code(201);
    return { message: 'Evaluation saved and marksheet generated.', evaluationId, marksheetId };
  });

  app.post('/student/apply', { preHandler: requireAuth({ roles: ['student'], audience: 'student-app' }) }, async (request, reply) => {
    const payload = applicationSchema.parse(request.body);
    const internship = internships.get(payload.internshipId);
    const student = Array.from(students.values()).find((entry) => entry.id === request.user?.studentId || entry.userId === request.user?.sub);
    if (!internship || !student) {
      reply.code(404);
      return { message: 'Internship or student record not found.' };
    }
    if (student.collegeId !== internship.collegeId) {
      reply.code(403);
      return { message: 'Cross-college applications are not allowed unless the internship is approved for the student college.' };
    }
    const duplicate = Array.from(applications.values()).find(
      (application) => application.studentId === student.id && application.internshipId === internship.id,
    );
    if (duplicate) {
      reply.code(409);
      return { message: 'You already applied for this internship.' };
    }

    const applicationId = generateId('application');
    applications.set(applicationId, {
      id: applicationId,
      tenantId: request.user?.tenantId!,
      collegeId: student.collegeId,
      studentId: student.id,
      internshipId: internship.id,
      industryId: internship.createdByIndustryId,
      status: 'APPLIED',
      createdAt: new Date().toISOString(),
    });
    reply.code(201);
    return { message: 'Application submitted successfully.', applicationId };
  });

  app.get('/student/applications', { preHandler: requireAuth({ roles: ['student'], audience: 'student-app' }) }, async (request) => {
    const student = Array.from(students.values()).find((entry) => entry.id === request.user?.studentId || entry.userId === request.user?.sub);
    return Array.from(applications.values()).filter((application) => application.studentId === student?.id);
  });

  app.post('/industry/internship', { preHandler: requireAuth({ roles: ['industry'], audience: 'industry-app' }) }, async (request, reply) => {
    const payload = internshipSchema.parse(request.body);
    const internshipId = generateId('internship');
    internships.set(internshipId, {
      id: internshipId,
      tenantId: request.user?.tenantId!,
      collegeId: payload.collegeId,
      title: payload.title,
      description: payload.description,
      field: payload.field,
      duration: payload.duration,
      stipend: payload.stipend,
      createdByIndustryId: request.user?.industryId!,
      visibility: payload.visibility,
      createdAt: new Date().toISOString(),
      approvedByCollege: false,
    });
    reply.code(201);
    return { message: 'Internship created. Waiting for college approval.', internshipId };
  });

  app.get('/industry/applications', { preHandler: requireAuth({ roles: ['industry'], audience: 'industry-app' }) }, async (request) => {
    return Array.from(applications.values()).filter((application) => application.industryId === request.user?.industryId);
  });

  app.post('/industry/attendance', { preHandler: requireAuth({ roles: ['industry'], audience: 'industry-app' }) }, async (request, reply) => {
    const payload = attendanceSchema.parse(request.body);
    const student = students.get(payload.studentId);
    if (!student) {
      reply.code(404);
      return { message: 'Student not found.' };
    }
    const attendanceId = generateId('attendance');
    attendanceRecords.set(attendanceId, {
      id: attendanceId,
      tenantId: request.user?.tenantId!,
      collegeId: student.collegeId,
      studentId: payload.studentId,
      industryId: request.user?.industryId!,
      date: payload.date,
      status: payload.status,
      approvedByCollege: false,
    });
    reply.code(201);
    return { message: 'Attendance recorded. College review pending.', attendanceId };
  });

  app.get('/pdf/mou/:id', { preHandler: requireAuth({ roles: ['college', 'industry'], audience: undefined }) }, async (request) => renderPdfDocument('MOU', z.object({ id: z.string() }).parse(request.params).id));
  app.get('/pdf/approval-letter/:id', { preHandler: requireAuth({ roles: ['college', 'student'], audience: undefined }) }, async (request) => renderPdfDocument('APPROVAL_LETTER', z.object({ id: z.string() }).parse(request.params).id));
  app.get('/pdf/attendance/:id', { preHandler: requireAuth({ roles: ['college', 'industry'], audience: undefined }) }, async (request) => renderPdfDocument('ATTENDANCE_REPORT', z.object({ id: z.string() }).parse(request.params).id));
  app.get('/pdf/marksheet/:id', { preHandler: requireAuth({ roles: ['college', 'student'], audience: undefined }) }, async (request) => renderPdfDocument('MARKSHEET', z.object({ id: z.string() }).parse(request.params).id));
};
