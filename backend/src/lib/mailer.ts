export interface MailDeliveryPreview {
  provider: 'resend';
  simulated: boolean;
  subject: string;
  to: string;
  htmlPreview: string;
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? 'Prism SaaS <no-reply@prismsaas.app>';

  if (!apiKey) {
    return {
      accepted: false,
      preview: {
        provider: 'resend',
        simulated: true,
        subject: input.subject,
        to: input.to,
        htmlPreview: input.html,
      } satisfies MailDeliveryPreview,
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend delivery failed: ${await response.text()}`);
  }

  const body = (await response.json()) as { id: string };
  return {
    accepted: true,
    messageId: body.id,
  };
}
