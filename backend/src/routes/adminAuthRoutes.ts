import { Router } from 'express';
import { sendOtp, verifyOtp } from '../controllers/adminAuthController.js';

export const adminAuthRoutes = Router();

adminAuthRoutes.post('/send-otp', sendOtp);
adminAuthRoutes.post('/verify-otp', verifyOtp);
