import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth.controller.js';
import { collegeController } from '../controllers/college.controller.js';
import { departmentController } from '../controllers/department.controller.js';
import { industryController } from '../controllers/industry.controller.js';
import { internshipController } from '../controllers/internship.controller.js';
import { applicationController } from '../controllers/application.controller.js';
import { validate } from '../middlewares/validate.js';
import { optionalJWT, requireRole, verifyJWT } from '../middlewares/auth.js';

const router = Router();

const roleEnum = z.enum(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'DEPARTMENT_COORDINATOR', 'INDUSTRY', 'STUDENT', 'EXTERNAL_STUDENT', 'ADMIN', 'COLLEGE', 'COORDINATOR']);

router.post('/auth/register', validate(z.object({ body: z.object({ name: z.string().optional(), email: z.string().email(), password: z.string().min(6), role: roleEnum }) })), authController.register);
router.post('/auth/login', validate(z.object({ body: z.object({ email: z.string().email(), password: z.string() }) })), authController.login);

router.post('/college/register', validate(z.object({ body: z.object({ collegeName: z.string(), address: z.string(), email: z.string().email(), phone: z.string(), university: z.string(), loginEmail: z.string().email(), password: z.string().min(6) }) })), collegeController.register);
router.post('/college/approve', verifyJWT, requireRole('SUPER_ADMIN', 'ADMIN'), validate(z.object({ body: z.object({ collegeId: z.string(), action: z.enum(['APPROVED', 'REJECTED']) }) })), collegeController.approve);
router.get('/college/list', verifyJWT, requireRole('SUPER_ADMIN', 'ADMIN'), collegeController.list);
router.get('/college/dashboard', verifyJWT, requireRole('COLLEGE_ADMIN', 'COLLEGE'), collegeController.dashboard);
router.get('/catalog/colleges', collegeController.catalog);

router.post('/department/create', verifyJWT, requireRole('COLLEGE_ADMIN', 'COLLEGE', 'SUPER_ADMIN', 'ADMIN'), validate(z.object({ body: z.object({ collegeId: z.string(), name: z.string(), coordinatorName: z.string(), coordinatorEmail: z.string().email(), coordinatorPhone: z.string() }) })), departmentController.create);

router.post('/industry/create', validate(z.object({ body: z.object({ name: z.string(), registrationDetails: z.string(), owner: z.object({ name: z.string(), email: z.string().email(), password: z.string().min(6) }) }) })), industryController.create);
router.get('/industry/dashboard', verifyJWT, requireRole('INDUSTRY'), industryController.dashboard);

router.post('/internship/create', verifyJWT, requireRole('DEPARTMENT_COORDINATOR', 'COORDINATOR', 'INDUSTRY'), validate(z.object({ body: z.object({ title: z.string(), description: z.string(), industryId: z.string(), collegeId: z.string(), departmentId: z.string(), ideaId: z.string() }) })), internshipController.create);
router.get('/internships/public', internshipController.publicList);

router.post('/apply', optionalJWT, validate(z.object({ body: z.object({ internshipId: z.string(), studentName: z.string().optional(), email: z.string().email().optional(), phone: z.string().optional() }) })), applicationController.apply);

router.get('/super-admin/dashboard', verifyJWT, requireRole('SUPER_ADMIN', 'ADMIN'), collegeController.superAdminDashboard);

export { router };
