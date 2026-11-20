import {
  ChartColumn,
  Clapperboard,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type * as React from 'react';
import { InstagramGlyph } from '@/components/brand';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon | React.FC<{ className?: string }>;
  /** Roadmap phase in which the section ships; undefined = available now. */
  phase?: number;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/** Sidebar order follows the product spec exactly. */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard },
      { to: '/accounts', label: 'Connected Accounts', icon: InstagramGlyph, phase: 2 },
      { to: '/reels', label: 'Reels Manager', icon: Clapperboard, phase: 2 },
    ],
  },
  {
    label: 'Automate',
    items: [
      { to: '/automations', label: 'Automations', icon: Zap, phase: 3 },
      { to: '/keywords', label: 'Keyword Manager', icon: KeyRound, phase: 3 },
      { to: '/inbox', label: 'AI Inbox', icon: Inbox, phase: 4 },
      { to: '/flows', label: 'Flow Builder', icon: Workflow, phase: 5 },
      { to: '/products', label: 'Product Knowledge', icon: Package, phase: 4 },
    ],
  },
  {
    label: 'Insights',
    items: [{ to: '/analytics', label: 'Analytics', icon: ChartColumn, phase: 6 }],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/team', label: 'Team Members', icon: Users },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
