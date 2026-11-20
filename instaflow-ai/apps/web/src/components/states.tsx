import { CircleExclamationPoint, LoaderCircle, RefreshCw } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';
import { errorMessage } from '@/lib/api';
import { LogoMark } from './brand';
import { Button } from './ui/button';

export function PageHeader({ title, description, actions, eyebrow }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between animate-rise">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-title font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-2xl bg-primary/25 blur-xl" aria-hidden />
        <div className="relative flex size-12 items-center justify-center rounded-2xl border border-border-strong bg-surface-2 text-primary [&_svg]:size-5">{icon}</div>
      </div>
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p>}
      {children}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
        <CircleExclamationPoint className="size-5" />
      </div>
      <h3 className="text-[15px] font-semibold">Couldn’t load this</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      )}
    </div>
  );
}

export function FullPageLoader({ label = 'Loading InstaFlow…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <LogoMark className="size-10 animate-pulse" />
      <span className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" /> {label}
      </span>
    </div>
  );
}
