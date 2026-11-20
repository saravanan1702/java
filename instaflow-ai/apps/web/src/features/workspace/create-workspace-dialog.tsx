import { useQueryClient } from '@tanstack/react-query';
import type { MembershipDto } from '@instaflow/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { ME_KEY } from '../auth/session';
import { useWorkspace } from './workspace-context';
import { WorkspaceFields, useWorkspaceForm } from './workspace-form';

export function CreateWorkspaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useWorkspaceForm();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { switchWorkspace } = useWorkspace();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const membership = await api.post<MembershipDto>('/api/workspaces', values, { workspace: false });
      await qc.invalidateQueries({ queryKey: ME_KEY });
      switchWorkspace(membership.workspace.id);
      toast.success(`Created “${membership.workspace.name}”`);
      onOpenChange(false);
      form.reset();
      navigate('/');
    } catch (err) {
      applyServerErrors(err, form.setError, ['name', 'timezone', 'defaultLanguage']);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a workspace</DialogTitle>
          <DialogDescription>Each workspace has its own Instagram accounts, automations, team and data.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <WorkspaceFields form={form} idPrefix="new-ws" />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
