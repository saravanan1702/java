import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthResultDto, MeDto } from '@instaflow/shared';
import { ApiError, api, setActiveWorkspace } from '@/lib/api';

export const ME_KEY = ['me'] as const;

/** The signed-in user + workspace memberships, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async (): Promise<MeDto | null> => {
      try {
        return await api.get<MeDto>('/api/auth/me', { workspace: false });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
  });
}

/** After login/register, seed the cache with the returned profile. */
export function useAcceptSession() {
  const qc = useQueryClient();
  return (result: AuthResultDto) => {
    const { csrfToken: _ignored, ...me } = result;
    qc.setQueryData<MeDto | null>(ME_KEY, me);
  };
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/api/auth/logout', {}, { workspace: false }),
    onSettled: () => {
      setActiveWorkspace(null);
      qc.clear();
      qc.setQueryData(ME_KEY, null);
    },
  });
}
