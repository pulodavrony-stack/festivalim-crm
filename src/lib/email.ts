import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.yandex.ru',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: (process.env.SMTP_PORT || '465') === '465',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const fromAddress = options.from || process.env.SMTP_FROM || process.env.SMTP_USER || '';

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP не настроен. Добавьте SMTP_HOST, SMTP_USER, SMTP_PASS в .env');
  }

  const result = await transporter.sendMail({
    from: fromAddress,
    to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    replyTo: options.replyTo,
  });

  return result;
}

export function replaceTemplateVars(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}
