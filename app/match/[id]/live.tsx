import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Clock from 'lucide-react-native/icons/clock';
import Eye from 'lucide-react-native/icons/eye';
import Flag from 'lucide-react-native/icons/flag';
import GoalIcon from 'lucide-react-native/icons/goal';
import Hand from 'lucide-react-native/icons/hand';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import Plus from 'lucide-react-native/icons/plus';
import SkipForward from 'lucide-react-native/icons/skip-forward';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { ApiError } from '../../../src/api/client';
import { matchKeys } from '../../../src/api/queryKeys';
import { FootballPitch, PitchSlot } from '../../../src/components/pitch/FootballPitch';
import { slotsFor, useFormations } from '../../../src/hooks/useMeta';
import {
  MatchDetail,
  MatchEvent,
  MatchPeriod,
  Side,
  makeClientEventId,
  useAddTime,
  useEndFirstHalf,
  useEndMatch,
  useMatch,
  usePauseMatch,
  useRecordMatchEvent,
  useResumeMatch,
  useStartMatch,
  useStartSecondHalf,
} from '../../../src/hooks/useMatches';
import { TeamDetail, useTeam } from '../../../src/hooks/useTeams';

interface StarterOption {
  side: Side;
  playerId: string;
  displayName: string;
  isGoalkeeper: boolean;
}

type ActiveModal =
  | { kind: 'goal-scorer' }
  | { kind: 'goal-assist'; side: Side; scorerId: string; scorerName: string }
  | { kind: 'save' }
  | { kind: 'foul' }
  | { kind: 'end-match' }
  | null;

const ADD_TIME_PRESETS_MIN = [1, 2, 5];

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function periodLabel(period: MatchPeriod | null | undefined): string {
  switch (period) {
    case 'FIRST_HALF':
      return '1st Half';
    case 'HALF_TIME':
      return 'Half Time';
    case 'SECOND_HALF':
      return '2nd Half';
    case 'FULL_TIME':
      return 'Full Time';
    default:
      return '';
  }
}

// Mirrors matches.repository.ts's computeElapsedSec exactly — banked `elapsedSec` plus however
// long the clock has been running since `clockStartedAt`, or just the banked value while
// paused/between halves. `nowMs` is only ever read from state (never Date.now() during render).
function computeElapsedSec(
  state: { clockRunning: boolean; clockStartedAt: string | null; elapsedSec: number },
  nowMs: number | null,
): number {
  if (!state.clockRunning || !state.clockStartedAt || !nowMs) {
    return state.elapsedSec;
  }

  return (
    state.elapsedSec +
    Math.max(0, Math.floor((nowMs - new Date(state.clockStartedAt).getTime()) / 1000))
  );
}

function buildStarters(
  lineups: { playerId: string; side: Side; isStarter: boolean; isGoalkeeper: boolean }[],
  homeTeam: TeamDetail,
  awayTeam: TeamDetail,
): StarterOption[] {
  const nameById = new Map<string, string>();

  for (const player of [...homeTeam.players, ...awayTeam.players]) {
    nameById.set(player.id, player.displayName);
  }

  return lineups
    .filter((lineup) => lineup.isStarter)
    .map((lineup) => ({
      side: lineup.side,
      playerId: lineup.playerId,
      displayName: nameById.get(lineup.playerId) ?? 'Unknown Player',
      isGoalkeeper: lineup.isGoalkeeper,
    }));
}

