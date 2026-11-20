import { useId } from 'react';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  // Unique per instance: a gradient defined inside a display:none subtree (e.g. the
  // hidden desktop sidebar on mobile) would otherwise blank every other logo.
  const gradientId = `if-logo-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset=".5" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path d="M9 20.5c0-3 2.4-5.5 5.5-5.5H23M23 15l-3.5-3.5M23 15l-3.5 3.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight">
          InstaFlow <span className="text-brand-gradient">AI</span>
        </span>
      )}
    </span>
  );
}

/** Generic camera glyph (lucide removed brand icons). Not Meta's trademark logo. */
export function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn('size-4', className)} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}
