import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { playerKeys } from '../api/queryKeys';

export interface PlayerSummary {
  id: string;
  displayName: string;
  phone: string | null;
  preferredPosition: string | null;
}

export function usePlayerSearch(query: string) {
  return useQuery({
    queryKey: playerKeys.search(query),
    queryFn: () => apiClient.get<PlayerSummary[]>(`/players?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 0,
  });
}
