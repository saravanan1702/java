import { useQueryClient } from '@tanstack/react-query';
import { ROLE_LABELS, assignableRoles, emailSchema, type MembershipDto, type WorkspaceRole } from '@instaflow/shared';
import { ArrowRight, Check, CircleCheck, LogOut, Plus, ShieldCheck, Trash, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { InstagramGlyph, Logo } from '@/components/brand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, errorMessage, setActiveWorkspace } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { cn } from '@/lib/utils';
import { ME_KEY, useLogout, useMe } from '../auth/session';
import { WorkspaceFields, useWorkspaceForm } from '../workspace/workspace-form';

const STEPS = ['Workspace', 'Team', 'Instagram', 'Ready'] as const;

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Onboarding progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors',
              i < step ? 'bg-primary text-white' : i === step ? 'bg-brand-gradient text-white shadow-[0_0_0_4px_var(--primary-soft)]' : 'bg-surface-3 text-subtle',
            )}
          >
            {i < step ? <Check className="size-3.5" /> : i + 1}
          </span>
          <span className={cn('hidden text-[13px] font-medium sm:block', i <= step ? 'text-foreground' : 'text-subtle')}>{label}</span>
          {i < STEPS.length - 1 && <span className={cn('h-px flex-1', i < step ? 'bg-primary' : 'bg-border')} />}
        </li>
      ))}
    </ol>
  );
}

function WorkspaceStep({ onCreated }: { onCreated: (m: MembershipDto) => void }) {
  const form = useWorkspaceForm();
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      onCreated(await api.post<MembershipDto>('/api/workspaces', values, { workspace: false }));
    } catch (err) {
      applyServerErrors(err, form.setError, ['name', 'timezone', 'defaultLanguage']);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      <CardContent className="grid gap-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Set up your workspace</h2>
          <p className="mt-1 text-sm text-muted">A workspace holds your Instagram accounts, automations, products and team. You can create more later.</p>
        </div>
        <WorkspaceFields form={form} idPrefix="onb" />
      </CardContent>
      <CardFooter>
        <Button type="submit" loading={form.formState.isSubmitting}>
          Create workspace <ArrowRight />
        </Button>
      </CardFooter>
    </form>
  );
}

interface InviteRow {
  email: string;
  role: WorkspaceRole;
}

function TeamStep({ emailVerified, onNext }: { emailVerified: boolean; onNext: () => void }) {
  const [rows, setRows] = useState<InviteRow[]>([{ email: '', role: 'AGENT' }]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [sending, setSending] = useState(false);

  const send = async () => {
    const filled = rows.map((r, i) => ({ ...r, i })).filter((r) => r.email.trim());
    if (!filled.length) return onNext();
    const nextErrors: Record<number, string> = {};
    for (const r of filled) {
      const parsed = emailSchema.safeParse(r.email);
      if (!parsed.success) nextErrors[r.i] = parsed.error.issues[0]?.message ?? 'Invalid email';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSending(true);
    let sent = 0;
    for (const r of filled) {
      try {
        await api.post('/api/invitations', { email: r.email, role: r.role });
        sent++;
      } catch (err) {
        nextErrors[r.i] = errorMessage(err);
      }
    }
    setSending(false);
    setErrors(nextErrors);
    if (sent) toast.success(`${sent} invitation${sent > 1 ? 's' : ''} sent`);
    if (!Object.keys(nextErrors).length) onNext();
  };

  return (
    <>
      <CardContent className="grid gap-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Invite your team</h2>
          <p className="mt-1 text-sm text-muted">Agents can reply in the inbox; Admins can also manage automations, products and team members.</p>
        </div>
        {!emailVerified ? (
          <Alert tone="warning">
            <ShieldCheck />
            <span>Verify your email first to invite teammates — we sent you a link. You can invite people later from <strong>Team Members</strong>.</span>
          </Alert>
        ) : (
          <div className="grid gap-3">
            {rows.map((row, i) => (
              <div key={i} className="grid gap-1.5">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="teammate@business.com"
                    aria-label={`Teammate ${i + 1} email`}
                    value={row.email}
                    aria-invalid={errors[i] ? true : undefined}
                    onChange={(e) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, email: e.target.value } : r)))}
                  />
                  <Select value={row.role} onValueChange={(v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, role: v as WorkspaceRole } : r)))}>
                    <SelectTrigger className="w-32 shrink-0" aria-label={`Teammate ${i + 1} role`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles('OWNER')
                        .filter((r) => r !== 'OWNER')
                        .map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {rows.length > 1 && (
                    <Button variant="ghost" size="icon" aria-label="Remove row" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                      <Trash />
                    </Button>
                  )}
                </div>
                {errors[i] && <p className="text-[12.5px] text-danger">{errors[i]}</p>}
              </div>
            ))}
            {rows.length < 5 && (
              <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setRows((rs) => [...rs, { email: '', role: 'AGENT' }])}>
                <Plus /> Add another
              </Button>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="ghost" onClick={onNext}>
          Skip for now
        </Button>
        {emailVerified && (
          <Button onClick={send} loading={sending}>
            <Users /> Send invites
          </Button>
        )}
      </CardFooter>
    </>
  );
}

function InstagramStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <CardContent className="grid gap-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Connect Instagram</h2>
          <p className="mt-1 text-sm text-muted">InstaFlow connects through Meta’s official Instagram login. You’ll never share your password with us.</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-blue-500 text-white">
              <InstagramGlyph className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Instagram account connection</span>
                <Badge variant="warning">Arrives in Phase 2</Badge>
              </div>
              <p className="mt-1 text-[13px] text-muted">
                The secure Meta OAuth connection is being built in the next phase. Until then this step is intentionally disabled — nothing is connected or simulated.
              </p>
            </div>
          </div>
          <ul className="mt-4 grid gap-2 text-[13px] text-muted">
            {['An Instagram Professional account (Business or Creator)', 'Permission to manage comments and messages', 'Only the minimum permissions automation needs'].map((t) => (
              <li key={t} className="flex gap-2">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-subtle" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" disabled>
          <InstagramGlyph /> Connect with Instagram
        </Button>
        <Button onClick={onNext}>
          Continue <ArrowRight />
        </Button>
      </CardFooter>
    </>
  );
}

export function OnboardingPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const logout = useLogout();
  const [step, setStep] = useState(0);
  const [workspace, setWorkspace] = useState<MembershipDto | null>(null);

  const finish = async () => {
    await qc.invalidateQueries({ queryKey: ME_KEY });
    navigate('/', { replace: true });
  };

  if (!me) return null;
  const firstName = me.user.name.split(' ')[0];

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-[-240px] size-[640px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]" aria-hidden />
      <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-8 sm:px-6">
        <header className="flex items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}>
            <LogOut /> Sign out
          </Button>
        </header>
        <div className="mt-10 mb-8 animate-rise">
          <p className="text-sm text-muted">Welcome, {firstName} 👋</p>
          <h1 className="mt-1 text-title font-semibold">Let’s get InstaFlow ready for your business</h1>
        </div>
        <div className="mb-6">
          <Stepper step={step} />
        </div>
        <Card className="animate-rise">
          {step === 0 && (
            <WorkspaceStep
              onCreated={(m) => {
                setWorkspace(m);
                setActiveWorkspace(m.workspace.id);
                try {
                  localStorage.setItem('instaflow.workspace', m.workspace.id);
                } catch {
                  /* optional */
                }
                toast.success(`Workspace “${m.workspace.name}” created`);
                setStep(1);
              }}
            />
          )}
          {step === 1 && <TeamStep emailVerified={me.user.emailVerified} onNext={() => setStep(2)} />}
          {step === 2 && <InstagramStep onNext={() => setStep(3)} />}
          {step === 3 && (
            <>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-[0_10px_40px_-10px_var(--glow)]">
                  <Check className="size-7" />
                </div>
                <h2 className="text-xl font-semibold tracking-tight">{workspace?.workspace.name ?? 'Your workspace'} is ready</h2>
                <p className="mt-2 max-w-sm text-sm text-muted">Your dashboard shows what’s set up and what’s coming next.</p>
              </CardContent>
              <CardFooter className="justify-center">
                <Button size="lg" onClick={finish}>
                  Go to dashboard <ArrowRight />
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
