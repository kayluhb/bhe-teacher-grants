import {env} from 'cloudflare:workers';

export const sendEmail = async (input: {
  html: string;
  replyTo?: string | string[];
  subject: string;
  to: string | string[];
}): Promise<boolean> => {
  if (!env.RESEND_API_KEY) return false;

  const res = await fetch('https://api.resend.com/emails', {
    body: JSON.stringify({
      from: 'PTA Treasurer <treasurer@mail.bheeagles.com>',
      html: input.html,
      reply_to: input.replyTo ?? 'treasurer@bheeagles.com',
      subject: input.subject,
      to: input.to,
    }),
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Resend API error: ${res.status} ${body}`);
    return false;
  }
  return true;
};

export const notifyQuietly = (input: {
  html: string;
  replyTo?: string | string[];
  subject: string;
  to: string | string[];
}) => {
  void sendEmail(input).catch((error) => {
    console.error('Email send failed', error);
  });
};
