import { useMutation, useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { matchKeys } from '../api/queryKeys';

export interface MatchTeamRef {
  id: string;
  name: string;
  logoUrl: string | null;
}

export type Side = 'HOME' | 'AWAY';

export interface MatchLineupPlayer {
  playerId: string;
  side: Side;
  isStarter: boolean;
  isGoalkeeper: boolean;
  slotIndex: number | null;
}

export type MatchStatus =
  | 'SCHEDULED'
  | 'LINEUPS_SET'
  | 'LIVE'
  | 'PAUSED'
  | 'HALF_TIME'
  | 'FULL_TIME'
  | 'EXTRA_TIME'
  | 'PENALTIES'
  | 'COMPLETED'
  | 'ABANDONED';

export interface MatchDetail {
  id: string;
  homeTeam: MatchTeamRef;
  awayTeam: MatchTeamRef;
  playersPerSide: number;
  formationHome: string;
  formationAway: string;
  halfDurationSec: number;
  extraTimeSec: number | null;
  hasPenalties: boolean;
  status: MatchStatus;
  lineups: MatchLineupPlayer[];
}

export interface CreateMatchInput {
  homeTeamId: string;
  awayTeamId: string;
  playersPerSide: number;
  formationHome: string;
  formationAway: string;
  halfDurationSec: number;
  extraTimeSec?: number;
  hasPenalties?: boolean;
}

export function useCreateMatch() {
  return useMutation({
    mutationFn: (input: CreateMatchInput) => apiClient.post<MatchDetail>('/matches', input),
  });
}

export function useMatch(id: string | undefined) {
  return useQuery({
    queryKey: matchKeys.detail(id ?? ''),
    queryFn: () => apiClient.get<MatchDetail>(`/matches/${id ?? ''}`),
    enabled: Boolean(id),
  });
}

export interface LineupPlayerInput {
  playerId: string;
  isStarter: boolean;
  isGoalkeeper: boolean;
}

export interface SetLineupsInput {
  home: LineupPlayerInput[];
  away: LineupPlayerInput[];
}

export function useSetLineups(matchId: string | undefined) {
  return useMutation({
    mutationFn: (input: SetLineupsInput) =>
      apiClient.put<MatchDetail>(`/matches/${matchId ?? ''}/lineups`, input),
  });
}
