import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { withRetry } from './retry.js';

let transporter: Transporter | undefined;

function getTransporter() {
  if (!env.SMTP_HOST) {
    throw new Error('SMTP is not configured (SMTP_HOST missing). Set SMTP_* env vars or switch the notifier to "webhook".');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    });
  }
  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
  await withRetry(() => getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html
  }), { attempts: 3, baseDelayMs: 500 });
}
