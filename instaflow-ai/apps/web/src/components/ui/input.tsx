import * as React from 'react';
import { cn } from '@/lib/utils';

export const inputClass =
  'flex h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-foreground placeholder:text-subtle transition-colors outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/25';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputClass, className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(inputClass, 'min-h-24 h-auto py-2.5 resize-y', className)} {...props} />
));
Textarea.displayName = 'Textarea';
