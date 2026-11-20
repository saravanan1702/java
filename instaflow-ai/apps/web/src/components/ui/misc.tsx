import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';
import { cn, initials } from '@/lib/utils';

// ---------------------------------------------------------------- Skeleton
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-surface-3', className)} {...props} />;
}

// ------------------------------------------------------------------ Avatar
const AVATAR_TINTS = ['from-violet-500 to-indigo-500', 'from-blue-500 to-cyan-500', 'from-fuchsia-500 to-violet-500', 'from-indigo-500 to-blue-500', 'from-purple-500 to-pink-500'];

export function Avatar({ name, className }: { name: string; className?: string }) {
  const tint = AVATAR_TINTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TINTS.length];
  return (
    <AvatarPrimitive.Root className={cn('relative inline-flex size-8 shrink-0 overflow-hidden rounded-full', className)}>
      <AvatarPrimitive.Fallback className={cn('flex size-full items-center justify-center bg-gradient-to-br text-[11px] font-semibold text-white', tint)}>
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

// ------------------------------------------------------------------- Tabs
export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('scrollbar-thin flex w-full gap-1 overflow-x-auto border-b border-border', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-[13px] font-medium text-muted transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('pt-6 outline-none data-[state=active]:animate-fade-in', className)} {...props} />;
}

// ---------------------------------------------------------------- Tooltip
export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({ content, children, side = 'top' }: { content: React.ReactNode; children: React.ReactNode; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-64 rounded-md border border-border bg-surface-3 px-2.5 py-1.5 text-[12px] text-foreground shadow-pop data-[state=delayed-open]:animate-fade-in"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// ------------------------------------------------------------------ Table
export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="scrollbar-thin w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}
export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}
export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}
export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-border transition-colors hover:bg-surface-2/60', className)} {...props} />;
}
export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('h-10 whitespace-nowrap px-4 text-left align-middle text-[11.5px] font-medium uppercase tracking-wider text-subtle', className)} {...props} />;
}
export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}

// ------------------------------------------------------------------ Alert
const ALERT_TONES = {
  info: 'border-accent/25 bg-accent-soft text-foreground [&>svg]:text-accent',
  warning: 'border-warning/25 bg-warning-soft text-foreground [&>svg]:text-warning',
  danger: 'border-danger/25 bg-danger-soft text-foreground [&>svg]:text-danger',
  success: 'border-success/25 bg-success-soft text-foreground [&>svg]:text-success',
} as const;

export function Alert({ tone = 'info', className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { tone?: keyof typeof ALERT_TONES }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-lg border px-4 py-3 text-[13px] [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0', ALERT_TONES[tone], className)} {...props}>
      {children}
    </div>
  );
}
