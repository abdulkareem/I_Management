export const emailService = {
  async sendPasswordEmail(params: { to: string; name?: string | null; password: string; role: string }) {
    const subject = `Internship Platform access for ${params.role}`;
    const text = `Hello ${params.name ?? 'User'}, your temporary password is: ${params.password}`;

    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
          to: [params.to],
          subject,
          text,
        }),
      });
      return;
    }

    console.log(`[EMAIL:DEV] to=${params.to} subject=${subject} text=${text}`);
  },
};
