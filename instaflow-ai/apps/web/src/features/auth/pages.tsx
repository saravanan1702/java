import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PASSWORD_MIN_LENGTH,
  ROLE_LABELS,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type AuthResultDto,
  type InvitationPreviewDto,
  type MembershipDto,
} from '@instaflow/shared';
import { ArrowLeft, ArrowRight, CircleCheck, MailCheck, TriangleExclamationPoint } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { FullPageLoader } from '@/components/states';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { ApiError, api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { AuthHeading, AuthLayout, PasswordInput } from './auth-layout';
import { safeNext } from './guards';
import { ME_KEY, useAcceptSession, useMe } from './session';

// ------------------------------------------------------------------- Login
export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const acceptSession = useAcceptSession();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.input<typeof loginSchema>, unknown, z.output<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const { register, handleSubmit, formState } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      acceptSession(await api.post<AuthResultDto>('/api/auth/login', values, { workspace: false }));
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 423 || err.status === 429)) setFormError(err.message);
      else applyServerErrors(err, form.setError, ['email', 'password']);
    }
  });

  return (
    <AuthLayout>
      <AuthHeading title="Welcome back" description="Sign in to manage your Instagram automations." />
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        {formError && (
          <Alert tone="danger">
            <TriangleExclamationPoint />
            <span>{formError}</span>
          </Alert>
        )}
        <FormField id="email" label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@business.com" autoFocus {...register('email')} />
        </FormField>
        <FormField
          id="password"
          label="Password"
          error={formState.errors.password?.message}
          action={
            <Link to="/forgot-password" className="text-[12.5px] text-primary hover:underline">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput autoComplete="current-password" {...register('password')} />
        </FormField>
        <Button type="submit" size="lg" className="mt-2 w-full" loading={formState.isSubmitting}>
          Sign in <ArrowRight />
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New to InstaFlow?{' '}
        <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

// ---------------------------------------------------------------- Register
export function RegisterPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const acceptSession = useAcceptSession();
  const prefillEmail = params.get('email') ?? '';
  const form = useForm<z.input<typeof registerSchema>, unknown, z.output<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: prefillEmail, password: '' },
  });
  const { register, handleSubmit, formState } = form;

  const onSubmit = handleSubmit(async (values) => {
    try {
      acceptSession(await api.post<AuthResultDto>('/api/auth/register', values, { workspace: false }));
      toast.success('Account created — check your inbox to verify your email.');
      navigate(safeNext(params.get('next'), '/onboarding'), { replace: true });
    } catch (err) {
      applyServerErrors(err, form.setError, ['name', 'email', 'password']);
    }
  });

  return (
    <AuthLayout>
      <AuthHeading title="Create your account" description="Free to start. No credit card, and we never ask for your Instagram password." />
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField id="name" label="Your name" error={formState.errors.name?.message}>
          <Input autoComplete="name" placeholder="Kavya Raman" autoFocus {...register('name')} />
        </FormField>
        <FormField id="email" label="Work email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@business.com" {...register('email')} />
        </FormField>
        <FormField id="password" label="Password" error={formState.errors.password?.message} hint={`At least ${PASSWORD_MIN_LENGTH} characters. A short phrase works well.`}>
          <PasswordInput autoComplete="new-password" {...register('password')} />
        </FormField>
        <Button type="submit" size="lg" className="mt-2 w-full" loading={formState.isSubmitting}>
          Create account <ArrowRight />
        </Button>
        <p className="text-center text-[12px] leading-relaxed text-subtle">
          By creating an account you agree to use InstaFlow in line with Meta’s Platform Terms and messaging policies.
        </p>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to={`/login${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

// ---------------------------------------------------------- Forgot password
export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<z.input<typeof forgotPasswordSchema>, unknown, z.output<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema) });
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await api.post('/api/auth/forgot-password', values, { workspace: false });
      setSentTo(values.email);
    } catch (err) {
      applyServerErrors(err, form.setError, ['email']);
    }
  });

  return (
    <AuthLayout>
      {sentTo ? (
        <div>
          <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-success-soft text-success">
            <MailCheck className="size-5" />
          </div>
          <AuthHeading title="Check your inbox" description={<>If an account exists for <strong className="text-foreground">{sentTo}</strong>, we’ve sent a link to reset your password. It expires in 1 hour.</>} />
          <Button asChild variant="secondary" className="w-full">
            <Link to="/login">
              <ArrowLeft /> Back to sign in
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <AuthHeading title="Reset your password" description="Enter your account email and we’ll send you a reset link." />
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <FormField id="email" label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" autoFocus {...form.register('email')} />
            </FormField>
            <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
              Send reset link
            </Button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-muted hover:text-foreground">
              <ArrowLeft className="size-4" /> Back to sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}

// ----------------------------------------------------------- Reset password
const resetFormSchema = resetPasswordSchema.pick({ password: true });

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tokenError, setTokenError] = useState<string | null>(token ? null : 'This reset link is incomplete. Request a new one.');
  const form = useForm<z.input<typeof resetFormSchema>, unknown, z.output<typeof resetFormSchema>>({ resolver: zodResolver(resetFormSchema) });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await api.post('/api/auth/reset-password', { token, password }, { workspace: false });
      qc.setQueryData(ME_KEY, null);
      toast.success('Password updated. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TOKEN_INVALID') setTokenError(err.message);
      else applyServerErrors(err, form.setError, ['password']);
    }
  });

  return (
    <AuthLayout>
      <AuthHeading title="Choose a new password" description="You’ll be signed out of all devices after the change." />
      {tokenError ? (
        <div className="grid gap-4">
          <Alert tone="danger">
            <TriangleExclamationPoint />
            <span>{tokenError}</span>
          </Alert>
          <Button asChild variant="secondary">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField id="password" label="New password" error={form.formState.errors.password?.message} hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}>
            <PasswordInput autoComplete="new-password" autoFocus {...form.register('password')} />
          </FormField>
          <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

// ------------------------------------------------------------ Verify email
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const qc = useQueryClient();
  const { data: me } = useMe();
  const started = useRef(false);
  const verify = useMutation({
    mutationFn: () => api.post('/api/auth/verify-email', { token }, { workspace: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  });

  useEffect(() => {
    // Guard against React StrictMode double-invocation consuming the single-use token twice.
    if (token && !started.current) {
      started.current = true;
      verify.mutate();
    }
  }, [token, verify]);

  const destination = me ? '/' : '/login';
  return (
    <AuthLayout>
      {!token || verify.isError ? (
        <div className="grid gap-4">
          <AuthHeading title="Link not valid" />
          <Alert tone="danger">
            <TriangleExclamationPoint />
            <span>{token ? errorMessage(verify.error) : 'This verification link is incomplete.'}</span>
          </Alert>
          <p className="text-sm text-muted">{me ? 'You can request a fresh link from the banner in your dashboard.' : 'Sign in to request a fresh verification link.'}</p>
          <Button asChild variant="secondary">
            <Link to={destination}>{me ? 'Go to dashboard' : 'Sign in'}</Link>
          </Button>
        </div>
      ) : verify.isSuccess ? (
        <div className="grid gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-success-soft text-success">
            <CircleCheck className="size-5" />
          </div>
          <AuthHeading title="Email verified" description="Thanks! Your email address is confirmed." />
          <Button asChild>
            <Link to={destination}>
              {me ? 'Continue to dashboard' : 'Sign in'} <ArrowRight />
            </Link>
          </Button>
        </div>
      ) : (
        <FullPageLoader label="Verifying your email…" />
      )}
    </AuthLayout>
  );
}

// ---------------------------------------------------------- Accept invite
export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const preview = useQuery({
    queryKey: ['invite-preview', token],
    queryFn: () => api.get<InvitationPreviewDto>(`/api/invitations/lookup?token=${encodeURIComponent(token)}`, { workspace: false }),
    enabled: Boolean(token),
    retry: false,
  });
  const accept = useMutation({
    mutationFn: () => api.post<MembershipDto>('/api/invitations/accept', { token }, { workspace: false }),
    onSuccess: async (m) => {
      try {
        localStorage.setItem('instaflow.workspace', m.workspace.id);
      } catch {
        /* optional */
      }
      await qc.invalidateQueries({ queryKey: ME_KEY });
      toast.success(`You joined ${m.workspace.name}`);
      navigate('/', { replace: true });
    },
  });

  const here = `/invite?token=${encodeURIComponent(token)}`;
  if (mePending || (token && preview.isPending)) return <FullPageLoader label="Loading invitation…" />;

  return (
    <AuthLayout>
      {!token || preview.isError ? (
        <div className="grid gap-4">
          <AuthHeading title="Invitation unavailable" />
          <Alert tone="danger">
            <TriangleExclamationPoint />
            <span>{token ? errorMessage(preview.error) : 'This invitation link is incomplete.'}</span>
          </Alert>
          <p className="text-sm text-muted">Ask the workspace owner to send you a new invitation.</p>
        </div>
      ) : preview.data ? (
        <div className="grid gap-5">
          <AuthHeading
            title={`Join ${preview.data.workspaceName}`}
            description={
              <>
                {preview.data.invitedByName ?? 'A teammate'} invited <strong className="text-foreground">{preview.data.email}</strong> to join as{' '}
                <strong className="text-foreground">{ROLE_LABELS[preview.data.role]}</strong>.
              </>
            }
          />
          {accept.isError && (
            <Alert tone="danger">
              <TriangleExclamationPoint />
              <span>{errorMessage(accept.error)}</span>
            </Alert>
          )}
          {me ? (
            me.user.email === preview.data.email ? (
              <Button size="lg" onClick={() => accept.mutate()} loading={accept.isPending}>
                Accept invitation <ArrowRight />
              </Button>
            ) : (
              <Alert tone="warning">
                <TriangleExclamationPoint />
                <span>
                  You’re signed in as <strong>{me.user.email}</strong>. Sign out and sign in as {preview.data.email} to accept this invitation.
                </span>
              </Alert>
            )
          ) : (
            <div className="grid gap-2.5">
              <Button asChild size="lg">
                <Link to={`/register?email=${encodeURIComponent(preview.data.email)}&next=${encodeURIComponent(here)}`}>Create account to accept</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to={`/login?next=${encodeURIComponent(here)}`}>I already have an account</Link>
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </AuthLayout>
  );
}
