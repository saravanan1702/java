import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * Emails are read from either:
 *  - E2E_MAILPIT_URL: Mailpit's HTTP API (docker compose stack), or
 *  - E2E_OUTBOX_DIR: a directory of JSON files (MAIL_TRANSPORT=file, or an SMTP sink).
 */
const OUTBOX = process.env.E2E_OUTBOX_DIR;
const MAILPIT = process.env.E2E_MAILPIT_URL?.replace(/\/$/, '');
const PASSWORD = 'e2e-password-123';
const run = Date.now();
const ownerEmail = `owner-${run}@example.com`;
const agentEmail = `agent-${run}@example.com`;

interface Mail {
  to?: string;
  subject?: string;
  text?: string;
}

async function* mailbox(): AsyncGenerator<Mail> {
  if (MAILPIT) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=50`)).json()) as {
      messages: { ID: string; Subject: string; To: { Address: string }[] }[];
    };
    for (const m of list.messages) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json()) as { Text: string };
      yield { to: m.To.map((t) => t.Address).join(','), subject: m.Subject, text: full.Text };
    }
    return;
  }
  if (!OUTBOX) throw new Error('Set E2E_MAILPIT_URL or E2E_OUTBOX_DIR so the test can read emails');
  for (const f of readdirSync(OUTBOX).sort().reverse()) {
    yield JSON.parse(readFileSync(path.join(OUTBOX, f), 'utf8')) as Mail;
  }
}

/** Poll for the newest message to `to` matching `subject` and return its app link (path + query). */
async function waitForMailLink(to: string, subject: RegExp, linkPath: string): Promise<string> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    for await (const mail of mailbox()) {
      if (mail.to?.includes(to) && subject.test(mail.subject ?? '')) {
        const match = mail.text?.match(new RegExp(`https?://[^\\s]+${linkPath}\\?token=[A-Za-z0-9_-]+`));
        if (match) return new URL(match[0]).pathname + new URL(match[0]).search;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No "${subject}" email for ${to}`);
}

async function shot(page: Page, name: string) {
  if (process.env.E2E_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.E2E_SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

test.describe.serial('Phase 1 journey', () => {
  test('redirects signed-out users to login', async ({ page }) => {
    await page.goto('/team');
    await expect(page).toHaveURL(/\/login\?next=%2Fteam/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await shot(page, '01-login');
  });

  test('owner registers, verifies email, onboards, invites a teammate', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Your name').fill('Kavya Raman');
    await page.getByLabel('Work email').fill(ownerEmail);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByRole('heading', { name: /get instaflow ready/i })).toBeVisible();

    // Verify email through the real queued email (API → Redis → worker → SMTP).
    const verifyLink = await waitForMailLink(ownerEmail, /verify/i, '/verify-email');
    await page.goto(verifyLink);
    await expect(page.getByRole('heading', { name: 'Email verified' })).toBeVisible();
    await page.goto('/onboarding');

    // Step 1 — workspace
    await page.getByLabel('Workspace name').fill('Saree House');
    await shot(page, '02-onboarding');
    await page.getByRole('button', { name: 'Create workspace' }).click();

    // Step 2 — team
    await expect(page.getByRole('heading', { name: 'Invite your team' })).toBeVisible();
    await page.getByLabel('Teammate 1 email').fill(agentEmail);
    await page.getByRole('button', { name: 'Send invites' }).click();

    // Step 3 — Instagram is honestly disabled until Phase 2
    await expect(page.getByRole('heading', { name: 'Connect Instagram' })).toBeVisible();
    await expect(page.getByText('Arrives in Phase 2')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect with Instagram' })).toBeDisabled();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 4 — done
    await page.getByRole('button', { name: 'Go to dashboard' }).click();
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Kavya/ })).toBeVisible();
    await expect(page.getByText('Get your workspace ready')).toBeVisible();
    await expect(page.getByText('1 invitation(s) pending')).toBeVisible();
    await shot(page, '03-overview');

    await page.getByRole('link', { name: 'Team Members' }).click();
    await expect(page.getByRole('heading', { name: 'Pending invitations' })).toBeVisible();
    await expect(page.getByText(agentEmail)).toBeVisible();
    await shot(page, '04-team');

    // Roadmap pages are clearly labelled, not faked
    await page.getByRole('link', { name: /Connected Accounts/ }).click();
    await expect(page.getByText('Planned for Phase 2')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Not available yet' })).toBeVisible();
  });

  test('teammate accepts the invitation as an Agent with restricted UI', async ({ page }) => {
    const inviteLink = await waitForMailLink(agentEmail, /invited you/i, '/invite');
    await page.goto(inviteLink);
    await expect(page.getByRole('heading', { name: 'Join Saree House' })).toBeVisible();
    await shot(page, '05-invite');
    await page.getByRole('link', { name: 'Create account to accept' }).click();

    await expect(page.getByLabel('Work email')).toHaveValue(agentEmail);
    await page.getByLabel('Your name').fill('Arun Agent');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/invite\?token=/);
    await page.getByRole('button', { name: 'Accept invitation' }).click();
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Arun/ })).toBeVisible();
    await expect(page.getByText('Agent').first()).toBeVisible();

    await page.getByRole('link', { name: 'Team Members' }).click();
    await expect(page.getByText('Kavya Raman')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Invite teammate' })).toHaveCount(0);
  });

  test('owner sees the new member, renames the workspace, and signs out', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(ownerEmail);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: /Kavya/ })).toBeVisible();

    await page.goto('/team');
    await expect(page.getByText('Arun Agent')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pending invitations' })).toHaveCount(0);

    await page.goto('/settings');
    const name = page.getByLabel('Workspace name');
    await name.fill('Saree House Chennai');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Workspace settings saved')).toBeVisible();
    await expect(page.getByRole('button', { name: /Switch workspace/ })).toContainText('Saree House Chennai');

    await page.getByRole('tab', { name: 'Security' }).click();
    await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
    await expect(page.getByText('invitation.accepted')).toBeVisible();
    await shot(page, '06-settings-security');

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('wrong password shows a generic error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(ownerEmail);
    await page.getByLabel('Password', { exact: true }).fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Incorrect email or password.' })).toBeVisible();
  });
});
