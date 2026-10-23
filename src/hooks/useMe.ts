import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { meKeys } from '../api/queryKeys';

export interface Me {
  id: string;
  phone: string;
  name: string | null;
  avatarUrl: string | null;
  player: { id: string; displayName: string; preferredPosition: string | null } | null;
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: meKeys.me,
    queryFn: () => apiClient.get<Me>('/me'),
    enabled,
  });
}
