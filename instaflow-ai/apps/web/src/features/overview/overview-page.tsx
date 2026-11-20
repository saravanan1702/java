import { useQuery } from '@tanstack/react-query';
import { ROLE_LABELS, type WorkspaceSummaryDto } from '@instaflow/shared';
import { ArrowRight, Bot, ChartColumn, Check, Inbox, MessageCircle, Package, Send, Users, Zap } from 'lucide-react';
import type * as React from 'react';
import { Link } from 'react-router';
import { InstagramGlyph } from '@/components/brand';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/misc';
import { api } from '@/lib/api';
import { cn, greeting } from '@/lib/utils';
import { useMe } from '../auth/session';
import { useWorkspace, wsKey } from '../workspace/workspace-context';

function useSummary() {
  const { membership } = useWorkspace();
  return useQuery({
    queryKey: wsKey(membership.workspace.id, 'summary'),
    queryFn: () => api.get<WorkspaceSummaryDto>('/api/workspaces/current'),
  });
}

function StatCard({ label, value, icon, hint, loading }: { label: string; value: React.ReactNode; icon: React.ReactNode; hint: string; loading?: boolean }) {
  return (
    <Card className="group relative overflow-hidden p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-surface-3 text-subtle transition-colors group-hover:text-primary [&_svg]:size-4">{icon}</span>
      </div>
      <div className="mt-3 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{loading ? <Skeleton className="h-7 w-12" /> : value}</div>
      <p className="mt-2 text-[12px] text-subtle">{hint}</p>
    </Card>
  );
}

interface ChecklistItem {
  label: string;
  description: string;
  done: boolean;
  to?: string;
  cta?: string;
  phase?: number;
}

function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  return (
    <Card className="surface-glow overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Get your workspace ready</CardTitle>
          <CardDescription>
            {done} of {items.length} steps complete
          </CardDescription>
        </div>
        <span className="text-2xl font-semibold tabular-nums text-brand-gradient">{pct}%</span>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress">
          <div className="h-full rounded-full bg-brand-gradient transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
        <ul className="grid gap-1">
          {items.map((item) => (
            <li key={item.label} className={cn('flex items-center gap-3 rounded-lg px-2 py-2.5', !item.done && !item.phase && 'hover:bg-surface-2')}>
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border',
                  item.done ? 'border-transparent bg-success text-white' : 'border-border-strong text-transparent',
                )}
              >
                <Check className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className={cn('text-[13.5px] font-medium', item.done && 'text-muted line-through decoration-subtle/60')}>{item.label}</div>
                {!item.done && <div className="text-[12.5px] text-subtle">{item.description}</div>}
              </div>
              {!item.done &&
                (item.phase ? (
                  <Badge variant="outline">Phase {item.phase}</Badge>
                ) : item.to ? (
                  <Button asChild variant="secondary" size="sm">
                    <Link to={item.to}>
                      {item.cta} <ArrowRight />
                    </Link>
                  </Button>
                ) : null)}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const PIPELINE = [
  { icon: MessageCircle, label: 'Customer comments', body: 'on a Reel you selected' },
  { icon: Zap, label: 'Keyword matched', body: 'e.g. PRICE, LINK, DELIVERY' },
  { icon: Send, label: 'Private reply sent', body: 'via the official Meta API' },
  { icon: Bot, label: 'AI follows up', body: 'using your approved product info' },
  { icon: Inbox, label: 'Team takes over', body: 'when a human is needed' },
];

export function OverviewPage() {
  const { data: me } = useMe();
  const { membership, can } = useWorkspace();
  const summary = useSummary();
  const counts = summary.data?.counts;
  const firstName = me?.user.name.split(' ')[0] ?? '';

  const checklist: ChecklistItem[] = [
    { label: 'Create your account', description: '', done: true },
    { label: 'Verify your email', description: 'Use the link we emailed you — required to invite teammates.', done: Boolean(me?.user.emailVerified) },
    { label: 'Create a workspace', description: '', done: true },
    {
      label: 'Invite your team',
      description: 'Bring in agents to handle conversations.',
      done: Boolean(counts && (counts.members > 1 || counts.pendingInvitations > 0)),
      ...(can('members:invite') ? { to: '/team', cta: 'Invite' } : {}),
    },
    { label: 'Connect an Instagram Professional account', description: 'Secure Meta login — no passwords.', done: Boolean(counts?.instagramAccounts), phase: 2 },
    { label: 'Create your first keyword automation', description: 'Reply to comments like “PRICE” automatically.', done: Boolean(counts?.automationRules), phase: 3 },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={<Badge variant="primary">{ROLE_LABELS[membership.role]}</Badge>}
        title={`${greeting()}, ${firstName}`}
        description={
          <>
            Here’s what’s happening in <span className="font-medium text-foreground">{membership.workspace.name}</span>.
          </>
        }
      />

      {summary.isError ? (
        <Card>
          <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        </Card>
      ) : (
        <div className="grid gap-6">
          <section aria-label="Workspace totals" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Team members" value={counts?.members ?? 0} icon={<Users />} hint={counts?.pendingInvitations ? `${counts.pendingInvitations} invitation(s) pending` : 'Including you'} loading={summary.isPending} />
            <StatCard label="Instagram accounts" value={counts?.instagramAccounts ?? 0} icon={<InstagramGlyph />} hint="Connection arrives in Phase 2" loading={summary.isPending} />
            <StatCard label="Automation rules" value={counts?.automationRules ?? 0} icon={<Zap />} hint="Keyword rules arrive in Phase 3" loading={summary.isPending} />
            <StatCard label="Products" value={counts?.products ?? 0} icon={<Package />} hint="Knowledge base arrives in Phase 4" loading={summary.isPending} />
          </section>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SetupChecklist items={checklist} />
            </div>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Automation activity</CardTitle>
                <CardDescription>Comments, DMs and AI replies over time</CardDescription>
              </CardHeader>
              <EmptyState
                icon={<ChartColumn />}
                title="No activity yet"
                description="Real execution data will appear here once an Instagram account is connected and your first automation runs. We never show sample numbers."
                className="py-10"
              />
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How InstaFlow works</CardTitle>
              <CardDescription>Every automated message goes through Meta’s official APIs and respects Instagram’s messaging rules.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {PIPELINE.map(({ icon: Icon, label, body }, i) => (
                  <li key={label} className="relative rounded-lg border border-border bg-surface-2 p-4">
                    <span className="absolute right-3 top-3 text-[11px] font-medium tabular-nums text-subtle">0{i + 1}</span>
                    <Icon className="mb-3 size-5 text-primary" />
                    <div className="text-[13.5px] font-medium">{label}</div>
                    <div className="mt-0.5 text-[12.5px] text-subtle">{body}</div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
