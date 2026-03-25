import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { prisma } from '../utils/prisma.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPER_ADMIN_EMAIL = 'abdulkareem@psmocollege.ac.in';

function ok<T>(data: T, message?: string) {
  return { success: true, message, data };
}

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signToken(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ userId, role: 'SUPER_ADMIN' }, secret, { expiresIn: '12h' });
}

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email ?? '').toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required', data: null });
    }

    if (email !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Not authorized', data: null });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ success: false, message: 'Email provider is not configured', data: null });
    }

    const otp = createOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        otp,
        otpExpiry,
        role: 'SUPER_ADMIN',
      },
      create: {
        email,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        otp,
        otpExpiry,
        password: 'OTP_ONLY_LOGIN',
        phone: `super-admin-${Date.now()}`,
        universityRegNo: `SUPERADMIN-${Date.now()}`,
        collegeId: 'N/A',
      },
    });

    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to: email,
      subject: 'Aureliv Verification Code',
      html: `<div style="font-family: Arial, sans-serif;"><h2>Aureliv Verification Code</h2><p>Your one-time password is:</p><h1>${otp}</h1><p>This OTP expires in 5 minutes.</p></div>`,
    });

    return res.json(ok({ otpSent: true, expiresInSeconds: 300, email: user.email }, 'OTP sent'));
  } catch (err) {
    console.error('SEND OTP ERROR:', err);
    return res.status(500).json({ success: false, message: 'Failed to send OTP', data: null });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email ?? '').toLowerCase().trim();
    const otp = String(req.body?.otp ?? '').trim();

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required', data: null });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP', data: null });
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP expired', data: null });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        otpExpiry: null,
        role: 'SUPER_ADMIN',
      },
    });

    const token = signToken(user.id);

    return res.json(
      ok(
        {
          message: 'Login successful',
          token,
          role: 'SUPER_ADMIN',
          redirect: '/dashboard/admin',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: 'SUPER_ADMIN',
          },
        },
        'Login successful',
      ),
    );
  } catch (err) {
    console.error('VERIFY OTP ERROR:', err);
    return res.status(500).json({ success: false, message: 'Verification failed', data: null });
  }
};
