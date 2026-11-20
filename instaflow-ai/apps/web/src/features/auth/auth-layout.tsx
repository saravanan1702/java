import { Bot, Eye, EyeOff, Languages, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';
import { Logo } from '@/components/brand';
import { Input } from '@/components/ui/input';

const POINTS = [
  { icon: MessageCircle, title: 'Comment-to-DM automation', body: 'Reply privately to the right comments on the right Reels.' },
  { icon: Languages, title: 'English, Tamil & Tanglish', body: 'Understands how your customers actually write.' },
  { icon: ShieldCheck, title: 'Official Meta APIs only', body: 'No passwords, no scraping, no browser bots.' },
];

/** Illustrative example of a flow — not live data. */
function ExampleFlow() {
  return (
    <div className="relative mt-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-white/45">
        <span>Example automation</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 normal-case tracking-normal text-white/60">Illustration</span>
      </div>
      <div className="grid gap-2.5 text-[13px]">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/80">K</span>
          <div className="rounded-xl rounded-tl-sm bg-white/[0.07] px-3 py-2 text-white/85">
            Price enna? 😍 <span className="text-white/40">· comment on your Reel</span>
          </div>
        </div>
        <div className="ml-9 flex items-center gap-2 text-[11.5px] text-violet-300/90">
          <Bot className="size-3.5" /> Keyword “price” matched → private reply
        </div>
        <div className="flex items-start justify-end gap-2.5">
          <div className="rounded-xl rounded-tr-sm bg-gradient-to-br from-violet-500/90 to-blue-500/90 px-3 py-2 text-white">
            Hi! Indha saree ₹1,499 dhaan. Link anuppattuma? <Send className="ml-1 inline size-3 opacity-70" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-[#07070a] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute -left-32 -top-32 size-[520px] rounded-full bg-violet-600/30 blur-[120px]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-40 right-[-120px] size-[480px] rounded-full bg-blue-600/25 blur-[120px]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgb(255_255_255/0.07)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.07)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
          aria-hidden
        />
        <Link to="/" className="relative text-white">
          <Logo />
        </Link>
        <div className="relative max-w-lg">
          <h2 className="text-display font-semibold text-white">
            Turn every comment into a <span className="text-brand-gradient">conversation</span>.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            InstaFlow AI replies to your Instagram comments and DMs automatically — using your real product details, in your customers’ language.
          </p>
          <ul className="mt-8 grid gap-4">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-violet-300">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{title}</span>
                  <span className="block text-[13px] text-white/50">{body}</span>
                </span>
              </li>
            ))}
          </ul>
          <ExampleFlow />
        </div>
        <p className="relative text-xs text-white/35">Instagram is a trademark of Meta Platforms, Inc. InstaFlow AI is not affiliated with Meta.</p>
      </aside>

      <main className="flex min-h-dvh flex-col px-4 py-8 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px] animate-rise">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function AuthHeading({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-title font-semibold">{title}</h1>
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}
    </div>
  );
}

export const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? 'text' : 'password'} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-subtle transition-colors hover:text-foreground"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';
