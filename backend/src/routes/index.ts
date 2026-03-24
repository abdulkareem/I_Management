import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth.controller.js';
import { collegeController } from '../controllers/college.controller.js';
import { departmentController } from '../controllers/department.controller.js';
import { coordinatorController } from '../controllers/coordinator.controller.js';
import { studentController } from '../controllers/student.controller.js';
import { industryController } from '../controllers/industry.controller.js';
import { ideaController } from '../controllers/idea.controller.js';
import { internshipController } from '../controllers/internship.controller.js';
import { applicationController } from '../controllers/application.controller.js';
import { attendanceController } from '../controllers/attendance.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireRole, verifyJWT } from '../middlewares/auth.js';

const router = Router();

const roleEnum = z.enum(['ADMIN', 'COLLEGE', 'COORDINATOR', 'STUDENT', 'INDUSTRY']);
const appStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
const attendanceStatusEnum = z.enum(['PRESENT', 'ABSENT']);

router.post('/auth/register', validate(z.object({ body: z.object({ name: z.string(), email: z.string().email(), password: z.string().min(6), role: roleEnum }) })), authController.register);
router.post('/auth/login', validate(z.object({ body: z.object({ email: z.string().email(), password: z.string() }) })), authController.login);

router.post('/college/create', validate(z.object({ body: z.object({ collegeName: z.string(), emblemUrl: z.string().url().optional(), emblemBinary: z.string().optional(), createdBy: z.object({ name: z.string(), email: z.string().email(), password: z.string().min(6) }), departments: z.array(z.object({ name: z.string(), coordinator: z.object({ name: z.string(), email: z.string().email(), password: z.string().min(6), phone: z.string().min(8) }) })).min(1) }) })), collegeController.create);
router.get('/college/list', verifyJWT, requireRole('ADMIN', 'COLLEGE', 'COORDINATOR'), collegeController.list);
router.get('/departments/:collegeId', collegeController.departmentsByCollege);

router.post('/department/bulk-create', verifyJWT, requireRole('COLLEGE', 'ADMIN'), validate(z.object({ body: z.object({ departments: z.array(z.object({ name: z.string(), collegeId: z.string(), coordinatorId: z.string().optional() })) }) })), departmentController.bulkCreate);

router.post('/coordinator/create', verifyJWT, requireRole('COLLEGE', 'ADMIN'), validate(z.object({ body: z.object({ userId: z.string(), departmentId: z.string(), phone: z.string() }) })), coordinatorController.create);
router.post('/student/register', validate(z.object({ body: z.object({ name: z.string(), email: z.string().email(), password: z.string().min(6), collegeId: z.string(), departmentId: z.string() }) })), studentController.register);

router.post('/industry/create', validate(z.object({ body: z.object({ name: z.string(), registrationDetails: z.string(), emblemUrl: z.string().url().optional(), emblemBinary: z.string().optional(), owner: z.object({ name: z.string(), email: z.string().email(), password: z.string().min(6) }) }) })), industryController.create);

router.post('/ideas/create', verifyJWT, requireRole('COORDINATOR'), validate(z.object({ body: z.object({ ideas: z.array(z.object({ title: z.string(), description: z.string(), outcomes: z.string(), departmentId: z.string() })).min(1), createdById: z.string().optional() }) })), ideaController.create);
router.get('/ideas/:departmentId', verifyJWT, ideaController.listByDepartment);

router.post('/internship/create', verifyJWT, requireRole('INDUSTRY'), validate(z.object({ body: z.object({ industryId: z.string(), collegeId: z.string(), departmentId: z.string(), ideaId: z.string() }) })), internshipController.create);

router.post('/apply', verifyJWT, requireRole('STUDENT'), validate(z.object({ body: z.object({ internshipId: z.string() }) })), applicationController.apply);
router.patch('/application/status', verifyJWT, requireRole('INDUSTRY', 'COORDINATOR'), validate(z.object({ body: z.object({ applicationId: z.string(), status: appStatusEnum }) })), applicationController.updateStatus);

router.post('/attendance/mark', verifyJWT, requireRole('INDUSTRY'), validate(z.object({ body: z.object({ studentId: z.string(), internshipId: z.string(), date: z.string(), status: attendanceStatusEnum }) })), attendanceController.mark);
router.get('/attendance/report', verifyJWT, requireRole('INDUSTRY', 'COORDINATOR', 'COLLEGE'), validate(z.object({ query: z.object({ internshipId: z.string(), startDate: z.string(), endDate: z.string() }) })), attendanceController.report);

export { router };
