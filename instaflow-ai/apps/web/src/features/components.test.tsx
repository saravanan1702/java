import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MembershipDto, WorkspaceRole } from '@instaflow/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { safeNext } from './auth/guards';
import { LoginPage } from './auth/pages';
import { Can, WorkspaceProvider } from './workspace/workspace-context';
import { WorkspaceFields, useWorkspaceForm } from './workspace/workspace-form';

function membership(role: WorkspaceRole): MembershipDto {
  return {
    role,
    joinedAt: new Date().toISOString(),
    workspace: { id: 'w1', name: 'Shop', slug: 'shop-abc123', plan: 'FREE', timezone: 'Asia/Kolkata', defaultLanguage: 'EN', createdAt: new Date().toISOString() },
  };
}

function withProviders(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('safeNext (open-redirect guard)', () => {
  it('allows same-site relative paths only', () => {
    expect(safeNext('/team')).toBe('/team');
    expect(safeNext('/invite?token=abc')).toBe('/invite?token=abc');
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('/\\evil.example')).toBe('/');
    expect(safeNext(null, '/onboarding')).toBe('/onboarding');
  });
});

describe('<Can>', () => {
  it.each([
    ['OWNER', true],
    ['ADMIN', true],
    ['AGENT', false],
  ] as const)('shows invite controls for %s: %s', (role, visible) => {
    withProviders(
      <WorkspaceProvider memberships={[membership(role)]} lastWorkspaceId="w1">
        <Can permission="members:invite">
          <button>Invite</button>
        </Can>
      </WorkspaceProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Invite' }) !== null).toBe(visible);
  });
});

function TimezoneHarness({ tz }: { tz: string }) {
  const form = useWorkspaceForm({ timezone: tz });
  return <WorkspaceFields form={form} />;
}

describe('<WorkspaceFields> timezone', () => {
  // Regression: Chromium omits "UTC" and lists "Asia/Calcutta", so these used to render blank.
  it.each(['UTC', 'Asia/Kolkata', 'Asia/Calcutta', 'Europe/London'])('always shows the selected zone %s', (tz) => {
    withProviders(<TimezoneHarness tz={tz} />);
    expect((screen.getByLabelText('Timezone') as HTMLSelectElement).value).toBe(tz);
  });
});

describe('<LoginPage>', () => {
  it('validates fields before calling the API', async () => {
    withProviders(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});
