import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ROLE_LABELS,
  assignableRoles,
  checkMemberChange,
  inviteMemberSchema,
  type InvitationDto,
  type MemberDto,
  type WorkspaceRole,
} from '@instaflow/shared';
import { Ellipsis, Mail, RefreshCw, Trash, UserMinus, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import type * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Alert, Avatar, Skeleton, TBody, TD, TH, THead, TR, Table, Tooltip } from '@/components/ui/misc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { formatDate, formatRelative } from '@/lib/utils';
import { useMe } from '../auth/session';
import { Can, useWorkspace, wsKey } from '../workspace/workspace-context';

const ROLE_BADGE: Record<WorkspaceRole, 'primary' | 'accent' | 'neutral'> = { OWNER: 'primary', ADMIN: 'accent', AGENT: 'neutral' };

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { membership } = useWorkspace();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const roles = assignableRoles(membership.role);
  const form = useForm<z.input<typeof inviteMemberSchema>, unknown, z.output<typeof inviteMemberSchema>>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', role: 'AGENT' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await api.post('/api/invitations', values);
      toast.success(`Invitation sent to ${values.email}`);
      await qc.invalidateQueries({ queryKey: wsKey(membership.workspace.id) });
      form.reset();
      onOpenChange(false);
    } catch (err) {
      applyServerErrors(err, form.setError, ['email', 'role']);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>They’ll get an email link to join {membership.workspace.name}. Invitations expire after 7 days.</DialogDescription>
        </DialogHeader>
        {!me?.user.emailVerified ? (
          <Alert tone="warning">
            <Mail />
            <span>Verify your email address before inviting teammates.</span>
          </Alert>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <FormField id="invite-email" label="Email address" error={form.formState.errors.email?.message}>
              <Input type="email" placeholder="teammate@business.com" autoFocus {...form.register('email')} />
            </FormField>
            <FormField id="invite-role" label="Role" error={form.formState.errors.role?.message}>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                <UserPlus /> Send invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MembersTable({ members }: { members: MemberDto[] }) {
  const { membership } = useWorkspace();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [removing, setRemoving] = useState<MemberDto | null>(null);
  const ownerCount = members.filter((m) => m.role === 'OWNER').length;
  const invalidate = () => qc.invalidateQueries({ queryKey: wsKey(membership.workspace.id) });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: WorkspaceRole }) => api.patch<MemberDto>(`/api/members/${id}`, { role }),
    onSuccess: (m) => {
      toast.success(`${m.user.name} is now ${ROLE_LABELS[m.role]}`);
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/members/${id}`),
    onSuccess: () => {
      toast.success(`${removing?.user.name} was removed`);
      setRemoving(null);
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <>
      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH>Member</TH>
            <TH>Role</TH>
            <TH className="hidden md:table-cell">Joined</TH>
            <TH className="w-12">
              <span className="sr-only">Actions</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {members.map((m) => {
            const isMe = m.user.id === me?.user.id;
            const roleOptions = assignableRoles(membership.role).filter(
              (r) => r === m.role || checkMemberChange({ actorRole: membership.role, actorIsTarget: isMe, targetRole: m.role, newRole: r, ownerCount }).ok,
            );
            const canEditRole = roleOptions.length > 1;
            const removal = checkMemberChange({ actorRole: membership.role, actorIsTarget: isMe, targetRole: m.role, ownerCount });
            return (
              <TR key={m.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={m.user.name} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 truncate font-medium">
                        {m.user.name} {isMe && <span className="text-[12px] font-normal text-subtle">(you)</span>}
                      </div>
                      <div className="truncate text-[12.5px] text-subtle">{m.user.email}</div>
                    </div>
                  </div>
                </TD>
                <TD>
                  {canEditRole ? (
                    <Select value={m.role} onValueChange={(r) => changeRole.mutate({ id: m.id, role: r as WorkspaceRole })} disabled={changeRole.isPending}>
                      <SelectTrigger className="h-8 w-28 text-[13px]" aria-label={`Role for ${m.user.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={ROLE_BADGE[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                  )}
                </TD>
                <TD className="hidden text-muted md:table-cell">{formatDate(m.joinedAt)}</TD>
                <TD>
                  {removal.ok && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${m.user.name}`}>
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem destructive onSelect={() => setRemoving(m)}>
                          <UserMinus /> Remove from workspace
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.user.name}?`}
        description="They’ll lose access to this workspace immediately. You can invite them again later."
        confirmLabel="Remove member"
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </>
  );
}

function InvitationsCard() {
  const { membership } = useWorkspace();
  const qc = useQueryClient();
  const invitations = useQuery({
    queryKey: wsKey(membership.workspace.id, 'invitations'),
    queryFn: () => api.get<InvitationDto[]>('/api/invitations'),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: wsKey(membership.workspace.id) });
  const resend = useMutation({
    mutationFn: (id: string) => api.post<InvitationDto>(`/api/invitations/${id}/resend`),
    onSuccess: (i) => {
      toast.success(`Invitation re-sent to ${i.email}`);
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/api/invitations/${id}`),
    onSuccess: () => {
      toast.success('Invitation revoked');
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (invitations.isPending || !invitations.data?.length) return null;
  return (
    <Card className="mt-6">
      <CardHeader className="pb-4 sm:pb-4">
        <CardTitle>Pending invitations</CardTitle>
        <CardDescription>People who haven’t accepted yet.</CardDescription>
      </CardHeader>
      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH>Email</TH>
            <TH>Role</TH>
            <TH className="hidden md:table-cell">Status</TH>
            <TH className="w-28">
              <span className="sr-only">Actions</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {invitations.data.map((inv) => (
            <TR key={inv.id}>
              <TD>
                <div className="font-medium">{inv.email}</div>
                <div className="text-[12.5px] text-subtle">Invited by {inv.invitedBy?.name ?? 'a former member'}</div>
              </TD>
              <TD>
                <Badge variant={ROLE_BADGE[inv.role]}>{ROLE_LABELS[inv.role]}</Badge>
              </TD>
              <TD className="hidden md:table-cell">
                {inv.status === 'EXPIRED' ? <Badge variant="danger">Expired</Badge> : <span className="text-[13px] text-muted">Expires {formatRelative(inv.expiresAt)}</span>}
              </TD>
              <TD>
                <div className="flex justify-end gap-1">
                  <Tooltip content="Resend (new link)">
                    <Button variant="ghost" size="icon" aria-label={`Resend invitation to ${inv.email}`} onClick={() => resend.mutate(inv.id)} disabled={resend.isPending}>
                      <RefreshCw />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Revoke">
                    <Button variant="ghost" size="icon" aria-label={`Revoke invitation to ${inv.email}`} onClick={() => revoke.mutate(inv.id)} disabled={revoke.isPending}>
                      <Trash />
                    </Button>
                  </Tooltip>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

export function TeamPage() {
  const { membership } = useWorkspace();
  const [inviting, setInviting] = useState(false);
  const members = useQuery({
    queryKey: wsKey(membership.workspace.id, 'members'),
    queryFn: () => api.get<MemberDto[]>('/api/members'),
  });

  return (
    <div>
      <PageHeader
        title="Team Members"
        description="Owners manage everything. Admins manage automations, products and Agents. Agents handle conversations."
        actions={
          <Can permission="members:invite">
            <Button onClick={() => setInviting(true)}>
              <UserPlus /> Invite teammate
            </Button>
          </Can>
        }
      />
      <Card>
        {members.isPending ? (
          <div className="grid gap-4 p-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="grid flex-1 gap-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        ) : members.isError ? (
          <ErrorState error={members.error} onRetry={() => void members.refetch()} />
        ) : members.data.length === 0 ? (
          <EmptyState icon={<Users />} title="No members" />
        ) : (
          <MembersTable members={members.data} />
        )}
      </Card>
      <Can permission="members:invite">
        <InvitationsCard />
        <InviteDialog open={inviting} onOpenChange={setInviting} />
      </Can>
    </div>
  );
}