function describeEvent(
  event: MatchEvent,
  nameOf: (id: string | null) => string,
  teamNameFor: (side: Side | null) => string,
): string {
  switch (event.type) {
    case 'KICK_OFF':
      return event.side ? `Kick-off! ${teamNameFor(event.side)} get us underway.` : 'Kick-off!';
    case 'GOAL': {
      const assist = event.assistPlayerId ? ` (assist: ${nameOf(event.assistPlayerId)})` : '';
      return `GOAL! ${nameOf(event.playerId)} scores for ${teamNameFor(event.side)}${assist}`;
    }
    case 'SHOT_SAVED':
      return `${nameOf(event.playerId)} (${teamNameFor(event.side)}) makes a save`;
    case 'FOUL':
      return `Foul by ${nameOf(event.playerId)} (${teamNameFor(event.side)})`;
    case 'PAUSE':
      return 'Match paused';
    case 'RESUME':
      return 'Match resumed';
    case 'ADD_TIME':
      return `${String(Math.round((event.addedSeconds ?? 0) / 60))} min added`;
    case 'HALF_TIME':
      return 'Half-time!';
    case 'SECOND_HALF_START':
      return event.side
        ? `Second half under way — ${teamNameFor(event.side)} kick off.`
        : 'Second half under way!';
    case 'FULL_TIME':
      return 'Full-time!';
    default:
      return event.type;
  }
}

interface PlayerPickerModalProps {
  visible: boolean;
  title: string;
  options: StarterOption[];
  teamNameFor: (side: Side) => string;
  extraAction?: { label: string; onPress: () => void };
  onSelect: (option: StarterOption) => void;
  onCancel: () => void;
  disabled: boolean;
}

