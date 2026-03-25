import { Router } from 'express';
import { sendOtp, verifyOtp } from '../controllers/adminAuthController.js';
import { verifyJWT, requireRole } from '../middlewares/auth.js';

export const adminAuthRoutes = Router();

adminAuthRoutes.post('/send-otp', sendOtp);
adminAuthRoutes.post('/verify-otp', verifyOtp);
adminAuthRoutes.get('/dashboard', verifyJWT, requireRole('SUPER_ADMIN'), (_req, res) => {
  res.json({ success: true, data: { modules: ['Colleges', 'Industries', 'Analytics'] } });
});
