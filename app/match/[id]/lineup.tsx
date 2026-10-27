import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import UserPlus from 'lucide-react-native/icons/user-plus';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { apiClient, ApiError } from '../../../src/api/client';
import { FootballPitch, PitchSide, PitchSlot } from '../../../src/components/pitch/FootballPitch';
import { Formation, FormationSlot, useFormations } from '../../../src/hooks/useMeta';
import { LineupPlayerInput, useMatch, useSetLineups } from '../../../src/hooks/useMatches';
import { PlayerSummary } from '../../../src/hooks/usePlayers';
import { TeamDetail, TeamRosterPlayer, useTeam } from '../../../src/hooks/useTeams';
import { teamA, teamB } from '../../../src/theme/tokens';

// slotIndex -> playerId, or null for an unfilled position.
type SlotAssignments = Record<number, string | null>;

function filterAvailable(players: TeamRosterPlayer[], idsParam: string | undefined) {
  if (!idsParam) {
    return players;
  }

  const ids = new Set(idsParam.split(',').filter(Boolean));
  return ids.size > 0 ? players.filter((player) => ids.has(player.id)) : players;
}

function slotsFor(
  formations: Formation[] | undefined,
  formationName: string | undefined,
): FormationSlot[] {
  return formations?.find((formation) => formation.name === formationName)?.slots ?? [];
}

function defaultAssignments(
  slots: FormationSlot[],
  available: TeamRosterPlayer[],
): SlotAssignments {
  const assignments: SlotAssignments = {};
  const queue = [...available];
  const gkSlot = slots.find((slot) => slot.isGoalkeeper);

  if (gkSlot) {
    assignments[gkSlot.slotIndex] = queue.shift()?.id ?? null;
  }

  for (const slot of slots) {
    if (slot.isGoalkeeper) {
      continue;
    }

    assignments[slot.slotIndex] = queue.shift()?.id ?? null;
  }

  return assignments;
}

function assignedCount(assignments: SlotAssignments): number {
  return Object.values(assignments).filter((id) => id !== null).length;
}

function slotIndexForPlayer(assignments: SlotAssignments, playerId: string): number | null {
  const entry = Object.entries(assignments).find(([, id]) => id === playerId);
  return entry ? Number(entry[0]) : null;
}

function benchedPlayers(
  available: TeamRosterPlayer[],
  assignments: SlotAssignments,
): TeamRosterPlayer[] {
  const assignedIds = new Set(Object.values(assignments).filter((id): id is string => id !== null));
  return available.filter((player) => !assignedIds.has(player.id));
}

function toLineupPayload(
  slots: FormationSlot[],
  assignments: SlotAssignments,
  available: TeamRosterPlayer[],
): LineupPlayerInput[] {
  const entries: LineupPlayerInput[] = [];

  for (const slot of slots) {
    const playerId = assignments[slot.slotIndex];

    if (playerId) {
      entries.push({ playerId, isStarter: true, isGoalkeeper: slot.isGoalkeeper });
    }
  }

  const assignedIds = new Set(entries.map((entry) => entry.playerId));

  for (const player of available) {
    if (!assignedIds.has(player.id)) {
      entries.push({ playerId: player.id, isStarter: false, isGoalkeeper: false });
    }
  }

  return entries;
}

interface RosterPanelProps {
  label: string;
  color: string;
  playersPerSide: number;
  slots: FormationSlot[];
  assignments: SlotAssignments;
  available: TeamRosterPlayer[];
  swapSelection: string | null;
  onToggleSwapSelect: (playerId: string) => void;
  teamId: string;
  onGuestAdded: (player: TeamRosterPlayer) => void;
}

