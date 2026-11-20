import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, setActiveWorkspace } from './api';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('api client', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    setActiveWorkspace(null);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends credentials, the CSRF token and the workspace header', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { csrfToken: 'tok-1' } })).mockResolvedValueOnce(json(200, { data: { ok: true } }));
    setActiveWorkspace('ws-123');
    await api.post('/api/things', { a: 1 });
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe('/api/things');
    expect(init?.credentials).toBe('include');
    const headers = init?.headers as Record<string, string>;
    expect(headers['x-csrf-token']).toBe('tok-1');
    expect(headers['x-workspace-id']).toBe('ws-123');
  });

  it('refreshes the CSRF token once and retries on CSRF_INVALID', async () => {
    fetchMock
      .mockResolvedValueOnce(json(403, { error: { code: 'CSRF_INVALID', message: 'expired' } }))
      .mockResolvedValueOnce(json(200, { data: { csrfToken: 'fresh' } }))
      .mockResolvedValueOnce(json(200, { data: { done: true } }));
    await expect(api.post('/api/x', {})).resolves.toEqual({ done: true });
    expect((fetchMock.mock.calls[2]![1]?.headers as Record<string, string>)['x-csrf-token']).toBe('fresh');
  });

  it('throws a typed ApiError with field details', async () => {
    fetchMock.mockResolvedValueOnce(json(400, { error: { code: 'VALIDATION_ERROR', message: 'Bad', details: [{ path: 'email', message: 'Invalid' }] } }));
    const err = await api.get('/api/y').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', details: [{ path: 'email', message: 'Invalid' }] });
  });

  it('omits the workspace header when asked', async () => {
    setActiveWorkspace('ws-1');
    fetchMock.mockResolvedValueOnce(json(200, { data: {} }));
    await api.get('/api/auth/me', { workspace: false });
    expect((fetchMock.mock.calls[0]![1]?.headers as Record<string, string>)['x-workspace-id']).toBeUndefined();
  });

  it('reports network failures clearly', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(api.get('/api/z')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
