import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Play from 'lucide-react-native/icons/play';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ApiError } from '../../../src/api/client';
import { matchKeys } from '../../../src/api/queryKeys';
import { EndMatchConfirmSheet } from '../../../src/components/match/EndMatchConfirmSheet';
import { GoalFlowSheet, StarterOption } from '../../../src/components/match/GoalFlowSheet';
import { MatchActionBar } from '../../../src/components/match/MatchActionBar';
import { MatchControls } from '../../../src/components/match/MatchControls';
import { PlayerEventSheet } from '../../../src/components/match/PlayerEventSheet';
import { PreMatchKickoffView } from '../../../src/components/match/PreMatchKickoffView';
import { Scoreboard } from '../../../src/components/match/Scoreboard';
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

type ActiveModal =
  { kind: 'goal' } | { kind: 'save' } | { kind: 'foul' } | { kind: 'end-match' } | null;

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
    <EndMatchConfirmSheet
      visible={activeModal?.kind === 'end-match'}
      disabled={endMatch.isPending}
      homeTeamName={match.homeTeam.name}
      awayTeamName={match.awayTeam.name}
      homeScore={match.state?.homeScore ?? 0}
      awayScore={match.state?.awayScore ?? 0}
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
      <PreMatchKickoffView
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        playersPerSide={match.playersPerSide}
        canScore={match.canScore}
        isStarting={startMatch.isPending}
        isError={startMatch.isError}
        onStartMatch={(side) => {
          startMatch.mutate(side, {
            onSuccess: applyUpdate,
            onError: (startError) => {
              console.error('POST /matches/:id/start failed:', startError);
            },
          });
        }}
        onBack={() => {
          router.push({ pathname: '/match/[id]/lineup', params: { id: match.id } });
        }}
      />
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
    <Scoreboard
      homeTeamName={match.homeTeam.name}
      awayTeamName={match.awayTeam.name}
      homeScore={match.state?.homeScore ?? 0}
      awayScore={match.state?.awayScore ?? 0}
      homeLogoUrl={homeTeam?.logoUrl}
      awayLogoUrl={awayTeam?.logoUrl}
      period={match.state?.period ?? (match.status === 'HALF_TIME' ? 'HALF_TIME' : 'FULL_TIME')}
      showClockHud={false}
    />
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
    setActiveModal(null);
    recordEvent.mutate(
      { type, side, playerId, assistPlayerId, clientEventId: makeClientEventId() },
      {
        onSuccess: (updated) => {
          applyUpdate(updated);
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
        <Scoreboard
          homeTeamName={match.homeTeam.name}
          awayTeamName={match.awayTeam.name}
          homeScore={match.state?.homeScore ?? 0}
          awayScore={match.state?.awayScore ?? 0}
          homeLogoUrl={homeTeam.logoUrl}
          awayLogoUrl={awayTeam.logoUrl}
          period={state.period}
          elapsedSec={elapsedSec}
          halfLimitSec={halfLimitSec}
          addedTimeSec={state.addedTimeSec}
          timeUp={timeUp}
          showClockHud={true}
        />

        <MatchControls
          period={state.period}
          isPaused={isPaused}
          canScore={match.canScore}
          isPausePending={pauseMatch.isPending}
          isResumePending={resumeMatch.isPending}
          isEndFirstHalfPending={endFirstHalf.isPending}
          isEndMatchPending={endMatch.isPending}
          isAddTimePending={addTime.isPending}
          onTogglePause={() => {
            const mutation = isPaused ? resumeMatch : pauseMatch;
            mutation.mutate(undefined, {
              onSuccess: applyUpdate,
              onError: (toggleError) => {
                console.error('Pause/resume failed:', toggleError);
              },
            });
          }}
          onEndFirstHalf={() => {
            endFirstHalf.mutate(undefined, {
              onSuccess: applyUpdate,
              onError: (htError) => {
                console.error('POST /matches/:id/half-time failed:', htError);
              },
            });
          }}
          onEndMatch={() => setActiveModal({ kind: 'end-match' })}
          onAddTime={(seconds) => {
            addTime.mutate(seconds, {
              onSuccess: applyUpdate,
              onError: (addTimeError) => {
                console.error('POST /matches/:id/add-time failed:', addTimeError);
              },
            });
          }}
        />

        {pauseMatch.isError ||
        resumeMatch.isError ||
        endFirstHalf.isError ||
        endMatch.isError ||
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
          <MatchActionBar
            onGoalPress={() => setActiveModal({ kind: 'goal' })}
            onSavePress={() => setActiveModal({ kind: 'save' })}
            onFoulPress={() => setActiveModal({ kind: 'foul' })}
            disabled={recordEvent.isPending || isPaused}
            isPaused={isPaused}
          />
        ) : null}

        {commentary}
      </ScrollView>

      <GoalFlowSheet
        visible={activeModal?.kind === 'goal'}
        disabled={recordEvent.isPending}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        starters={starters}
        onConfirmGoal={(side, scorerId, assistPlayerId) => {
          submitEvent('GOAL', side, scorerId, assistPlayerId);
        }}
        onCancel={() => setActiveModal(null)}
      />

      <PlayerEventSheet
        visible={activeModal?.kind === 'save'}
        title="Who made the save?"
        subtitle="Select the goalkeeper who stopped the shot"
        eventKind="save"
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        options={goalkeepers}
        disabled={recordEvent.isPending}
        onSelect={(option) => submitEvent('SHOT_SAVED', option.side, option.playerId)}
        onCancel={() => setActiveModal(null)}
      />

      <PlayerEventSheet
        visible={activeModal?.kind === 'foul'}
        title="Who committed the foul?"
        subtitle="Select the player penalized for the foul"
        eventKind="foul"
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        options={starters}
        disabled={recordEvent.isPending}
        onSelect={(option) => submitEvent('FOUL', option.side, option.playerId)}
        onCancel={() => setActiveModal(null)}
      />

      {endMatchModal}
    </View>
  );
}
