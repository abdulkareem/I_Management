export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? 'InternSuite <no-reply@internsuite.app>';

  if (!apiKey) {
    return {
      accepted: false,
      preview: {
        provider: 'resend',
        simulated: true,
        to: input.to,
        subject: input.subject,
        html: input.html,
      },
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
  });

  if (!response.ok) {
    throw new Error(`Failed to deliver email: ${await response.text()}`);
  }

  return { accepted: true, messageId: (await response.json() as { id: string }).id };
}
