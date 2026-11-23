import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { meKeys } from '../api/queryKeys';

export interface Me {
  id: string;
  phone: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  player: { id: string; displayName: string; preferredPosition: string | null } | null;
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: meKeys.me,
    queryFn: () => apiClient.get<Me>('/me'),
    enabled,
    // Whether the account can be confirmed decides app-vs-login (see app/(tabs)/_layout.tsx) —
    // the default 3x exponential-backoff retry would leave that decision (and the spinner) hanging
    // for ~7s on every failure, so fail fast instead.
    retry: false,
  });
}
