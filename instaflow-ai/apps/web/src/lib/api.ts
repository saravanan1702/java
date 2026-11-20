import {
  CSRF_HEADER,
  WORKSPACE_HEADER,
  type ApiErrorBody,
  type ApiErrorDetail,
  type ApiSuccess,
  type ErrorCode,
} from '@instaflow/shared';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    public readonly details: ApiErrorDetail[] = [],
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * In-memory only: the CSRF token is never persisted (not in localStorage),
 * so an XSS-free page is the only place it can be read.
 */
let csrfToken: string | null = null;
let activeWorkspaceId: string | null = null;

export function setActiveWorkspace(id: string | null) {
  activeWorkspaceId = id;
}
export function getActiveWorkspace() {
  return activeWorkspaceId;
}

async function fetchCsrf(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/csrf`, { credentials: 'include' });
  const json = (await res.json()) as ApiSuccess<{ csrfToken: string }>;
  csrfToken = json.data.csrfToken;
  return csrfToken;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Attach X-Workspace-Id (default true). */
  workspace?: boolean;
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions, retried = false): Promise<ApiSuccess<T>> {
  const method = opts.method ?? 'GET';
  const unsafe = method !== 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (unsafe) headers[CSRF_HEADER] = csrfToken ?? (await fetchCsrf());
  if (opts.workspace !== false && activeWorkspaceId) headers[WORKSPACE_HEADER] = activeWorkspaceId;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return { data: undefined as T };
  const json = (await res.json().catch(() => null)) as (ApiSuccess<T> & ApiErrorBody) | null;

  if (!res.ok) {
    const err = json?.error;
    // The CSRF seed rotates on login/logout; refresh once and retry transparently.
    if (err?.code === 'CSRF_INVALID' && !retried) {
      await fetchCsrf();
      return request<T>(path, opts, true);
    }
    throw new ApiError(res.status, err?.code ?? 'INTERNAL_ERROR', err?.message ?? `Request failed (${res.status})`, err?.details, err?.requestId);
  }

  const maybeToken = (json?.data as { csrfToken?: unknown } | undefined)?.csrfToken;
  if (typeof maybeToken === 'string') csrfToken = maybeToken;
  return json as ApiSuccess<T>;
}

export const api = {
  get: <T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) => request<T>(path, opts).then((r) => r.data),
  getWithMeta: <T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) => request<T>(path, opts),
  post: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'POST', body: body ?? {} }).then((r) => r.data),
  patch: <T>(path: string, body: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'PATCH', body }).then((r) => r.data),
  delete: <T = void>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'DELETE', body }).then((r) => r.data),
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}
