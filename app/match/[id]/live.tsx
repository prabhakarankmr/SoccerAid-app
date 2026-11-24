import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { ApiError } from '../../../src/api/client';
import { matchKeys } from '../../../src/api/queryKeys';
import { EndMatchConfirmSheet } from '../../../src/components/match/EndMatchConfirmSheet';
import { EventsTimeline } from '../../../src/components/match/EventsTimeline';
import { FullTimeView } from '../../../src/components/match/FullTimeView';
import { GoalFlowSheet, StarterOption } from '../../../src/components/match/GoalFlowSheet';
import { HalfTimeView } from '../../../src/components/match/HalfTimeView';
import { MatchActionBar } from '../../../src/components/match/MatchActionBar';
import { MatchControls } from '../../../src/components/match/MatchControls';
import { PlayerEventSheet } from '../../../src/components/match/PlayerEventSheet';
import { PreMatchKickoffView } from '../../../src/components/match/PreMatchKickoffView';
import { Scoreboard } from '../../../src/components/match/Scoreboard';
import { StadiumBackdrop } from '../../../src/components/ui/StadiumBackdrop';
import { FootballPitch, PitchSlot } from '../../../src/components/pitch/FootballPitch';
import { slotsFor, useFormations } from '../../../src/hooks/useMeta';
import {
  MatchDetail,
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
import { useMe } from '../../../src/hooks/useMe';
import { TeamDetail, useTeam } from '../../../src/hooks/useTeams';

type ActiveModal =
  { kind: 'goal' } | { kind: 'save' } | { kind: 'foul' } | { kind: 'end-match' } | null;

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

export default function MatchLive() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height && width >= 600;

  const { data: me } = useMe();
  const currentUserName = me?.player?.displayName || me?.name || me?.username || 'Player';

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

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const totalGoals = (match?.state?.homeScore ?? 0) + (match?.state?.awayScore ?? 0);

  const stadiumBackdrop = <StadiumBackdrop scrollY={scrollY} celebrateTrigger={totalGoals} />;

  if (isMatchLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0b140e]">
        {stadiumBackdrop}
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (!match) {
    const notFound = error instanceof ApiError && error.code === 'NOT_FOUND';

    return (
      <View className="flex-1 items-center justify-center bg-[#0b140e] px-6">
        {stadiumBackdrop}
        <Text className="text-base font-bold text-white">
          {notFound ? 'Match not found.' : 'Could not load this match — try again.'}
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          accessibilityLabel="Go to Home"
          accessibilityHint="Returns to the home screen"
          className="mt-4 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 active:bg-white/20"
        >
          <Text className="font-bold text-white">Go to Home</Text>
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
    <View className="flex-row items-center justify-between border-b border-white/10 px-4 pb-3 pt-14">
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
        className="flex-row items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 active:bg-white/20"
      >
        <ArrowLeft color="#ffffff" size={16} />
        <Text className="text-xs font-bold text-white">{isEnded ? 'Back' : 'Setup'}</Text>
      </Pressable>
      <View className="flex-row items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-950/60 px-3 py-1">
        <View className={`h-2 w-2 rounded-full ${isEnded ? 'bg-slate-400' : 'bg-emerald-400'}`} />
        <Text className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
          {isEnded ? 'Match Ended' : 'Live Match'}
        </Text>
      </View>
      {canEndMatch ? (
        <Pressable
          onPress={() => setActiveModal({ kind: 'end-match' })}
          accessibilityLabel="End Match"
          accessibilityHint="Ends the match now, at any point — this cannot be undone"
          className="rounded-full border border-red-500/40 bg-red-950/60 px-3 py-1.5 active:bg-red-900/60"
        >
          <Text className="text-xs font-bold text-red-400">End</Text>
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
      <View className="flex-1 bg-[#0b140e]">
        {stadiumBackdrop}
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
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

  const currentElapsed = match.state ? computeElapsedSec(match.state, nowMs) : 0;
  const currentMinute = currentElapsed > 0 ? Math.max(1, Math.ceil(currentElapsed / 60)) : 1;

  const renderTimeline = (isFullHeight = false) => (
    <EventsTimeline
      events={match.events}
      homeTeamName={match.homeTeam.name}
      awayTeamName={match.awayTeam.name}
      nameOf={nameOf}
      isMatchLive={match.status === 'LIVE' || match.status === 'PAUSED'}
      isFullHeight={isFullHeight}
      currentUserName={currentUserName}
      currentMinute={currentMinute}
    />
  );

  if (match.status === 'HALF_TIME') {
    return (
      <View className="flex-1 bg-[#0b140e]">
        {stadiumBackdrop}
        {header}
        <HalfTimeView
          homeTeamName={match.homeTeam.name}
          awayTeamName={match.awayTeam.name}
          homeScore={match.state?.homeScore ?? 0}
          awayScore={match.state?.awayScore ?? 0}
          homeLogoUrl={homeTeam.logoUrl}
          awayLogoUrl={awayTeam.logoUrl}
          canScore={match.canScore}
          isStartingSecondHalf={startSecondHalf.isPending}
          isSecondHalfError={startSecondHalf.isError}
          onStartSecondHalf={() => {
            startSecondHalf.mutate(undefined, {
              onSuccess: applyUpdate,
              onError: (startError) => {
                console.error('POST /matches/:id/second-half failed:', startError);
              },
            });
          }}
          events={match.events}
          nameOf={nameOf}
          currentUserName={currentUserName}
          currentMinute={currentMinute}
        />
        {endMatchModal}
      </View>
    );
  }

  if (match.status === 'FULL_TIME') {
    return (
      <View className="flex-1 bg-[#0b140e]">
        {stadiumBackdrop}
        {header}
        <FullTimeView
          homeTeamName={match.homeTeam.name}
          awayTeamName={match.awayTeam.name}
          homeScore={match.state?.homeScore ?? 0}
          awayScore={match.state?.awayScore ?? 0}
          homeLogoUrl={homeTeam.logoUrl}
          awayLogoUrl={awayTeam.logoUrl}
          events={match.events}
          nameOf={nameOf}
          currentUserName={currentUserName}
        />
      </View>
    );
  }

  if (match.status !== 'LIVE' && match.status !== 'PAUSED') {
    return (
      <View className="flex-1 items-center justify-center bg-[#0b140e]">
        {stadiumBackdrop}
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      </View>
    );
  }

  const state = match.state;

  if (!state) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0b140e]">
        {stadiumBackdrop}
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
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

  const matchHUDAndPitch = (
    <>
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
        <Text className="mt-2 text-center text-xs text-red-400">Could not do that — try again</Text>
      ) : null}

      {recordEvent.isError ? (
        <Text className="mt-2 text-center text-xs text-red-400">
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
    </>
  );

  return (
    <View className="flex-1 bg-[#0b140e]">
      {stadiumBackdrop}
      {header}

      {isLandscape ? (
        <View className="flex-1 flex-row gap-4 px-4 pb-4 pt-2">
          {/* Left Column (Landscape): HUD, Pitch & Controls */}
          <Animated.ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="pb-10"
            onScroll={scrollHandler}
            scrollEventThrottle={16}
          >
            {matchHUDAndPitch}
          </Animated.ScrollView>

          {/* Right Column (Landscape): Full-height Vertical Sports Timeline & Chat */}
          <View className="h-full w-[38%] max-w-md">{renderTimeline(true)}</View>
        </View>
      ) : (
        /* Portrait Column: Vertical flow with fixed-height commentary at bottom */
        <Animated.ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-16 pt-2"
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {matchHUDAndPitch}
          <View className="mt-4">{renderTimeline(false)}</View>
        </Animated.ScrollView>
      )}

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
