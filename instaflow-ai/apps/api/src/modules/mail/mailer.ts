import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** In-memory outbox used by the "memory" transport (tests only). */
export const memoryOutbox: MailMessage[] = [];

let smtp: Transporter | undefined;

function smtpTransport(): Transporter {
  if (!env.SMTP_HOST) throw new Error('SMTP_HOST is required when MAIL_TRANSPORT=smtp');
  smtp ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } } : {}),
  });
  return smtp;
}

/**
 * Deliver an email via the configured transport:
 *  - smtp:   real delivery (Mailpit locally; any SMTP provider in production)
 *  - log:    writes subject + recipient to the log (no body — it contains links)
 *  - file:   writes JSON files to MAIL_OUTBOX_DIR (local dev without Docker, e2e tests)
 *  - memory: appends to memoryOutbox (unit/integration tests)
 */
export async function deliverMail(msg: MailMessage): Promise<void> {
  switch (env.MAIL_TRANSPORT) {
    case 'smtp':
      await smtpTransport().sendMail({ from: env.MAIL_FROM, ...msg });
      return;
    case 'memory':
      memoryOutbox.push(msg);
      return;
    case 'file': {
      const dir = path.resolve(env.MAIL_OUTBOX_DIR);
      await mkdir(dir, { recursive: true });
      const file = path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
      await writeFile(file, JSON.stringify({ ...msg, from: env.MAIL_FROM, sentAt: new Date().toISOString() }, null, 2));
      logger.info({ to: msg.to, subject: msg.subject, file }, 'email written to local outbox');
      return;
    }
    case 'log':
    default:
      logger.info({ to: msg.to, subject: msg.subject }, 'email (log transport — not delivered)');
  }
}
