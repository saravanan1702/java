import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-gradient text-white shadow-[0_1px_0_0_rgb(255_255_255/0.2)_inset,0_6px_20px_-6px_var(--glow)] hover:brightness-110',
        secondary: 'bg-surface-3 text-foreground border border-border hover:bg-surface-2 hover:border-border-strong',
        outline: 'border border-border-strong bg-transparent text-foreground hover:bg-surface-2',
        ghost: 'text-muted hover:text-foreground hover:bg-surface-2',
        destructive: 'bg-danger text-white hover:brightness-110',
        'destructive-outline': 'border border-danger/40 text-danger hover:bg-danger-soft',
        link: 'text-primary underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
        {asChild ? (
          children
        ) : (
          <>
            {loading && <LoaderCircle className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
