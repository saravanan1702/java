import * as Menu from '@radix-ui/react-dropdown-menu';
import * as React from 'react';
import { cn } from '@/lib/utils';

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuGroup = Menu.Group;

export const DropdownMenuContent = React.forwardRef<React.ComponentRef<typeof Menu.Content>, React.ComponentPropsWithoutRef<typeof Menu.Content>>(
  ({ className, sideOffset = 6, ...props }, ref) => (
    <Menu.Portal>
      <Menu.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn('z-50 min-w-48 overflow-hidden rounded-lg border border-border bg-surface-1 p-1 shadow-pop data-[state=open]:animate-fade-in', className)}
        {...props}
      />
    </Menu.Portal>
  ),
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof Menu.Item>,
  React.ComponentPropsWithoutRef<typeof Menu.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <Menu.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-3 [&_svg]:size-4 [&_svg]:text-subtle',
      destructive && 'text-danger data-[highlighted]:bg-danger-soft [&_svg]:text-danger',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

export function DropdownMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Label>) {
  return <Menu.Label className={cn('px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-subtle', className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}
