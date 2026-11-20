import { zodResolver } from '@hookform/resolvers/zod';
import { LANGUAGE_LABELS, WORKSPACE_LANGUAGES, createWorkspaceSchema, type WorkspaceLanguage } from '@instaflow/shared';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { FormField } from '@/components/ui/form-field';
import { Input, inputClass } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type WorkspaceFormValues = z.output<typeof createWorkspaceSchema>;

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

/**
 * Browsers' IANA lists differ: Chromium omits "UTC" and may list legacy names
 * (e.g. "Asia/Calcutta" instead of "Asia/Kolkata"). Always include common
 * zones and the currently selected value so the select never renders blank.
 */
function timezoneOptions(selected: string | undefined): string[] {
  let zones: string[] = [];
  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch {
    /* very old browser: fall back to the essentials below */
  }
  const set = new Set([...zones, 'UTC', 'Asia/Kolkata', browserTimezone()]);
  if (selected) set.add(selected);
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function useWorkspaceForm(defaults?: Partial<WorkspaceFormValues>) {
  return useForm<z.input<typeof createWorkspaceSchema>, unknown, WorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: '', timezone: browserTimezone(), defaultLanguage: 'EN', ...defaults },
  });
}

/** Shared fields for creating / editing a workspace (onboarding, dialog, settings). */
export function WorkspaceFields({ form, idPrefix = 'ws' }: { form: ReturnType<typeof useWorkspaceForm>; idPrefix?: string }) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const selectedTz = watch('timezone');
  const zones = useMemo(() => timezoneOptions(selectedTz), [selectedTz]);
  return (
    <div className="grid gap-4">
      <FormField id={`${idPrefix}-name`} label="Workspace name" error={errors.name?.message} hint="Usually your brand or store name. You can change it later.">
        <Input placeholder="e.g. Kavya Silks" autoComplete="organization" {...register('name')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`${idPrefix}-language`} label="Main customer language" error={errors.defaultLanguage?.message}>
          <Controller
            control={control}
            name="defaultLanguage"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as WorkspaceLanguage)}>
                <SelectTrigger aria-label="Main customer language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKSPACE_LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LANGUAGE_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField id={`${idPrefix}-timezone`} label="Timezone" error={errors.timezone?.message}>
          <select className={cn(inputClass, 'appearance-none pr-8')} {...register('timezone')}>
            {zones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </div>
  );
}