function PlayerPickerModal({
  visible,
  title,
  options,
  teamNameFor,
  extraAction,
  onSelect,
  onCancel,
  disabled,
}: PlayerPickerModalProps) {
  const sides: Side[] = ['HOME', 'AWAY'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        accessibilityLabel="Close"
        accessibilityHint="Closes this without recording anything"
        className="flex-1 justify-end bg-black/50"
      >
        <Pressable
          onPress={() => {}}
          accessible={false}
          className="max-h-[75%] rounded-t-2xl bg-white px-5 pb-8 pt-5"
        >
          <Text className="text-lg font-bold text-black">{title}</Text>
          <ScrollView className="mt-3">
            {sides.map((side) => {
              const sideOptions = options.filter((option) => option.side === side);

              if (sideOptions.length === 0) {
                return null;
              }

              return (
                <View key={side} className="mb-3">
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                    {teamNameFor(side)}
                  </Text>
                  {sideOptions.map((option) => (
                    <Pressable
                      key={option.playerId}
                      onPress={() => onSelect(option)}
                      disabled={disabled}
                      accessibilityLabel={option.displayName}
                      accessibilityHint="Selects this player"
                      className="mb-2 rounded-lg border border-gray-300 px-3 py-2.5"
                    >
                      <Text className="text-sm font-bold text-black">
                        {option.displayName}
                        {option.isGoalkeeper ? ' (GK)' : ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </ScrollView>
          {extraAction ? (
            <Pressable
              onPress={extraAction.onPress}
              disabled={disabled}
              accessibilityLabel={extraAction.label}
              accessibilityHint="Records this without an assist"
              className="mt-1 items-center rounded-lg border border-gray-300 py-3"
            >
              <Text className="text-sm font-bold text-black">{extraAction.label}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onCancel}
            accessibilityLabel="Cancel"
            accessibilityHint="Closes this without recording anything"
            className="mt-2 items-center py-2"
          >
            <Text className="text-sm font-bold text-gray-500">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  disabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// RN's Alert.alert doesn't work on web (react-native-web has no implementation) — this app
// exports to web, so a confirmation for a destructive action has to be a real component, not
// a native alert.
function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  disabled,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        accessibilityLabel="Close"
        accessibilityHint="Closes this without doing anything"
        className="flex-1 items-center justify-center bg-black/50 px-6"
      >
        <Pressable
          onPress={() => {}}
          accessible={false}
          className="w-full max-w-sm rounded-2xl bg-white p-5"
        >
          <Text className="text-lg font-bold text-black">{title}</Text>
          <Text className="mt-2 text-sm text-gray-600">{message}</Text>
          <View className="mt-5 flex-row gap-2">
            <Pressable
              onPress={onCancel}
              accessibilityLabel="Cancel"
              accessibilityHint="Closes this without doing anything"
              className="flex-1 items-center rounded-lg border border-gray-300 py-3"
            >
              <Text className="text-sm font-bold text-black">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={disabled}
              accessibilityLabel={confirmLabel}
              accessibilityHint="This cannot be undone"
              className="flex-1 items-center rounded-lg bg-red-600 py-3"
            >
              <Text className="text-sm font-bold text-white">{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function MatchLive() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: match, isLoading: isMatchLoading, error } = useMatch(id);
  const { data: homeTeam } = useTeam(match?.homeTeam.id);
  const { data: awayTeam } = useTeam(match?.awayTeam.id);
  const formationsQuery = useFormations(match?.playersPerSide);

  const startMatch = useStartMatch(id);
  const pauseMatch = usePauseMatch(id);
  const resumeMatch = useResumeMatch(id);
  const addTime = useAddTime(id);
  const endFirstHalf = useEndFirstHalf(id);
  const startSecondHalf = useStartSecondHalf(id);
  const endMatch = useEndMatch(id);
  const recordEvent = useRecordMatchEvent(id);

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  // `Date.now()` is only ever read inside the effect below, never during render — the match's
  // clock is server-authoritative (`state.clockStartedAt`), this is purely a display tick.
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!match?.state?.clockRunning) {
      return;
    }

    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [match?.state?.clockRunning, match?.state?.clockStartedAt]);

  function applyUpdate(updated: MatchDetail) {
    queryClient.setQueryData(matchKeys.detail(id ?? ''), updated);
  }

  if (isMatchLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#000000" />
      </View>
    );
  }

  if (!match) {
    const notFound = error instanceof ApiError && error.code === 'NOT_FOUND';

    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-black">
          {notFound ? 'Match not found.' : 'Could not load this match — try again.'}
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          accessibilityLabel="Go to Home"
          accessibilityHint="Returns to the home screen"
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2"
        >
          <Text className="font-bold text-black">Go to Home</Text>
        </Pressable>
      </View>
    );
  }

  const canEndMatch =
    match.canScore &&
    (match.status === 'LIVE' || match.status === 'PAUSED' || match.status === 'HALF_TIME');
  // Once the match is over there's nothing left to set up — "back" should leave the match flow
  // entirely rather than loop through a setup screen for a match that's already finished.
  const isEnded = match.status === 'FULL_TIME';

  const header = (
    <View className="flex-row items-center justify-between border-b border-gray-200 px-4 pb-3 pt-14">
      <Pressable
        onPress={() => {
          if (isEnded) {
            // Wherever they actually came from — the Matches tab's Ended list, Setup after
            // ending it themselves, a notification, etc. — rather than always landing on
            // Dashboard regardless of entry point. Falls back to Dashboard only if there's
            // nowhere to go back to (e.g. a direct deep link straight into this match).
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          } else {
            router.push({ pathname: '/match/[id]/lineup', params: { id: match.id } });
          }
        }}
        accessibilityLabel={isEnded ? 'Back' : 'Back to Setup'}
        accessibilityHint={
          isEnded
            ? 'Returns to the previous screen'
            : "Returns to player setup — the match keeps running, this doesn't pause or end it"
        }
        className="flex-row items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5"
      >
        <ArrowLeft color="#000000" size={16} />
        <Text className="text-xs font-bold text-black">{isEnded ? 'Back' : 'Setup'}</Text>
      </Pressable>
      <Text className="text-sm font-bold uppercase tracking-wide text-gray-500">
        {isEnded ? 'Match Ended' : 'Live Match'}
      </Text>
      {canEndMatch ? (
        <Pressable
          onPress={() => setActiveModal({ kind: 'end-match' })}
          accessibilityLabel="End Match"
          accessibilityHint="Ends the match now, at any point — this cannot be undone"
          className="rounded-full border border-gray-300 px-3 py-1.5"
        >
          <Text className="text-xs font-bold text-red-700">End</Text>
        </Pressable>
      ) : (
        <View style={{ width: 86 }} />
      )}
    </View>
  );

  const endMatchModal = (
    <ConfirmModal
      visible={activeModal?.kind === 'end-match'}
      title="End Match?"
      message="This ends the match right now, whatever time is showing. This cannot be undone."
      confirmLabel="End Match"
      disabled={endMatch.isPending}
      onCancel={() => setActiveModal(null)}
      onConfirm={() => {
        endMatch.mutate(undefined, {
          onSuccess: (updated) => {
            applyUpdate(updated);
            setActiveModal(null);
          },
          onError: (endError) => {
            console.error('POST /matches/:id/end failed:', endError);
          },
        });
      }}
    />
  );

  if (match.status === 'LINEUPS_SET') {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-lg font-bold text-black">
            {match.homeTeam.name} vs {match.awayTeam.name}
          </Text>
          <Text className="mt-1 text-center text-black">
            {match.canScore ? 'Ready when you are.' : 'Waiting for the match to kick off.'}
          </Text>
          {match.canScore ? (
            <>
              <Text className="mt-6 text-sm font-bold uppercase tracking-wide text-gray-500">
                Who kicks off?
              </Text>
              {startMatch.isError ? (
                <Text className="mt-2 text-center text-xs text-red-700">
                  Could not start the match — try again
                </Text>
              ) : null}
              <View className="mt-3 w-full flex-row gap-2">
                {[
                  { side: 'HOME' as const, label: match.homeTeam.name },
                  { side: 'AWAY' as const, label: match.awayTeam.name },
                ].map((team) => (
                  <Pressable
                    key={team.side}
                    onPress={() => {
                      startMatch.mutate(team.side, {
                        onSuccess: applyUpdate,
                        onError: (startError) => {
                          console.error('POST /matches/:id/start failed:', startError);
                        },
                      });
                    }}
                    disabled={startMatch.isPending}
                    accessibilityLabel={`${team.label} kicks off`}
                    accessibilityHint="Starts the match clock now, with this team kicking off"
                    className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-black py-4"
                  >
                    {startMatch.isPending ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Play color="#ffffff" size={16} />
                        <Text className="text-sm font-bold text-white" numberOfLines={1}>
                          {team.label}
                        </Text>
                      </>
                    )}
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </View>
    );
  }

  if (!homeTeam || !awayTeam || !formationsQuery.data) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#000000" />
        </View>
      </View>
    );
  }

  const nameById = new Map<string, string>();

  for (const player of [...homeTeam.players, ...awayTeam.players]) {
    nameById.set(player.id, player.displayName);
  }

  function nameOf(playerId: string | null): string {
    if (!playerId) {
      return 'Unknown Player';
    }

    return nameById.get(playerId) ?? 'Unknown Player';
  }

  const homeTeamName = match.homeTeam.name;
  const awayTeamName = match.awayTeam.name;

  function teamNameFor(side: Side | null): string {
    if (side === 'HOME') {
      return homeTeamName;
    }

    if (side === 'AWAY') {
      return awayTeamName;
    }

    return '';
  }

  const starters = buildStarters(match.lineups, homeTeam, awayTeam);
  const goalkeepers = starters.filter((option) => option.isGoalkeeper);

  const homeFormationSlots = slotsFor(formationsQuery.data, match.formationHome);
  const awayFormationSlots = slotsFor(formationsQuery.data, match.formationAway);

  const homePitchSlots: PitchSlot[] = homeFormationSlots.map((slot) => {
    const lineup = match.lineups.find(
      (entry) => entry.side === 'HOME' && entry.slotIndex === slot.slotIndex,
    );
    return {
      slotIndex: slot.slotIndex,
      isGoalkeeper: slot.isGoalkeeper,
      posX: slot.posX,
      posY: slot.posY,
      player: lineup ? { id: lineup.playerId, displayName: nameOf(lineup.playerId) } : null,
    };
  });

  const awayPitchSlots: PitchSlot[] = awayFormationSlots.map((slot) => {
    const lineup = match.lineups.find(
      (entry) => entry.side === 'AWAY' && entry.slotIndex === slot.slotIndex,
    );
    return {
      slotIndex: slot.slotIndex,
      isGoalkeeper: slot.isGoalkeeper,
      posX: slot.posX,
      posY: slot.posY,
      player: lineup ? { id: lineup.playerId, displayName: nameOf(lineup.playerId) } : null,
    };
  });

  const scoreboard = (
    <View className="flex-row items-center justify-around">
      <Text className="flex-1 text-center text-base font-bold text-black" numberOfLines={1}>
        {match.homeTeam.name}
      </Text>
      <View className="flex-row items-center gap-3 px-3">
        <Text className="text-4xl font-bold text-black">{match.state?.homeScore ?? 0}</Text>
        <Text className="text-2xl font-bold text-gray-400">-</Text>
        <Text className="text-4xl font-bold text-black">{match.state?.awayScore ?? 0}</Text>
      </View>
      <Text className="flex-1 text-center text-base font-bold text-black" numberOfLines={1}>
        {match.awayTeam.name}
      </Text>
    </View>
  );

  const commentary = (
    <View className="mt-6">
      <Text className="text-base font-bold text-black">Commentary</Text>
      {match.events.length === 0 ? (
        <Text className="mt-2 text-sm text-gray-500">No action yet.</Text>
      ) : (
        [...match.events].reverse().map((event) => (
          <View
            key={event.id}
            className="mt-2 flex-row items-start gap-2 border-b border-gray-100 pb-2"
          >
            <Text className="font-mono text-xs font-bold text-gray-500">
              {periodLabel(event.period) || '—'} {formatClock(event.matchClockSec)}
            </Text>
            <Text className="flex-1 text-sm text-black">
              {describeEvent(event, nameOf, teamNameFor)}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  if (match.status === 'HALF_TIME') {
    return (
      <View className="flex-1 bg-white">
        {header}
        <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 pb-16 pt-4">
          {scoreboard}
          <Text className="mt-2 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
            Half Time
          </Text>
          {match.canScore ? (
            <>
              {startSecondHalf.isError ? (
                <Text className="mt-2 text-center text-xs text-red-700">
                  Could not start the second half — try again
                </Text>
              ) : null}
              <Pressable
                onPress={() => {
                  startSecondHalf.mutate(undefined, {
                    onSuccess: applyUpdate,
                    onError: (startError) => {
                      console.error('POST /matches/:id/second-half failed:', startError);
                    },
                  });
                }}
                disabled={startSecondHalf.isPending}
                accessibilityLabel="Kick Off Second Half"
                accessibilityHint="Starts the second half's clock now"
                className="mx-auto mt-4 flex-row items-center gap-2 rounded-lg bg-black px-8 py-4"
              >
                {startSecondHalf.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Play color="#ffffff" size={18} />
                    <Text className="text-base font-bold text-white">Kick Off 2nd Half</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : null}
          {commentary}
        </ScrollView>
        {endMatchModal}
      </View>
    );
  }

  if (match.status === 'FULL_TIME') {
    return (
      <View className="flex-1 bg-white">
        {header}
        <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 pb-16 pt-4">
          {scoreboard}
          <Text className="mt-2 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
            Full Time — Match Ended
          </Text>
          {commentary}
        </ScrollView>
      </View>
    );
  }

  if (match.status !== 'LIVE' && match.status !== 'PAUSED') {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#000000" />
        </View>
      </View>
    );
  }

  const state = match.state;

  if (!state) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#000000" />
        </View>
      </View>
    );
  }

  const elapsedSec = computeElapsedSec(state, nowMs);
  const halfLimitSec = match.halfDurationSec + state.addedTimeSec;
  const timeUp = elapsedSec >= halfLimitSec;
  const isPaused = match.status === 'PAUSED';

  function submitEvent(
    type: 'GOAL' | 'SHOT_SAVED' | 'FOUL',
    side: Side,
    playerId: string,
    assistPlayerId?: string,
  ) {
    recordEvent.mutate(
      { type, side, playerId, assistPlayerId, clientEventId: makeClientEventId() },
      {
        onSuccess: (updated) => {
          applyUpdate(updated);
          setActiveModal(null);
        },
        onError: (recordError) => {
          console.error('POST /matches/:id/events failed:', recordError);
        },
      },
    );
  }

  return (
    <View className="flex-1 bg-white">
      {header}

      <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 pb-16 pt-4">
        {scoreboard}

        <View className="mt-2 flex-row items-center justify-center gap-1.5">
          <Clock color="#000000" size={16} />
          <Text className="font-mono text-lg font-bold text-black">{formatClock(elapsedSec)}</Text>
          <Text className="font-mono text-sm text-gray-500">/ {formatClock(halfLimitSec)}</Text>
          <Text className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {periodLabel(state.period)}
          </Text>
        </View>
        {state.addedTimeSec > 0 ? (
          <Text className="mt-0.5 text-center text-xs text-gray-500">
            +{Math.round(state.addedTimeSec / 60)} min added
          </Text>
        ) : null}
        {match.canScore ? (
          <>
            {timeUp ? (
              <Text className="mt-1 text-center text-sm font-bold text-red-700">
                Time&apos;s up — end{' '}
                {state.period === 'FIRST_HALF' ? 'the first half' : 'the match'} when ready
              </Text>
            ) : null}

            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => {
                  const mutation = isPaused ? resumeMatch : pauseMatch;
                  mutation.mutate(undefined, {
                    onSuccess: applyUpdate,
                    onError: (toggleError) => {
                      console.error('Pause/resume failed:', toggleError);
                    },
                  });
                }}
                disabled={pauseMatch.isPending || resumeMatch.isPending}
                accessibilityLabel={isPaused ? 'Resume' : 'Pause'}
                accessibilityHint={isPaused ? 'Resumes the clock' : 'Pauses the clock'}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-2.5"
              >
                {isPaused ? (
                  <Play color="#000000" size={16} />
                ) : (
                  <Pause color="#000000" size={16} />
                )}
                <Text className="text-xs font-bold text-black">
                  {isPaused ? 'Resume' : 'Pause'}
                </Text>
              </Pressable>
              {state.period === 'FIRST_HALF' ? (
                <Pressable
                  onPress={() => {
                    endFirstHalf.mutate(undefined, {
                      onSuccess: applyUpdate,
                      onError: (htError) => {
                        console.error('POST /matches/:id/half-time failed:', htError);
                      },
                    });
                  }}
                  disabled={endFirstHalf.isPending}
                  accessibilityLabel="End First Half"
                  accessibilityHint="Ends the first half and moves to half-time"
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2.5 ${
                    timeUp ? 'bg-black' : 'border border-gray-300'
                  }`}
                >
                  <SkipForward color={timeUp ? '#ffffff' : '#000000'} size={16} />
                  <Text className={`text-xs font-bold ${timeUp ? 'text-white' : 'text-black'}`}>
                    End 1st Half
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View className="mt-2 flex-row flex-wrap gap-2">
              {ADD_TIME_PRESETS_MIN.map((minutes) => (
                <Pressable
                  key={minutes}
                  onPress={() => {
                    addTime.mutate(minutes * 60, {
                      onSuccess: applyUpdate,
                      onError: (addTimeError) => {
                        console.error('POST /matches/:id/add-time failed:', addTimeError);
                      },
                    });
                  }}
                  disabled={addTime.isPending}
                  accessibilityLabel={`Add ${String(minutes)} minute${minutes > 1 ? 's' : ''}`}
                  accessibilityHint="Adds stoppage time to this half"
                  className="flex-row items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5"
                >
                  <Plus color="#000000" size={12} />
                  <Text className="text-xs font-bold text-black">{minutes} min</Text>
                </Pressable>
              ))}
            </View>

            {pauseMatch.isError ||
            resumeMatch.isError ||
            endFirstHalf.isError ||
            addTime.isError ? (
              <Text className="mt-2 text-center text-xs text-red-700">
                Could not do that — try again
              </Text>
            ) : null}

            {recordEvent.isError ? (
              <Text className="mt-2 text-center text-xs text-red-700">
                Could not record that — try again
              </Text>
            ) : null}
          </>
        ) : (
          <View className="mt-3 flex-row items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-2.5">
            <Eye color="#6b7280" size={16} />
            <Text className="text-xs font-bold text-gray-500">
              Spectating — you&apos;re viewing this match
            </Text>
          </View>
        )}

        <View className="mt-4">
          <FootballPitch
            homeLabel={match.homeTeam.name}
            awayLabel={match.awayTeam.name}
            homeSlots={homePitchSlots}
            awaySlots={awayPitchSlots}
            interactive={false}
          />
        </View>

        {match.canScore ? (
          <>
            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => setActiveModal({ kind: 'goal-scorer' })}
                disabled={recordEvent.isPending || isPaused}
                accessibilityLabel="Record a goal"
                accessibilityHint="Opens options to pick who scored and who assisted"
                className={`flex-1 items-center rounded-lg py-3 ${isPaused ? 'bg-gray-300' : 'bg-black'}`}
              >
                <GoalIcon color="#ffffff" size={18} />
                <Text className="mt-1 text-xs font-bold text-white">Goal</Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveModal({ kind: 'save' })}
                disabled={recordEvent.isPending || isPaused}
                accessibilityLabel="Record a goalkeeper save"
                accessibilityHint="Opens options to pick which goalkeeper made the save"
                className="flex-1 items-center rounded-lg border border-gray-300 py-3"
              >
                <Hand color="#000000" size={18} />
                <Text className="mt-1 text-xs font-bold text-black">Save</Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveModal({ kind: 'foul' })}
                disabled={recordEvent.isPending || isPaused}
                accessibilityLabel="Record a foul"
                accessibilityHint="Opens options to pick who committed the foul, from either team"
                className="flex-1 items-center rounded-lg border border-gray-300 py-3"
              >
                <Flag color="#000000" size={18} />
                <Text className="mt-1 text-xs font-bold text-black">Foul</Text>
              </Pressable>
            </View>
            {isPaused ? (
              <Text className="mt-2 text-center text-xs text-gray-500">
                Paused — resume to record goals, saves or fouls
              </Text>
            ) : null}
          </>
        ) : null}

        {commentary}
      </ScrollView>

      <PlayerPickerModal
        visible={activeModal?.kind === 'goal-scorer'}
        title="Who scored?"
        options={starters}
        teamNameFor={teamNameFor}
        disabled={recordEvent.isPending}
        onCancel={() => setActiveModal(null)}
        onSelect={(option) =>
          setActiveModal({
            kind: 'goal-assist',
            side: option.side,
            scorerId: option.playerId,
            scorerName: option.displayName,
          })
        }
      />

      <PlayerPickerModal
        visible={activeModal?.kind === 'goal-assist'}
        title={activeModal?.kind === 'goal-assist' ? `Who assisted ${activeModal.scorerName}?` : ''}
        options={
          activeModal?.kind === 'goal-assist'
            ? starters.filter(
                (option) =>
                  option.side === activeModal.side && option.playerId !== activeModal.scorerId,
              )
            : []
        }
        teamNameFor={teamNameFor}
        disabled={recordEvent.isPending}
        onCancel={() => setActiveModal(null)}
        extraAction={
          activeModal?.kind === 'goal-assist'
            ? {
                label: 'No Assist',
                onPress: () => submitEvent('GOAL', activeModal.side, activeModal.scorerId),
              }
            : undefined
        }
        onSelect={(option) => {
          if (activeModal?.kind === 'goal-assist') {
            submitEvent('GOAL', activeModal.side, activeModal.scorerId, option.playerId);
          }
        }}
      />

      <PlayerPickerModal
        visible={activeModal?.kind === 'save'}
        title="Who made the save?"
        options={goalkeepers}
        teamNameFor={teamNameFor}
        disabled={recordEvent.isPending}
        onCancel={() => setActiveModal(null)}
        onSelect={(option) => submitEvent('SHOT_SAVED', option.side, option.playerId)}
      />

      <PlayerPickerModal
        visible={activeModal?.kind === 'foul'}
        title="Who committed the foul?"
        options={starters}
        teamNameFor={teamNameFor}
        disabled={recordEvent.isPending}
        onCancel={() => setActiveModal(null)}
        onSelect={(option) => submitEvent('FOUL', option.side, option.playerId)}
      />

      {endMatchModal}
    </View>
  );
}
