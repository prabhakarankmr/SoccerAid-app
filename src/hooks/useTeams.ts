import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { teamKeys } from '../api/queryKeys';

export interface TeamSummary {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  contactNumber: string | null;
  place: string | null;
  captain: { id: string; displayName: string } | null;
  // So the UI can hide owner-only actions (edit captain, add/remove player) instead of
  // showing a control that would just 403 — the backend still enforces ownership regardless.
  ownerId: string;
}

export interface TeamRosterPlayer {
  id: string;
  displayName: string;
  isCaptain: boolean;
  // Added as a name-only guest (no SoccerAid account) rather than found via MemberLookup.
  isGuest: boolean;
}

// GET /teams/:id only — list endpoints (owned/opponents) return TeamSummary, not this; the
// backend only over-fetches the full roster for the detail view (BACKEND_INSTRUCTIONS.md §7.2).
export interface TeamDetail extends TeamSummary {
  players: TeamRosterPlayer[];
}

function searchPath(base: string, query: string): string {
  return query ? `${base}?q=${encodeURIComponent(query)}` : base;
}

export function useOwnedTeams(query: string) {
  return useQuery({
    queryKey: teamKeys.owned(query),
    queryFn: () => apiClient.get<TeamSummary[]>(searchPath('/teams', query)),
  });
}

export function useOpponentTeams(query: string) {
  return useQuery({
    queryKey: teamKeys.opponents(query),
    queryFn: () => apiClient.get<TeamSummary[]>(searchPath('/teams/opponents', query)),
  });
}

export function useTeam(id: string | undefined) {
  return useQuery({
    queryKey: teamKeys.detail(id ?? ''),
    queryFn: () => apiClient.get<TeamDetail>(`/teams/${id ?? ''}`),
    enabled: Boolean(id),
  });
}
