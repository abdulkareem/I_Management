import type { Request, Response } from 'express';
import { Resend } from 'resend';
import { prisma } from '../utils/prisma.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPER_ADMIN_EMAIL = 'abdulkareem@psmocollege.ac.in';

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (email !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.user.upsert({
      where: { email },
      update: {
        otp,
        otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
        role: 'SUPER_ADMIN',
      },
      create: {
        email,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        otp,
        otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
        password: null,
        phone: 'N/A',
        universityRegNo: `SUPERADMIN-${Date.now()}`,
        collegeId: 'N/A',
      },
    });

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Admin OTP',
      html: `<h2>Your OTP: ${otp}</h2>`,
    });

    return res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('SEND OTP ERROR:', err);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    return res.json({
      message: 'Login success',
      redirect: '/admin/dashboard',
    });
  } catch (err) {
    console.error('VERIFY OTP ERROR:', err);
    return res.status(500).json({ message: 'Verification failed' });
  }
};
