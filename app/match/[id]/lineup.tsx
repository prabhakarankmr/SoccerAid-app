import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ApiError } from '../../../src/api/client';
import { useMatch, useSetLineups } from '../../../src/hooks/useMatches';
import { TeamDetail, TeamRosterPlayer, useTeam } from '../../../src/hooks/useTeams';

type SideKey = 'home' | 'away';

interface SideState {
  starterIds: Set<string>;
  goalkeeperId: string | null;
}

function emptySideState(): SideState {
  return { starterIds: new Set(), goalkeeperId: null };
}

function RosterList({
  title,
  players,
  playersPerSide,
  state,
  onToggleStarter,
  onSetGoalkeeper,
}: {
  title: string;
  players: TeamRosterPlayer[];
  playersPerSide: number;
  state: SideState;
  onToggleStarter: (playerId: string) => void;
  onSetGoalkeeper: (playerId: string) => void;
}) {
  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold text-emerald-800">{title}</Text>
        <Text className="text-sm text-emerald-600">
          {state.starterIds.size}/{playersPerSide} starters
        </Text>
      </View>

      {players.length < playersPerSide ? (
        <Text className="mt-2 text-sm text-red-700">
          This team only has {players.length} player{players.length === 1 ? '' : 's'} — add{' '}
          {playersPerSide - players.length} more on the team page before starting.
        </Text>
      ) : null}

      {players.map((player) => {
        const isStarter = state.starterIds.has(player.id);
        const isGoalkeeper = state.goalkeeperId === player.id;

        return (
          <View
            key={player.id}
            className={`mt-2 flex-row items-center justify-between rounded-lg border px-3 py-3 ${
              isStarter ? 'border-emerald-400 bg-emerald-50' : 'border-emerald-200 bg-white'
            }`}
          >
            <Pressable
              onPress={() => onToggleStarter(player.id)}
              accessibilityLabel={`${player.displayName}, ${isStarter ? 'starting' : 'substitute'}`}
              accessibilityHint="Toggles this player between starting and substitute"
              className="flex-1 flex-row items-center gap-2"
            >
              <Text className="text-emerald-900">{player.displayName}</Text>
              {player.isCaptain ? (
                <View className="rounded-full bg-emerald-100 px-2 py-0.5">
                  <Text className="text-xs font-bold text-emerald-700">Captain</Text>
                </View>
              ) : null}
              {isGoalkeeper ? (
                <View className="rounded-full bg-orange-100 px-2 py-0.5">
                  <Text className="text-xs font-bold text-orange-600">GK</Text>
                </View>
              ) : null}
            </Pressable>
            {isStarter ? (
              <Pressable
                onPress={() => onSetGoalkeeper(player.id)}
                disabled={isGoalkeeper}
                accessibilityLabel={`Make ${player.displayName} the starting goalkeeper`}
                accessibilityHint="Sets this player as the starting goalkeeper, replacing any other"
              >
                <Text
                  className={`text-xs font-bold ${isGoalkeeper ? 'text-gray-300' : 'text-emerald-600'}`}
                >
                  {isGoalkeeper ? 'GK' : 'Set GK'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function toLineupPayload(team: TeamDetail, state: SideState) {
  return team.players.map((player) => ({
    playerId: player.id,
    isStarter: state.starterIds.has(player.id),
    isGoalkeeper: state.goalkeeperId === player.id,
  }));
}

export default function MatchLineup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: match, isLoading: isMatchLoading, error } = useMatch(id);
  const { data: homeTeam } = useTeam(match?.homeTeam.id);
  const { data: awayTeam } = useTeam(match?.awayTeam.id);

  const [home, setHome] = useState<SideState>(emptySideState);
  const [away, setAway] = useState<SideState>(emptySideState);

  const setLineups = useSetLineups(id);

  function toggleStarter(side: SideKey, playerId: string) {
    const setState = side === 'home' ? setHome : setAway;
    const playersPerSide = match?.playersPerSide ?? 0;

    setState((prev) => {
      const next = new Set(prev.starterIds);
      let goalkeeperId = prev.goalkeeperId;

      if (next.has(playerId)) {
        next.delete(playerId);

        if (goalkeeperId === playerId) {
          goalkeeperId = null;
        }
      } else {
        if (next.size >= playersPerSide) {
          return prev;
        }

        next.add(playerId);
      }

      return { starterIds: next, goalkeeperId };
    });
  }

  function setGoalkeeper(side: SideKey, playerId: string) {
    const setState = side === 'home' ? setHome : setAway;
    setState((prev) =>
      prev.starterIds.has(playerId) ? { ...prev, goalkeeperId: playerId } : prev,
    );
  }

  if (isMatchLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  if (!match) {
    const notFound = error instanceof ApiError && error.code === 'NOT_FOUND';

    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-emerald-700">
          {notFound ? 'Match not found.' : 'Could not load this match — try again.'}
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          accessibilityLabel="Go to Home"
          accessibilityHint="Returns to the home screen"
          className="mt-4 rounded-lg border border-emerald-300 px-4 py-2"
        >
          <Text className="font-bold text-emerald-700">Go to Home</Text>
        </Pressable>
      </View>
    );
  }

  if (!homeTeam || !awayTeam) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  const isHomeComplete =
    home.starterIds.size === match.playersPerSide && home.goalkeeperId !== null;
  const isAwayComplete =
    away.starterIds.size === match.playersPerSide && away.goalkeeperId !== null;
  const isValid = isHomeComplete && isAwayComplete;

  function handleStart() {
    if (!match || !homeTeam || !awayTeam || !isValid) {
      return;
    }

    setLineups.mutate(
      { home: toLineupPayload(homeTeam, home), away: toLineupPayload(awayTeam, away) },
      {
        onSuccess: () => {
          router.replace({ pathname: '/match/[id]/live', params: { id: match.id } });
        },
        onError: (lineupError) => {
          console.error('PUT /matches/:id/lineups failed:', lineupError);
        },
      },
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 pb-16 pt-20">
      <Pressable
        onPress={() => router.back()}
        accessibilityLabel="Back to Match Setup"
        accessibilityHint="Returns to team and format selection"
        className="self-start rounded-lg border border-emerald-300 px-4 py-2"
      >
        <Text className="font-bold text-emerald-700">← Back</Text>
      </Pressable>

      <Text className="mt-6 text-2xl font-bold text-emerald-800">Player Setup</Text>
      <Text className="mt-1 text-emerald-600">
        {homeTeam.name} vs {awayTeam.name} · {match.playersPerSide}v{match.playersPerSide} · pick{' '}
        {match.playersPerSide} starters and a goalkeeper for each side.
      </Text>

      <RosterList
        title={homeTeam.name}
        players={homeTeam.players}
        playersPerSide={match.playersPerSide}
        state={home}
        onToggleStarter={(playerId) => toggleStarter('home', playerId)}
        onSetGoalkeeper={(playerId) => setGoalkeeper('home', playerId)}
      />

      <RosterList
        title={awayTeam.name}
        players={awayTeam.players}
        playersPerSide={match.playersPerSide}
        state={away}
        onToggleStarter={(playerId) => toggleStarter('away', playerId)}
        onSetGoalkeeper={(playerId) => setGoalkeeper('away', playerId)}
      />

      {setLineups.isError ? (
        <Text className="mt-4 text-sm text-red-700">
          Could not save the lineup — try again
          {__DEV__ && setLineups.error instanceof Error ? ` (${setLineups.error.message})` : ''}
        </Text>
      ) : null}

      <Pressable
        onPress={handleStart}
        disabled={!isValid || setLineups.isPending}
        accessibilityLabel="Start Match"
        accessibilityHint="Saves the lineup and opens the live match screen"
        className={`mt-6 items-center rounded-lg py-4 ${
          isValid && !setLineups.isPending ? 'bg-emerald-600' : 'bg-emerald-300'
        }`}
      >
        {setLineups.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-bold text-white">Start Match</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
