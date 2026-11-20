import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<React.ComponentRef<typeof SelectPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors hover:border-border-strong focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 data-[placeholder]:text-subtle [&>span]:truncate',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-subtle" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  ),
);
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = React.forwardRef<React.ComponentRef<typeof SelectPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>>(
  ({ className, children, position = 'popper', ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        sideOffset={4}
        className={cn(
          'z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface-1 shadow-pop data-[state=open]:animate-fade-in',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="scrollbar-thin max-h-72 overflow-y-auto p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  ),
);
SelectContent.displayName = 'SelectContent';

export const SelectItem = React.forwardRef<React.ComponentRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-2 pr-8 text-[13px] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-3',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex">
        <Check className="size-4 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  ),
);
SelectItem.displayName = 'SelectItem';
