import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { ErrorState, FullPageLoader } from '@/components/states';
import { WorkspaceProvider } from '../workspace/workspace-context';
import { useMe } from './session';

/** Only allow same-site relative redirects (prevents open-redirects via ?next=). */
export function safeNext(next: string | null, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

export function RequireAuth() {
  const { data: me, isPending, error, refetch } = useMe();
  const location = useLocation();
  if (isPending) return <FullPageLoader />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} className="min-h-dvh" />;
  if (!me) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <Outlet />;
}

/** Requires at least one workspace; otherwise sends the user to onboarding. */
export function RequireWorkspace() {
  const { data: me } = useMe();
  if (!me) return null;
  if (me.memberships.length === 0) return <Navigate to="/onboarding" replace />;
  return (
    <WorkspaceProvider memberships={me.memberships} lastWorkspaceId={me.user.lastWorkspaceId}>
      <Outlet />
    </WorkspaceProvider>
  );
}

export function GuestOnly() {
  const { data: me, isPending } = useMe();
  const [params] = useSearchParams();
  if (isPending) return <FullPageLoader />;
  if (me) return <Navigate to={safeNext(params.get('next'))} replace />;
  return <Outlet />;
}