function RosterPanel({
  label,
  color,
  playersPerSide,
  slots,
  assignments,
  available,
  swapSelection,
  onToggleSwapSelect,
  teamId,
  onGuestAdded,
}: RosterPanelProps) {
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [guestName, setGuestName] = useState('');

  const addGuestMutation = useMutation({
    mutationFn: async (displayName: string) => {
      const player = await apiClient.post<PlayerSummary>('/players', { displayName });
      await apiClient.post<TeamDetail>(`/teams/${teamId}/members`, { playerId: player.id });
      return player;
    },
    onSuccess: (player) => {
      setGuestName('');
      setIsAddingGuest(false);
      onGuestAdded({
        id: player.id,
        displayName: player.displayName,
        isCaptain: false,
        isGuest: true,
      });
    },
    onError: (error) => {
      console.error('Add guest player failed (lineup):', error);
    },
  });

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2">
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: color }}>
          <Text className="text-xs font-bold text-white">{label}</Text>
        </View>
        <Text className="text-xs font-bold text-black">
          {assignedCount(assignments)}/{playersPerSide}
        </Text>
      </View>

      {available.map((player) => {
        const slotIndex = slotIndexForPlayer(assignments, player.id);
        const isGoalkeeper =
          slotIndex !== null && slots.find((s) => s.slotIndex === slotIndex)?.isGoalkeeper;
        const isSelected = swapSelection === player.id;

        return (
          <View
            key={player.id}
            className={`mt-2 flex-row items-center justify-between rounded-lg border px-2 py-2 ${
              isSelected ? 'border-black bg-gray-100' : 'border-gray-300 bg-white'
            }`}
          >
            <Text className="flex-1 text-sm text-black" numberOfLines={1}>
              {player.displayName}
            </Text>
            {isGoalkeeper ? (
              <View className="mr-2 rounded-full bg-red-100 px-1.5 py-0.5">
                <Text className="text-[10px] font-bold text-red-700">GK</Text>
              </View>
            ) : null}
            <Pressable
              onPress={() => onToggleSwapSelect(player.id)}
              accessibilityLabel={`Select ${player.displayName} to swap`}
              accessibilityHint="Select this player, then another on the same team, to swap their positions"
            >
              <ArrowLeftRight color="#000000" size={16} />
            </Pressable>
          </View>
        );
      })}

      {isAddingGuest ? (
        <View className="mt-2">
          <TextInput
            value={guestName}
            onChangeText={setGuestName}
            placeholder="Guest name"
            accessibilityLabel="Guest player name"
            accessibilityHint="Adds a player who doesn't have a SoccerAid account to this match"
            className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-black"
          />
          <View className="mt-2 flex-row gap-2">
            <Pressable
              onPress={() => addGuestMutation.mutate(guestName.trim())}
              disabled={!guestName.trim() || addGuestMutation.isPending}
              accessibilityLabel="Confirm add guest"
              accessibilityHint="Adds this guest to the match"
              className={`flex-1 items-center rounded-lg py-2 ${
                guestName.trim() && !addGuestMutation.isPending ? 'bg-black' : 'bg-gray-300'
              }`}
            >
              {addGuestMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-xs font-bold text-white">Add</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setIsAddingGuest(false);
                setGuestName('');
              }}
              accessibilityLabel="Cancel adding guest"
              accessibilityHint="Closes the guest name field"
              className="flex-1 items-center rounded-lg border border-gray-300 py-2"
            >
              <Text className="text-xs font-bold text-black">Cancel</Text>
            </Pressable>
          </View>
          {addGuestMutation.isError ? (
            <Text className="mt-1 text-xs text-red-700">Could not add guest — try again</Text>
          ) : null}
        </View>
      ) : (
        <Pressable
          onPress={() => setIsAddingGuest(true)}
          accessibilityLabel={`Add guest to ${label}`}
          accessibilityHint="Adds a player without a SoccerAid account to this match"
          className="mt-2 flex-row items-center justify-center rounded-lg border border-dashed border-gray-400 py-2"
        >
          <UserPlus color="#000000" size={14} />
          <Text className="ml-1 text-xs font-bold text-black">Add Guest</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function MatchLineup() {
  const { id, homePlayerIds, awayPlayerIds } = useLocalSearchParams<{
    id: string;
    homePlayerIds?: string;
    awayPlayerIds?: string;
  }>();
  const { data: match, isLoading: isMatchLoading, error } = useMatch(id);
  const { data: homeTeam } = useTeam(match?.homeTeam.id);
  const { data: awayTeam } = useTeam(match?.awayTeam.id);
  const formationsQuery = useFormations(match?.playersPerSide);

  const [showRosters, setShowRosters] = useState(false);
  const [homeOverrides, setHomeOverrides] = useState<SlotAssignments | null>(null);
  const [awayOverrides, setAwayOverrides] = useState<SlotAssignments | null>(null);
  const [homeExtras, setHomeExtras] = useState<TeamRosterPlayer[]>([]);
  const [awayExtras, setAwayExtras] = useState<TeamRosterPlayer[]>([]);
  const [homeSwapSelection, setHomeSwapSelection] = useState<string | null>(null);
  const [awaySwapSelection, setAwaySwapSelection] = useState<string | null>(null);

  const setLineups = useSetLineups(id);

  const homeAvailable = useMemo(
    () => [...filterAvailable(homeTeam?.players ?? [], homePlayerIds), ...homeExtras],
    [homeTeam, homePlayerIds, homeExtras],
  );
  const awayAvailable = useMemo(
    () => [...filterAvailable(awayTeam?.players ?? [], awayPlayerIds), ...awayExtras],
    [awayTeam, awayPlayerIds, awayExtras],
  );

  const homeSlots = slotsFor(formationsQuery.data, match?.formationHome);
  const awaySlots = slotsFor(formationsQuery.data, match?.formationAway);

  const homeAssignments = homeOverrides ?? defaultAssignments(homeSlots, homeAvailable);
  const awayAssignments = awayOverrides ?? defaultAssignments(awaySlots, awayAvailable);

  function swapHomeSlots(slotA: number, slotB: number) {
    setHomeOverrides({
      ...homeAssignments,
      [slotA]: homeAssignments[slotB] ?? null,
      [slotB]: homeAssignments[slotA] ?? null,
    });
  }

  function swapAwaySlots(slotA: number, slotB: number) {
    setAwayOverrides({
      ...awayAssignments,
      [slotA]: awayAssignments[slotB] ?? null,
      [slotB]: awayAssignments[slotA] ?? null,
    });
  }

  function handleSwap(side: PitchSide, slotA: number, slotB: number) {
    if (side === 'home') {
      swapHomeSlots(slotA, slotB);
    } else {
      swapAwaySlots(slotA, slotB);
    }
  }

  function handleSetGoalkeeper(side: PitchSide, slotIndex: number) {
    const slots = side === 'home' ? homeSlots : awaySlots;
    const gkSlot = slots.find((slot) => slot.isGoalkeeper);

    if (!gkSlot || gkSlot.slotIndex === slotIndex) {
      return;
    }

    handleSwap(side, slotIndex, gkSlot.slotIndex);
  }

  function handleAssignNext(side: PitchSide, slotIndex: number) {
    const available = side === 'home' ? homeAvailable : awayAvailable;
    const assignments = side === 'home' ? homeAssignments : awayAssignments;
    const bench = benchedPlayers(available, assignments);

    if (bench.length === 0) {
      return;
    }

    if (side === 'home') {
      setHomeOverrides({ ...assignments, [slotIndex]: bench[0].id });
    } else {
      setAwayOverrides({ ...assignments, [slotIndex]: bench[0].id });
    }
  }

  function swapPlayersById(side: PitchSide, playerIdA: string, playerIdB: string) {
    const assignments = side === 'home' ? homeAssignments : awayAssignments;
    const slotA = slotIndexForPlayer(assignments, playerIdA);
    const slotB = slotIndexForPlayer(assignments, playerIdB);
    const next = { ...assignments };

    if (slotA !== null) {
      next[slotA] = playerIdB;
    }

    if (slotB !== null) {
      next[slotB] = playerIdA;
    }

    if (side === 'home') {
      setHomeOverrides(next);
    } else {
      setAwayOverrides(next);
    }
  }

  function handleToggleSwapSelect(side: PitchSide, playerId: string) {
    const [selection, setSelection] =
      side === 'home'
        ? [homeSwapSelection, setHomeSwapSelection]
        : [awaySwapSelection, setAwaySwapSelection];

    if (selection === null) {
      setSelection(playerId);
      return;
    }

    if (selection === playerId) {
      setSelection(null);
      return;
    }

    swapPlayersById(side, selection, playerId);
    setSelection(null);
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

  if (!homeTeam || !awayTeam) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#000000" />
      </View>
    );
  }

  const isValid =
    assignedCount(homeAssignments) === match.playersPerSide &&
    assignedCount(awayAssignments) === match.playersPerSide;

  function handleStart() {
    if (!match || !isValid) {
      return;
    }

    setLineups.mutate(
      {
        home: toLineupPayload(homeSlots, homeAssignments, homeAvailable),
        away: toLineupPayload(awaySlots, awayAssignments, awayAvailable),
      },
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

  const homePitchSlots: PitchSlot[] = homeSlots.map((slot) => {
    const playerId = homeAssignments[slot.slotIndex] ?? null;
    const player = playerId ? (homeAvailable.find((p) => p.id === playerId) ?? null) : null;
    return {
      slotIndex: slot.slotIndex,
      isGoalkeeper: slot.isGoalkeeper,
      posX: slot.posX,
      posY: slot.posY,
      player: player ? { id: player.id, displayName: player.displayName } : null,
    };
  });

  const awayPitchSlots: PitchSlot[] = awaySlots.map((slot) => {
    const playerId = awayAssignments[slot.slotIndex] ?? null;
    const player = playerId ? (awayAvailable.find((p) => p.id === playerId) ?? null) : null;
    return {
      slotIndex: slot.slotIndex,
      isGoalkeeper: slot.isGoalkeeper,
      posX: slot.posX,
      posY: slot.posY,
      player: player ? { id: player.id, displayName: player.displayName } : null,
    };
  });

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 pb-16 pt-20">
      <Pressable
        onPress={() => router.back()}
        accessibilityLabel="Back to Match Setup"
        accessibilityHint="Returns to team and format selection"
        className="self-start rounded-lg border border-gray-300 px-4 py-2"
      >
        <Text className="font-bold text-black">← Back</Text>
      </Pressable>

      <Text className="mt-6 text-2xl font-bold text-black">Player Setup</Text>
      <Text className="mt-1 text-black">
        {awayTeam.name} vs {homeTeam.name} ({match.playersPerSide}v{match.playersPerSide})
      </Text>

      {setLineups.isError ? (
        <Text className="mt-2 text-sm text-red-700">
          Could not save the lineup — try again
          {__DEV__ && setLineups.error instanceof Error ? ` (${setLineups.error.message})` : ''}
        </Text>
      ) : null}

      <Pressable
        onPress={handleStart}
        disabled={!isValid || setLineups.isPending}
        accessibilityLabel="Start Match"
        accessibilityHint="Saves the lineup and opens the live match screen"
        className={`mt-4 items-center rounded-lg py-4 ${
          isValid && !setLineups.isPending ? 'bg-black' : 'bg-gray-300'
        }`}
      >
        {setLineups.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-bold text-white">Start Match</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => setShowRosters((prev) => !prev)}
        accessibilityLabel={showRosters ? 'Hide team rosters' : 'Manage team rosters'}
        accessibilityHint="Toggles the player list for both teams"
        className="mt-4 flex-row items-center justify-center gap-2 rounded-lg border border-gray-300 py-3"
      >
        <Text className="font-bold text-black">
          {showRosters ? 'Hide Team Rosters' : 'Manage Team Rosters'}
        </Text>
        {showRosters ? (
          <ChevronUp color="#000000" size={18} />
        ) : (
          <ChevronDown color="#000000" size={18} />
        )}
      </Pressable>

      {showRosters ? (
        <View className="mt-3 flex-row gap-3">
          <RosterPanel
            label="Team B"
            color={teamB.fill}
            playersPerSide={match.playersPerSide}
            slots={awaySlots}
            assignments={awayAssignments}
            available={awayAvailable}
            swapSelection={awaySwapSelection}
            onToggleSwapSelect={(playerId) => handleToggleSwapSelect('away', playerId)}
            teamId={awayTeam.id}
            onGuestAdded={(player) => setAwayExtras((prev) => [...prev, player])}
          />
          <RosterPanel
            label="Team A"
            color={teamA.fill}
            playersPerSide={match.playersPerSide}
            slots={homeSlots}
            assignments={homeAssignments}
            available={homeAvailable}
            swapSelection={homeSwapSelection}
            onToggleSwapSelect={(playerId) => handleToggleSwapSelect('home', playerId)}
            teamId={homeTeam.id}
            onGuestAdded={(player) => setHomeExtras((prev) => [...prev, player])}
          />
        </View>
      ) : null}

      <View className="mt-4">
        <FootballPitch
          homeLabel="Team A"
          awayLabel="Team B"
          homeSlots={homePitchSlots}
          awaySlots={awayPitchSlots}
          onSwap={handleSwap}
          onSetGoalkeeper={handleSetGoalkeeper}
          onAssignNext={handleAssignNext}
        />
      </View>
    </ScrollView>
  );
}
