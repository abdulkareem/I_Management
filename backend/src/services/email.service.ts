export const emailService = {
  async sendPasswordEmail(params: { to: string; name?: string | null; password: string; role: string }) {
    const subject = `Internship Platform access for ${params.role}`;
    const text = `Hello ${params.name ?? 'User'}, your temporary password is: ${params.password}`;

    await this.sendEmail(params.to, subject, text);
  },

  async sendOtpEmail(params: { to: string; purpose: 'LOGIN' | 'RESET_PASSWORD'; otp: string }) {
    const subject = params.purpose === 'LOGIN' ? 'Your Super Admin Login OTP' : 'Your Password Reset OTP';
    const text = `Your verification code is ${params.otp}. It will expire in 10 minutes.`;

    await this.sendEmail(params.to, subject, text);
  },

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
          to: [to],
          subject,
          text,
          html,
        }),
      });
      return;
    }

    console.log(`[EMAIL:DEV] to=${to} subject=${subject} text=${text}`);
  },
};
