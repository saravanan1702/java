import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef<React.ComponentRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => <LabelPrimitive.Root ref={ref} className={cn('text-[13px] font-medium text-foreground', className)} {...props} />,
);
Label.displayName = 'Label';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
}

/** Label + control + accessible error/hint wiring. */
export function FormField({ id, label, error, hint, action, className, children }: FormFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {React.cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[12.5px] text-danger animate-fade-in">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
