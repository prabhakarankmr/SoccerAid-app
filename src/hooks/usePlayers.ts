import { useMutation } from '@tanstack/react-query';

import { apiClient } from '../api/client';

export interface PlayerSummary {
  id: string;
  displayName: string;
  phone: string | null;
  preferredPosition: string | null;
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
