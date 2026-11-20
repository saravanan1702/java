import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ROLE_LABELS } from '@instaflow/shared';
import { Check, ChevronsUpDown, LogOut, Mail, Menu, Moon, Plus, Settings, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Logo } from '@/components/brand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SheetContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useLogout, useMe } from '@/features/auth/session';
import { NAV_GROUPS, type NavItem } from '@/features/navigation';
import { CreateWorkspaceDialog } from '@/features/workspace/create-workspace-dialog';
import { useWorkspace } from '@/features/workspace/workspace-context';

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-md px-2.5 py-[7px] text-[13.5px] font-medium transition-colors',
          isActive ? 'bg-surface-3 text-foreground' : 'text-muted hover:bg-surface-2 hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-gradient" aria-hidden />}
          <Icon className={cn('size-[18px] shrink-0', isActive ? 'text-primary' : 'text-subtle group-hover:text-muted')} />
          <span className="truncate">{item.label}</span>
          {item.phase && (
            <span className="ml-auto rounded px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-subtle ring-1 ring-border" title={`Planned for Phase ${item.phase}`}>
              Soon
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function WorkspaceSwitcher() {
  const { membership, memberships, switchWorkspace } = useWorkspace();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface-3"
            aria-label="Switch workspace"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-gradient text-[13px] font-semibold text-white">
              {membership.workspace.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold">{membership.workspace.name}</span>
              <span className="block text-[11.5px] text-subtle">
                {ROLE_LABELS[membership.role]} · {membership.workspace.plan.charAt(0) + membership.workspace.plan.slice(1).toLowerCase()} plan
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-subtle" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-60">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {memberships.map((m) => (
            <DropdownMenuItem key={m.workspace.id} onSelect={() => switchWorkspace(m.workspace.id)}>
              <span className="flex size-6 items-center justify-center rounded bg-surface-3 text-[11px] font-semibold">{m.workspace.name.charAt(0).toUpperCase()}</span>
              <span className="min-w-0 flex-1 truncate">{m.workspace.name}</span>
              {m.workspace.id === membership.workspace.id ? <Check className="!text-primary" /> : <span className="text-[11px] text-subtle">{ROLE_LABELS[m.role]}</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus /> Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}

function UserMenu() {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  if (!me) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2" aria-label="Account menu">
          <Avatar name={me.user.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{me.user.name}</span>
            <span className="block truncate text-[11.5px] text-subtle">{me.user.email}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-subtle" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
        <DropdownMenuItem onSelect={() => navigate('/settings?tab=profile')}>
          <Settings /> Profile & security
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggle(); }}>
          {theme === 'dark' ? <Sun /> : <Moon />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center px-5">
        <Logo />
      </div>
      <div className="px-3 pb-3">
        <WorkspaceSwitcher />
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.label ?? i} className={cn(i > 0 && 'mt-4')}>
            {group.label && <div className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-subtle">{group.label}</div>}
            <div className="grid gap-0.5">
              {group.items.map((item) => (
                <NavRow key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <UserMenu />
      </div>
    </div>
  );
}

function VerifyEmailBanner() {
  const { data: me } = useMe();
  const [sending, setSending] = useState(false);
  if (!me || me.user.emailVerified) return null;
  const resend = async () => {
    setSending(true);
    try {
      await api.post('/api/auth/resend-verification', {}, { workspace: false });
      toast.success(`Verification email sent to ${me.user.email}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="border-b border-warning/20 bg-warning-soft px-4 py-2.5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
        <Mail className="size-4 text-warning" />
        <span>
          Verify <strong className="font-semibold">{me.user.email}</strong> to invite teammates and connect Instagram.
        </span>
        <Button variant="link" size="sm" className="h-auto text-[13px]" onClick={resend} loading={sending}>
          Resend email
        </Button>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { membership } = useWorkspace();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-border bg-surface-1 lg:block">
        <SidebarContent />
      </aside>

      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent aria-describedby={undefined}>
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
          <Logo compact />
          <span className="truncate text-sm font-medium">{membership.workspace.name}</span>
          <Badge variant="neutral" className="ml-auto">
            {ROLE_LABELS[membership.role]}
          </Badge>
        </header>
        <VerifyEmailBanner />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
