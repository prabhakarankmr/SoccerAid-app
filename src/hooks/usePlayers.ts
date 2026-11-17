import { useMutation, useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { playerKeys } from '../api/queryKeys';

export interface PlayerSummary {
  id: string;
  displayName: string;
  phone: string | null;
  preferredPosition: string | null;
}

export interface PlayerStats {
  playerId: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  saves: number;
  fouls: number;
}

export function usePlayerStats(playerId: string | undefined) {
  return useQuery({
    queryKey: playerKeys.stats(playerId ?? ''),
    queryFn: () => apiClient.get<PlayerStats>(`/players/${playerId ?? ''}/stats`),
    enabled: Boolean(playerId),
  });
}

/**
 * On-demand (not a `useQuery` — there's no sensible cache key for "whatever was last typed,"
 * and this is an exact lookup triggered by a button press, not a live-as-you-type search).
 * Finds a real app user by their exact phone or username via `GET /teams/lookup-member` —
 * not `GET /players?q=`, which does fuzzy name matching over Players generally, including
 * unclaimed ones (BACKEND_INSTRUCTIONS.md §7.2, §9.5).
 */
export function useMemberLookup() {
  return useMutation({
    mutationFn: (identifier: string) =>
      apiClient.get<PlayerSummary | null>(
        `/teams/lookup-member?identifier=${encodeURIComponent(identifier.trim())}`,
      ),
  });
}
