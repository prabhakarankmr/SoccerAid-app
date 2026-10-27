import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Clock from 'lucide-react-native/icons/clock';
import Pencil from 'lucide-react-native/icons/pencil';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import RotateCw from 'lucide-react-native/icons/rotate-cw';
import Target from 'lucide-react-native/icons/target';
import UserPlus from 'lucide-react-native/icons/user-plus';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { apiClient, ApiError } from '../../../src/api/client';
import { matchKeys } from '../../../src/api/queryKeys';
import { FootballPitch, PitchSide, PitchSlot } from '../../../src/components/pitch/FootballPitch';
import { Formation, FormationSlot, useFormations } from '../../../src/hooks/useMeta';
import {
  LineupPlayerInput,
  useMatch,
  useSetLineups,
  useUpdateMatch,
} from '../../../src/hooks/useMatches';
import { PlayerSummary } from '../../../src/hooks/usePlayers';
import { TeamDetail, TeamRosterPlayer, useTeam } from '../../../src/hooks/useTeams';
import { teamA, teamB } from '../../../src/theme/tokens';

const HALF_DURATION_PRESETS_MIN = [5, 10, 15, 20, 25, 30, 35, 40, 45];

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
  onMakeGoalkeeper: (playerId: string) => void;
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
  onMakeGoalkeeper,
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
            ) : (
              <Pressable
                onPress={() => onMakeGoalkeeper(player.id)}
                accessibilityLabel={`Make ${player.displayName} goalkeeper`}
                accessibilityHint="Makes this player the goalkeeper, moving whoever holds it now out of goal"
                className="mr-2"
              >
                <Target color="#000000" size={16} />
              </Pressable>
            )}
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
  const queryClient = useQueryClient();
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
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const setLineups = useSetLineups(id);
  const updateMatch = useUpdateMatch(id);

  // Leaving this screen always restores portrait — never strand the rest of the app rotated.
  // No-op on web: orientation locking there is unreliable/unsupported outside fullscreen, so
  // `toggleLandscape` below doesn't attempt it there either, just widens the layout instead.
  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web') {
        void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(
          () => {},
        );
      }
    };
  }, []);

  async function toggleLandscape() {
    const next = !isLandscape;
    setIsLandscape(next);

    if (Platform.OS === 'web') {
      return;
    }

    try {
      await ScreenOrientation.lockAsync(
        next
          ? ScreenOrientation.OrientationLock.LANDSCAPE
          : ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    } catch (orientationError) {
      console.error('Screen orientation lock failed:', orientationError);
    }
  }

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

  // Shared by both the pitch (tap a token — already has a slotIndex) and the roster list (a
  // benched player has none) — looking it up here means either caller can just supply a
  // playerId and not care which case applies.
  function makeGoalkeeper(side: PitchSide, playerId: string) {
    const slots = side === 'home' ? homeSlots : awaySlots;
    const assignments = side === 'home' ? homeAssignments : awayAssignments;
    const gkSlot = slots.find((slot) => slot.isGoalkeeper);

    if (!gkSlot) {
      return;
    }

    const currentSlot = slotIndexForPlayer(assignments, playerId);

    if (currentSlot === gkSlot.slotIndex) {
      return;
    }

    if (currentSlot !== null) {
      handleSwap(side, currentSlot, gkSlot.slotIndex);
      return;
    }

    // Benched — assign directly into the GK slot; whoever held it is simply no longer
    // referenced anywhere, so they fall out to the bench on their own.
    const next = { ...assignments, [gkSlot.slotIndex]: playerId };

    if (side === 'home') {
      setHomeOverrides(next);
    } else {
      setAwayOverrides(next);
    }
  }

  function handleSetGoalkeeper(side: PitchSide, slotIndex: number) {
    const assignments = side === 'home' ? homeAssignments : awayAssignments;
    const playerId = assignments[slotIndex];

    if (!playerId) {
      return;
    }

    makeGoalkeeper(side, playerId);
  }

  function resetPositions() {
    setHomeOverrides(null);
    setAwayOverrides(null);
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

  if (isLandscape) {
    return (
      <View className="flex-1 bg-white px-4 pb-6 pt-12">
        <View className="flex-row items-center justify-between gap-2">
          <Pressable
            onPress={() => void toggleLandscape()}
            accessibilityLabel="Exit landscape view"
            accessibilityHint="Returns to the normal player setup layout"
            className="flex-row items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2"
          >
            <RotateCw color="#000000" size={16} />
            <Text className="text-xs font-bold text-black">Exit Landscape</Text>
          </Pressable>
          <Pressable
            onPress={resetPositions}
            accessibilityLabel="Reset positions"
            accessibilityHint="Reverts every player to their default position for the chosen formation"
            className="flex-row items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2"
          >
            <RotateCcw color="#000000" size={16} />
            <Text className="text-xs font-bold text-black">Reset Positions</Text>
          </Pressable>
        </View>

        <View className="mt-3 flex-1">
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
      </View>
    );
  }

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

      {isEditingDuration ? (
        <View className="mt-3 flex-row flex-wrap">
          {HALF_DURATION_PRESETS_MIN.map((minutes) => (
            <Pressable
              key={minutes}
              onPress={() => {
                updateMatch.mutate(
                  { halfDurationSec: minutes * 60 },
                  {
                    onSuccess: (updated) => {
                      queryClient.setQueryData(matchKeys.detail(id ?? ''), updated);
                      setIsEditingDuration(false);
                    },
                    onError: (updateError) => {
                      console.error('PATCH /matches/:id failed:', updateError);
                    },
                  },
                );
              }}
              disabled={updateMatch.isPending}
              accessibilityLabel={`${String(minutes)} minute halves`}
              accessibilityHint="Sets the half duration for this match"
              className={`mb-2 mr-2 rounded-full border px-3 py-1.5 ${
                match.halfDurationSec === minutes * 60
                  ? 'border-gray-300 bg-black'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  match.halfDurationSec === minutes * 60 ? 'text-white' : 'text-black'
                }`}
              >
                {minutes} min
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable
          onPress={() => setIsEditingDuration(true)}
          accessibilityLabel={`Half duration: ${String(match.halfDurationSec / 60)} minutes`}
          accessibilityHint="Opens options to change the half duration"
          className="mt-2 flex-row items-center self-start rounded-full border border-gray-300 px-3 py-1.5"
        >
          <Clock color="#000000" size={14} />
          <Text className="ml-1.5 text-xs font-bold text-black">
            {match.halfDurationSec / 60} min halves
          </Text>
          <Pencil color="#000000" size={12} style={{ marginLeft: 6 }} />
        </Pressable>
      )}
      {updateMatch.isError ? (
        <Text className="mt-1 text-xs text-red-700">Could not update duration — try again</Text>
      ) : null}

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
            onMakeGoalkeeper={(playerId) => makeGoalkeeper('away', playerId)}
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
            onMakeGoalkeeper={(playerId) => makeGoalkeeper('home', playerId)}
            teamId={homeTeam.id}
            onGuestAdded={(player) => setHomeExtras((prev) => [...prev, player])}
          />
        </View>
      ) : null}

      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={() => void toggleLandscape()}
          accessibilityLabel={isLandscape ? 'Exit landscape view' : 'Landscape view'}
          accessibilityHint="Rotates the pitch for more room to arrange players"
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-2"
        >
          <RotateCw color="#000000" size={16} />
          <Text className="text-xs font-bold text-black">
            {isLandscape ? 'Exit Landscape' : 'Landscape View'}
          </Text>
        </Pressable>
        <Pressable
          onPress={resetPositions}
          accessibilityLabel="Reset positions"
          accessibilityHint="Reverts every player to their default position for the chosen formation"
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-2"
        >
          <RotateCcw color="#000000" size={16} />
          <Text className="text-xs font-bold text-black">Reset Positions</Text>
        </Pressable>
      </View>

      <View className="mt-3">
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
