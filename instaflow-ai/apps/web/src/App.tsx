import { ArrowLeft } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Link, Outlet, Route, Routes } from 'react-router';
import { Logo } from '@/components/brand';
import { FullPageLoader } from '@/components/states';
import { Button } from '@/components/ui/button';
import { GuestOnly, RequireAuth, RequireWorkspace } from '@/features/auth/guards';
import { AcceptInvitePage, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, VerifyEmailPage } from '@/features/auth/pages';
import { ALL_NAV_ITEMS } from '@/features/navigation';

// Signed-in areas are code-split so the auth pages load fast.
const AppShell = lazy(() => import('@/components/layout/app-shell').then((m) => ({ default: m.AppShell })));
const OnboardingPage = lazy(() => import('@/features/onboarding/onboarding-page').then((m) => ({ default: m.OnboardingPage })));
const OverviewPage = lazy(() => import('@/features/overview/overview-page').then((m) => ({ default: m.OverviewPage })));
const TeamPage = lazy(() => import('@/features/team/team-page').then((m) => ({ default: m.TeamPage })));
const SettingsPage = lazy(() => import('@/features/settings/settings-page').then((m) => ({ default: m.SettingsPage })));
const ComingSoonPage = lazy(() => import('@/features/roadmap/coming-soon-page').then((m) => ({ default: m.ComingSoonPage })));

function Lazy() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Outlet />
    </Suspense>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-1 text-title font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The page you’re looking for doesn’t exist or has moved.</p>
      </div>
      <Button asChild variant="secondary">
        <Link to="/">
          <ArrowLeft /> Back to dashboard
        </Link>
      </Button>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Token links work whether or not the user is signed in. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/invite" element={<AcceptInvitePage />} />

      <Route element={<RequireAuth />}>
        <Route element={<Lazy />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<RequireWorkspace />}>
            <Route element={<AppShell />}>
              <Route element={<Lazy />}>
                <Route index element={<OverviewPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="settings" element={<SettingsPage />} />
                {ALL_NAV_ITEMS.filter((i) => i.phase).map((i) => (
                  <Route key={i.to} path={i.to.slice(1)} element={<ComingSoonPage />} />
                ))}
              </Route>
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
