import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium leading-4 whitespace-nowrap [&_svg]:size-3', {
  variants: {
    variant: {
      neutral: 'bg-surface-3 text-muted border border-border',
      primary: 'bg-primary-soft text-primary',
      accent: 'bg-accent-soft text-accent',
      success: 'bg-success-soft text-success',
      warning: 'bg-warning-soft text-warning',
      danger: 'bg-danger-soft text-danger',
      outline: 'border border-border-strong text-muted',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
