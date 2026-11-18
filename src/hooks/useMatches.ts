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

// Which half the match is currently in, independent of Side.HOME/AWAY — mirrors the backend's
// MatchPeriod (matches.repository.ts, §4).
export type MatchPeriod = 'FIRST_HALF' | 'HALF_TIME' | 'SECOND_HALF' | 'FULL_TIME';

// Projection — null until useStartMatch (kickoff) succeeds.
export interface MatchState {
  homeScore: number;
  awayScore: number;
  clockStartedAt: string | null;
  clockRunning: boolean;
  // Banked seconds for the CURRENT period — the live display value while running is
  // `elapsedSec + (now - clockStartedAt)`; while paused/between halves, elapsedSec alone.
  elapsedSec: number;
  period: MatchPeriod;
  // Stoppage time (seconds) added to the CURRENT half — the half's effective limit is
  // `halfDurationSec + addedTimeSec`.
  addedTimeSec: number;
}

// Scoped to what the live screen actually records/triggers — the backend's full MatchEventType
// enum has more values (PASS, CORNER…) that nothing creates yet.
export type MatchEventType =
  | 'KICK_OFF'
  | 'GOAL'
  | 'SHOT_SAVED'
  | 'FOUL'
  | 'PAUSE'
  | 'RESUME'
  | 'ADD_TIME'
  | 'HALF_TIME'
  | 'SECOND_HALF_START'
  | 'FULL_TIME';

export interface MatchEvent {
  id: string;
  seq: number;
  type: MatchEventType;
  side: Side | null;
  playerId: string | null;
  assistPlayerId: string | null;
  addedSeconds: number | null;
  matchClockSec: number;
  period: MatchPeriod | null;
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
  // Whether the signed-in user owns either team — false means a viewer: matches are publicly
  // spectatable (anyone can GET one), but only an owner gets scoring controls on the live screen.
  canScore: boolean;
}

// Lightweight — backs the "Matches" tab's list (any live match, from any user). No
// lineups/events/canScore; just enough for a card.
export interface MatchSummary {
  id: string;
  homeTeam: MatchTeamRef;
  awayTeam: MatchTeamRef;
  playersPerSide: number;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
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

// Public discovery list for the "Matches" tab (§5.8) — Live/Ended segments; any authenticated
// user, not scoped to their own teams. Only the Live segment polls — a FULL_TIME match's score
// doesn't change, so there's nothing for an Ended-segment refetch to pick up.
export function useMatchesList(status: MatchStatus) {
  return useQuery({
    queryKey: matchKeys.list(status),
    queryFn: () => apiClient.get<MatchSummary[]>(`/matches?status=${status}`),
    refetchInterval: status === 'LIVE' ? 15_000 : false,
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

export function usePauseMatch(matchId: string | undefined) {
  return useMutation({
    mutationFn: () => apiClient.post<MatchDetail>(`/matches/${matchId ?? ''}/pause`),
  });
}

export function useResumeMatch(matchId: string | undefined) {
  return useMutation({
    mutationFn: () => apiClient.post<MatchDetail>(`/matches/${matchId ?? ''}/resume`),
  });
}

export function useAddTime(matchId: string | undefined) {
  return useMutation({
    mutationFn: (seconds: number) =>
      apiClient.post<MatchDetail>(`/matches/${matchId ?? ''}/add-time`, { seconds }),
  });
}

export function useEndFirstHalf(matchId: string | undefined) {
  return useMutation({
    mutationFn: () => apiClient.post<MatchDetail>(`/matches/${matchId ?? ''}/half-time`),
  });
}

export function useStartSecondHalf(matchId: string | undefined) {
  return useMutation({
    mutationFn: () => apiClient.post<MatchDetail>(`/matches/${matchId ?? ''}/second-half`),
  });
}

export function useEndMatch(matchId: string | undefined) {
  return useMutation({
    mutationFn: () => apiClient.post<MatchDetail>(`/matches/${matchId ?? ''}/end`),
  });
}

// One per tap, not per retry — good enough for `MatchEvent`'s idempotency key (§4 backend docs)
// without needing a real UUID dependency: collision odds are irrelevant at human-tap rates.
export function makeClientEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
