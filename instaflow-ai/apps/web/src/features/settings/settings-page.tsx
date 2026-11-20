import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changePasswordSchema,
  updateProfileSchema,
  type AuditLogDto,
  type MeDto,
  type WorkspaceDto,
} from '@instaflow/shared';
import { Building, CircleCheck, Clock, LogOut, MonitorSmartphone, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import type { z } from 'zod';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Alert, Skeleton, TBody, TD, TH, THead, TR, Table, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { formatDate } from '@/lib/utils';
import { PasswordInput } from '../auth/auth-layout';
import { ME_KEY, useMe } from '../auth/session';
import { Can, useWorkspace, wsKey } from '../workspace/workspace-context';
import { WorkspaceFields, useWorkspaceForm } from '../workspace/workspace-form';

// ---------------------------------------------------------------- Workspace
function WorkspaceSettings() {
  const { membership, can } = useWorkspace();
  const qc = useQueryClient();
  const editable = can('workspace:update');
  const ws = membership.workspace;
  const form = useWorkspaceForm({ name: ws.name, timezone: ws.timezone, defaultLanguage: ws.defaultLanguage });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await api.patch<WorkspaceDto>('/api/workspaces/current', values);
      await qc.invalidateQueries({ queryKey: ME_KEY });
      await qc.invalidateQueries({ queryKey: wsKey(ws.id) });
      form.reset(values);
      toast.success('Workspace settings saved');
    } catch (err) {
      applyServerErrors(err, form.setError, ['name', 'timezone', 'defaultLanguage']);
    }
  });

  return (
    <div className="grid gap-6">
      <Card>
        <form onSubmit={onSubmit} noValidate>
          <CardHeader>
            <CardTitle>Workspace details</CardTitle>
            <CardDescription>{editable ? 'Used across the dashboard, automations and AI replies.' : 'Only Owners and Admins can change these settings.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset disabled={!editable} className="grid gap-4">
              <WorkspaceFields form={form} idPrefix="settings-ws" />
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-subtle">
                <span>
                  Workspace ID: <code className="text-muted">{ws.slug}</code>
                </span>
                <span>Created {formatDate(ws.createdAt)}</span>
              </div>
            </fieldset>
          </CardContent>
          {editable && (
            <CardFooter>
              <Button type="submit" loading={form.formState.isSubmitting} disabled={!form.formState.isDirty}>
                Save changes
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>
      <DangerZone />
    </div>
  );
}

function DangerZone() {
  const { membership } = useWorkspace();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<'leave' | 'delete' | null>(null);
  const [confirmName, setConfirmName] = useState('');

  const after = async (msg: string) => {
    try {
      localStorage.removeItem('instaflow.workspace');
    } catch {
      /* optional */
    }
    toast.success(msg);
    setDialog(null);
    qc.removeQueries({ queryKey: ['ws'] });
    await qc.invalidateQueries({ queryKey: ME_KEY });
    navigate('/', { replace: true });
  };
  const leave = useMutation({
    mutationFn: () => api.post('/api/workspaces/current/leave'),
    onSuccess: () => after(`You left ${membership.workspace.name}`),
    onError: (err) => toast.error(errorMessage(err)),
  });
  const del = useMutation({
    mutationFn: () => api.delete('/api/workspaces/current', { confirmName }),
    onSuccess: () => after(`${membership.workspace.name} was deleted`),
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <Card className="border-danger/25">
      <CardHeader>
        <CardTitle className="text-danger">Danger zone</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[13.5px] font-medium">Leave workspace</div>
            <div className="text-[12.5px] text-subtle">You’ll lose access until someone invites you again.</div>
          </div>
          <Button variant="destructive-outline" onClick={() => setDialog('leave')}>
            Leave
          </Button>
        </div>
        <Can permission="workspace:delete">
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[13.5px] font-medium">Delete workspace</div>
              <div className="text-[12.5px] text-subtle">Removes access for every member immediately. Data is purged after a retention period.</div>
            </div>
            <Button variant="destructive" onClick={() => setDialog('delete')}>
              Delete workspace
            </Button>
          </div>
        </Can>
      </CardContent>

      <Dialog open={dialog === 'leave'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave {membership.workspace.name}?</DialogTitle>
            <DialogDescription>You won’t be able to see its conversations or automations anymore.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" loading={leave.isPending} onClick={() => leave.mutate()}>
              Leave workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'delete'} onOpenChange={(o) => { if (!o) { setDialog(null); setConfirmName(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {membership.workspace.name}?</DialogTitle>
            <DialogDescription>Every member loses access immediately. This can’t be undone from the dashboard.</DialogDescription>
          </DialogHeader>
          <FormField id="confirm-name" label={`Type “${membership.workspace.name}” to confirm`}>
            <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
          </FormField>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={confirmName.trim() !== membership.workspace.name} loading={del.isPending} onClick={() => del.mutate()}>
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ------------------------------------------------------------------ Profile
function ProfileSettings() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const profile = useForm<z.input<typeof updateProfileSchema>, unknown, z.output<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: me?.user.name ?? '' },
  });
  const password = useForm<z.input<typeof changePasswordSchema>, unknown, z.output<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const saveProfile = profile.handleSubmit(async (values) => {
    try {
      const updated = await api.patch<MeDto>('/api/auth/me', values, { workspace: false });
      qc.setQueryData(ME_KEY, updated);
      profile.reset(values);
      toast.success('Profile updated');
    } catch (err) {
      applyServerErrors(err, profile.setError, ['name']);
    }
  });
  const savePassword = password.handleSubmit(async (values) => {
    try {
      const res = await api.post<{ otherSessionsRevoked: number }>('/api/auth/change-password', values, { workspace: false });
      password.reset();
      toast.success(res.otherSessionsRevoked ? `Password changed. Signed out of ${res.otherSessionsRevoked} other device(s).` : 'Password changed.');
    } catch (err) {
      applyServerErrors(err, password.setError, ['currentPassword', 'newPassword']);
    }
  });

  if (!me) return null;
  return (
    <div className="grid gap-6">
      <Card>
        <form onSubmit={saveProfile} noValidate>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>How teammates see you in InstaFlow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="profile-name" label="Name" error={profile.formState.errors.name?.message}>
              <Input autoComplete="name" {...profile.register('name')} />
            </FormField>
            <div className="grid gap-1.5">
              <span className="text-[13px] font-medium">Email</span>
              <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface-2/60 px-3 text-sm text-muted">
                <span className="truncate">{me.user.email}</span>
                {me.user.emailVerified ? (
                  <Badge variant="success" className="ml-auto">
                    <CircleCheck /> Verified
                  </Badge>
                ) : (
                  <Badge variant="warning" className="ml-auto">
                    Unverified
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={profile.formState.isSubmitting} disabled={!profile.formState.isDirty}>
              Save profile
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <form onSubmit={savePassword} noValidate>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Your other devices will be signed out.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="current-password" label="Current password" error={password.formState.errors.currentPassword?.message}>
              <PasswordInput autoComplete="current-password" {...password.register('currentPassword')} />
            </FormField>
            <FormField id="new-password" label="New password" error={password.formState.errors.newPassword?.message}>
              <PasswordInput autoComplete="new-password" {...password.register('newPassword')} />
            </FormField>
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={password.formState.isSubmitting}>
              Update password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------- Security
function AuditLogCard() {
  const { membership } = useWorkspace();
  const [page, setPage] = useState(1);
  const logs = useQuery({
    queryKey: wsKey(membership.workspace.id, 'audit', page),
    queryFn: () => api.getWithMeta<AuditLogDto[]>(`/api/audit-logs?page=${page}&pageSize=15`),
    placeholderData: keepPreviousData,
  });
  const pagination = logs.data?.meta?.pagination;

  return (
    <Card>
      <CardHeader className="pb-4 sm:pb-4">
        <CardTitle>Audit log</CardTitle>
        <CardDescription>Security-relevant actions in this workspace. Visible to Owners and Admins.</CardDescription>
      </CardHeader>
      {logs.isPending ? (
        <div className="grid gap-3 p-6">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : logs.isError ? (
        <ErrorState error={logs.error} onRetry={() => void logs.refetch()} />
      ) : logs.data.data.length === 0 ? (
        <EmptyState icon={<Clock />} title="No events yet" className="py-10" />
      ) : (
        <>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Event</TH>
                <TH>Actor</TH>
                <TH className="hidden md:table-cell">When</TH>
              </TR>
            </THead>
            <TBody>
              {logs.data.data.map((log) => (
                <TR key={log.id}>
                  <TD>
                    <code className="rounded bg-surface-3 px-1.5 py-0.5 text-[12px] text-foreground">{log.action}</code>
                  </TD>
                  <TD className="text-muted">{log.actor?.name ?? 'System'}</TD>
                  <TD className="hidden text-muted md:table-cell">{formatDate(log.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {pagination && pagination.totalPages > 1 && (
            <CardFooter className="justify-between">
              <span className="text-[12.5px] text-subtle">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </>
      )}
    </Card>
  );
}

function SecuritySettings() {
  const logoutAll = useMutation({
    mutationFn: () => api.post<{ revokedSessions: number }>('/api/auth/logout-all', {}, { workspace: false }),
    onSuccess: (r) => toast.success(r.revokedSessions ? `Signed out of ${r.revokedSessions} other session(s)` : 'No other active sessions'),
    onError: (err) => toast.error(errorMessage(err)),
  });
  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-primary">
              <MonitorSmartphone className="size-5" />
            </span>
            <div>
              <div className="text-[14px] font-medium">Sign out of other devices</div>
              <div className="text-[12.5px] text-subtle">Ends every session except this one — useful if you used a shared computer.</div>
            </div>
          </div>
          <Button variant="secondary" onClick={() => logoutAll.mutate()} loading={logoutAll.isPending}>
            <LogOut /> Sign out others
          </Button>
        </CardContent>
      </Card>
      <Alert tone="info">
        <ShieldCheck />
        <span>
          InstaFlow never asks for your Instagram password. Instagram access tokens (from Phase 2) are encrypted at rest with AES-256-GCM and never shown in the dashboard or API.
        </span>
      </Alert>
      <Can permission="audit:read">
        <AuditLogCard />
      </Can>
    </div>
  );
}

const TABS = ['workspace', 'profile', 'security'] as const;
type Tab = (typeof TABS)[number];

export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : 'workspace';
  return (
    <div>
      <PageHeader title="Settings" description="Manage this workspace, your profile and account security." />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="workspace">
            <Building /> Workspace
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User /> Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck /> Security
          </TabsTrigger>
        </TabsList>
        <TabsContent value="workspace">
          <WorkspaceSettings />
        </TabsContent>
        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
