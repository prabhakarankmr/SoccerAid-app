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

// Projection — null until useStartMatch (kickoff) succeeds.
export interface MatchState {
  homeScore: number;
  awayScore: number;
  clockStartedAt: string | null;
  clockRunning: boolean;
}

// Scoped to what the live screen actually records (useRecordMatchEvent) — the backend's full
// MatchEventType enum has more values (PASS, CORNER…) that nothing creates yet, KICK_OFF aside.
export type MatchEventType = 'KICK_OFF' | 'GOAL' | 'SHOT_SAVED' | 'FOUL';

export interface MatchEvent {
  id: string;
  seq: number;
  type: MatchEventType;
  side: Side | null;
  playerId: string | null;
  assistPlayerId: string | null;
  matchClockSec: number;
  createdAt: string;
}

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
  state: MatchState | null;
  events: MatchEvent[];
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

export interface UpdateMatchInput {
  halfDurationSec?: number;
}

export function useUpdateMatch(matchId: string | undefined) {
  return useMutation({
    mutationFn: (input: UpdateMatchInput) =>
      apiClient.patch<MatchDetail>(`/matches/${matchId ?? ''}`, input),
  });
}

export function useStartMatch(matchId: string | undefined) {
  return useMutation({
    mutationFn: () => apiClient.post<MatchDetail>(`/matches/${matchId ?? ''}/start`),
  });
}

export interface RecordMatchEventInput {
  type: 'GOAL' | 'SHOT_SAVED' | 'FOUL';
  side: Side;
  playerId: string;
  assistPlayerId?: string;
  clientEventId: string;
}

export function useRecordMatchEvent(matchId: string | undefined) {
  return useMutation({
    mutationFn: (input: RecordMatchEventInput) =>
      apiClient.post<MatchDetail>(`/matches/${matchId ?? ''}/events`, input),
  });
}

// One per tap, not per retry — good enough for `MatchEvent`'s idempotency key (§4 backend docs)
// without needing a real UUID dependency: collision odds are irrelevant at human-tap rates.
export function makeClientEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
