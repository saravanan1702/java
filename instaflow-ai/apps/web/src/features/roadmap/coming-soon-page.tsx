import { CircleDashed } from 'lucide-react';
import { useLocation } from 'react-router';
import { PageHeader } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ALL_NAV_ITEMS } from '../navigation';

/**
 * Honest placeholders for sections scheduled in later phases. They describe
 * what will ship; they never render fake data or pretend to work.
 */
const DETAILS: Record<string, { description: string; features: string[] }> = {
  '/accounts': {
    description: 'Connect Instagram Professional accounts through Meta’s official Instagram Login.',
    features: ['Secure OAuth connection — no passwords stored', 'Granted-permission and token-expiry monitoring', 'Account status and webhook subscription health', 'Disconnect and data removal'],
  },
  '/reels': {
    description: 'See your accessible media and choose exactly where automations run.',
    features: ['Thumbnails, captions, media type and permalinks', 'Enable, pause or exclude automation per Reel', 'Bulk selection, search and filters', 'Clear reporting when a media type doesn’t support comment webhooks'],
  },
  '/automations': {
    description: 'Comment-to-DM rules that reply privately to the right comments.',
    features: ['Reel-specific and global rules', 'Priority-based conflict resolution', 'At most one private reply per comment, never duplicated', 'Execution log with Meta API responses'],
  },
  '/keywords': {
    description: 'Manage the keywords that trigger your automations.',
    features: ['Exact, contains and starts-with matching', 'Case-insensitive matching', 'Tamil, Tanglish and English normalization', 'Multiple keywords per rule'],
  },
  '/inbox': {
    description: 'One inbox for every Instagram conversation, with AI and humans working together.',
    features: ['Realtime conversation list and history', 'Manual replies within Instagram’s messaging window', 'AI pause and human takeover', 'Tags and internal notes'],
  },
  '/flows': {
    description: 'A visual builder for multi-step conversations.',
    features: ['Drag-and-drop triggers, conditions and actions', 'Versioned flow definitions', 'Server-side validation before activation', 'Test runs before going live'],
  },
  '/products': {
    description: 'The approved facts your AI assistant is allowed to use.',
    features: ['Products, prices, stock, colours and delivery details', 'Return policy and FAQs', 'AI never invents prices, stock or discounts', 'CSV import (later phase)'],
  },
  '/analytics': {
    description: 'Real execution data — never sample numbers.',
    features: ['Comments, triggers, DMs sent and failures', 'AI responses and human handovers', 'Leads vs. confirmed sales, kept separate', 'Top rules and top Reels with date filters'],
  },
};

export function ComingSoonPage() {
  const { pathname } = useLocation();
  const item = ALL_NAV_ITEMS.find((i) => i.to === pathname);
  const details = DETAILS[pathname];
  if (!item || !details) return null;
  const Icon = item.icon;

  return (
    <div>
      <PageHeader title={item.label} description={details.description} eyebrow={<Badge variant="warning">Planned for Phase {item.phase}</Badge>} />
      <Card className="surface-glow overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-10 md:grid-cols-[auto_1fr] md:items-start">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-2xl" aria-hidden />
            <div className="relative flex size-16 items-center justify-center rounded-2xl border border-border-strong bg-surface-2 text-primary">
              <Icon className="size-7" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Not available yet</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              This section is part of the InstaFlow roadmap and is intentionally inactive until it’s fully built and tested. Here’s what it will do:
            </p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {details.features.map((f) => (
                <li key={f} className="flex gap-2.5 rounded-lg border border-border bg-surface-1/60 p-3 text-[13px]">
                  <CircleDashed className="mt-0.5 size-4 shrink-0 text-subtle" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
