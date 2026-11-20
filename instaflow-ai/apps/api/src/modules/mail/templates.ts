import { ROLE_LABELS, type WorkspaceRole } from '@instaflow/shared';
import { env } from '../../config/env.js';
import type { MailMessage } from './mailer.js';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function appLink(pathname: string, params: Record<string, string>): string {
  const url = new URL(pathname, env.APP_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

function layout(title: string, bodyHtml: string, cta: { label: string; url: string }, footnote: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b0b10;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e4e4e7">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#14141b;border:1px solid #26262f;border-radius:16px;padding:32px">
<tr><td style="font-size:18px;font-weight:700;color:#fff;padding-bottom:20px">InstaFlow&nbsp;AI</td></tr>
<tr><td style="font-size:20px;font-weight:600;color:#fff;padding-bottom:12px">${escapeHtml(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#a1a1aa;padding-bottom:24px">${bodyHtml}</td></tr>
<tr><td style="padding-bottom:24px"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#3b82f6);color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">${escapeHtml(cta.label)}</a></td></tr>
<tr><td style="font-size:12px;line-height:1.5;color:#71717a">${escapeHtml(footnote)}<br><br>If the button does not work, copy this link:<br><span style="word-break:break-all;color:#a1a1aa">${escapeHtml(cta.url)}</span></td></tr>
</table></td></tr></table></body></html>`;
}

export function verificationEmail(to: string, name: string, token: string): MailMessage {
  const url = appLink('/verify-email', { token });
  return {
    to,
    subject: 'Verify your email for InstaFlow AI',
    text: `Hi ${name},\n\nConfirm your email address to finish setting up InstaFlow AI:\n${url}\n\nThis link expires in 24 hours. If you did not create an account, ignore this email.`,
    html: layout(
      'Confirm your email',
      `Hi ${escapeHtml(name)}, confirm your email address to finish setting up your InstaFlow AI account.`,
      { label: 'Verify email', url },
      'This link expires in 24 hours. If you did not create an account, you can ignore this email.',
    ),
  };
}

export function passwordResetEmail(to: string, name: string, token: string): MailMessage {
  const url = appLink('/reset-password', { token });
  return {
    to,
    subject: 'Reset your InstaFlow AI password',
    text: `Hi ${name},\n\nUse this link to choose a new password:\n${url}\n\nThis link expires in 1 hour. If you did not request a reset, ignore this email — your password will not change.`,
    html: layout(
      'Reset your password',
      `Hi ${escapeHtml(name)}, we received a request to reset your password.`,
      { label: 'Choose a new password', url },
      'This link expires in 1 hour and can be used once. If you did not request a reset, ignore this email — your password will not change.',
    ),
  };
}

export function invitationEmail(to: string, inviterName: string, workspaceName: string, role: WorkspaceRole, token: string): MailMessage {
  const url = appLink('/invite', { token });
  const roleLabel = ROLE_LABELS[role];
  return {
    to,
    subject: `${inviterName} invited you to ${workspaceName} on InstaFlow AI`,
    text: `${inviterName} invited you to join the "${workspaceName}" workspace on InstaFlow AI as ${roleLabel}.\n\nAccept the invitation:\n${url}\n\nThis invitation expires in 7 days.`,
    html: layout(
      `Join ${workspaceName}`,
      `<strong style="color:#fff">${escapeHtml(inviterName)}</strong> invited you to join the <strong style="color:#fff">${escapeHtml(workspaceName)}</strong> workspace as <strong style="color:#fff">${escapeHtml(roleLabel)}</strong>.`,
      { label: 'Accept invitation', url },
      'This invitation expires in 7 days. Sign in or create an account with this email address to accept it.',
    ),
  };
}
