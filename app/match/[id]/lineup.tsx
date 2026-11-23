import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import Clock from 'lucide-react-native/icons/clock';
import Pencil from 'lucide-react-native/icons/pencil';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { apiClient, ApiError } from '../../../src/api/client';
import { matchKeys } from '../../../src/api/queryKeys';
import { PitchSide, PitchSlot } from '../../../src/components/pitch/FootballPitch';
import {
  EndedMatchView,
  FINISHED_MATCH_STATUSES,
} from '../../../src/components/match/EndedMatchView';
import { FormationPickerModal } from '../../../src/components/match/FormationPickerModal';
import { LineupListView } from '../../../src/components/match/LineupListView';
import { LineupPitchView, SwapSelection } from '../../../src/components/match/LineupPitchView';
import { FormationSlot, slotsFor, useFormations } from '../../../src/hooks/useMeta';
import {
  LineupPlayerInput,
  useMatch,
  useSetLineups,
  useUpdateMatch,
} from '../../../src/hooks/useMatches';
import { PlayerSummary } from '../../../src/hooks/usePlayers';
import { TeamDetail, TeamRosterPlayer, useTeam } from '../../../src/hooks/useTeams';

const HALF_DURATION_PRESETS_MIN = [5, 10, 15, 20, 25, 30, 35, 40, 45];

type SlotAssignments = Record<number, string | null>;

function filterAvailable(players: TeamRosterPlayer[], idsParam: string | undefined) {
  if (!idsParam) {
    return players;
  }
  const ids = new Set(idsParam.split(',').filter(Boolean));
  return ids.size > 0 ? players.filter((player) => ids.has(player.id)) : players;
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

function reassignToNewFormation(
  oldSlots: FormationSlot[],
  newSlots: FormationSlot[],
  currentAssignments: SlotAssignments,
): SlotAssignments {
  const newAssignments: SlotAssignments = {};

  const oldGkSlot = oldSlots.find((s) => s.isGoalkeeper);
  const currentGkPlayerId = oldGkSlot ? currentAssignments[oldGkSlot.slotIndex] : null;

  const currentOutfieldIds: string[] = [];
  for (const slot of oldSlots) {
    if (slot.isGoalkeeper) continue;
    const pid = currentAssignments[slot.slotIndex];
    if (pid) {
      currentOutfieldIds.push(pid);
    }
  }

  const newGkSlot = newSlots.find((s) => s.isGoalkeeper);
  if (newGkSlot) {
    newAssignments[newGkSlot.slotIndex] = currentGkPlayerId ?? currentOutfieldIds.shift() ?? null;
  }

  for (const slot of newSlots) {
    if (slot.isGoalkeeper) continue;
    newAssignments[slot.slotIndex] = currentOutfieldIds.shift() ?? null;
  }

  return newAssignments;
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

  const [activeTab, setActiveTab] = useState<'pitch' | 'list'>('pitch');
  const [formationModalSide, setFormationModalSide] = useState<PitchSide | null>(null);

  const [customHomeFormation, setCustomHomeFormation] = useState<string | null>(null);
  const [customAwayFormation, setCustomAwayFormation] = useState<string | null>(null);

  const [homeOverrides, setHomeOverrides] = useState<SlotAssignments | null>(null);
  const [awayOverrides, setAwayOverrides] = useState<SlotAssignments | null>(null);
  const [homeExtras, setHomeExtras] = useState<TeamRosterPlayer[]>([]);
  const [awayExtras, setAwayExtras] = useState<TeamRosterPlayer[]>([]);

  const [swapSelection, setSwapSelection] = useState<SwapSelection | null>(null);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const setLineups = useSetLineups(id);
  const updateMatch = useUpdateMatch(id);

  const addGuestMutation = useMutation({
    mutationFn: async ({ teamId, displayName }: { teamId: string; displayName: string }) => {
      const player = await apiClient.post<PlayerSummary>('/players', { displayName });
      await apiClient.post<TeamDetail>(`/teams/${teamId}/members`, { playerId: player.id });
      return player;
    },
  });

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

    if (Platform.OS === 'web') return;

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

  const effectiveHomeFormation =
    customHomeFormation ?? match?.formationHome ?? formationsQuery.data?.[0]?.name ?? '';
  const effectiveAwayFormation =
    customAwayFormation ?? match?.formationAway ?? formationsQuery.data?.[0]?.name ?? '';

  const homeSlots = useMemo(
    () =>
      slotsFor(formationsQuery.data, effectiveHomeFormation) ||
      formationsQuery.data?.[0]?.slots ||
      [],
    [formationsQuery.data, effectiveHomeFormation],
  );

  const awaySlots = useMemo(
    () =>
      slotsFor(formationsQuery.data, effectiveAwayFormation) ||
      formationsQuery.data?.[0]?.slots ||
      [],
    [formationsQuery.data, effectiveAwayFormation],
  );

  const homeAssignments = homeOverrides ?? defaultAssignments(homeSlots, homeAvailable);
  const awayAssignments = awayOverrides ?? defaultAssignments(awaySlots, awayAvailable);

  const homeBench = useMemo(
    () => benchedPlayers(homeAvailable, homeAssignments),
    [homeAvailable, homeAssignments],
  );
  const awayBench = useMemo(
    () => benchedPlayers(awayAvailable, awayAssignments),
    [awayAvailable, awayAssignments],
  );

  function handleSelectFormation(side: PitchSide, newFormationName: string) {
    if (!formationsQuery.data) return;

    const oldSlots = side === 'home' ? homeSlots : awaySlots;
    const newSlots = slotsFor(formationsQuery.data, newFormationName);
    const currentAssignments = side === 'home' ? homeAssignments : awayAssignments;

    const updatedAssignments = reassignToNewFormation(oldSlots, newSlots, currentAssignments);

    if (side === 'home') {
      setCustomHomeFormation(newFormationName);
      setHomeOverrides(updatedAssignments);
    } else {
      setCustomAwayFormation(newFormationName);
      setAwayOverrides(updatedAssignments);
    }
  }

  function swapPlayersById(side: PitchSide, playerIdA: string, playerIdB: string) {
    const assignments = side === 'home' ? homeAssignments : awayAssignments;
    const setOverrides = side === 'home' ? setHomeOverrides : setAwayOverrides;

    const slotA = slotIndexForPlayer(assignments, playerIdA);
    const slotB = slotIndexForPlayer(assignments, playerIdB);

    if (slotA !== null && slotB !== null) {
      setOverrides({
        ...assignments,
        [slotA]: playerIdB,
        [slotB]: playerIdA,
      });
      return;
    }

    if (slotA !== null && slotB === null) {
      setOverrides({
        ...assignments,
        [slotA]: playerIdB,
      });
      return;
    }

    if (slotA === null && slotB !== null) {
      setOverrides({
        ...assignments,
        [slotB]: playerIdA,
      });
    }
  }

  function handleSelectForSwap(side: PitchSide, playerId: string, displayName: string) {
    if (swapSelection === null) {
      setSwapSelection({ side, playerId, displayName });
      return;
    }

    if (swapSelection.side === side && swapSelection.playerId === playerId) {
      setSwapSelection(null);
      return;
    }

    if (swapSelection.side !== side) {
      setSwapSelection({ side, playerId, displayName });
      return;
    }

    // Both on same side: execute swap!
    swapPlayersById(side, swapSelection.playerId, playerId);
    setSwapSelection(null);
  }

  function handleSwapSlots(side: PitchSide, slotA: number, slotB: number) {
    const assignments = side === 'home' ? homeAssignments : awayAssignments;
    const setOverrides = side === 'home' ? setHomeOverrides : setAwayOverrides;

    setOverrides({
      ...assignments,
      [slotA]: assignments[slotB] ?? null,
      [slotB]: assignments[slotA] ?? null,
    });
  }

  function makeGoalkeeper(side: PitchSide, playerId: string) {
    const slots = side === 'home' ? homeSlots : awaySlots;
    const assignments = side === 'home' ? homeAssignments : awayAssignments;
    const setOverrides = side === 'home' ? setHomeOverrides : setAwayOverrides;
    const gkSlot = slots.find((slot) => slot.isGoalkeeper);

    if (!gkSlot) return;

    const currentSlot = slotIndexForPlayer(assignments, playerId);

    if (currentSlot === gkSlot.slotIndex) return;

    if (currentSlot !== null) {
      handleSwapSlots(side, currentSlot, gkSlot.slotIndex);
      return;
    }

    // Benched player becomes GK; previous GK moves to bench
    setOverrides({
      ...assignments,
      [gkSlot.slotIndex]: playerId,
    });
  }

  function handleSlotTap(side: PitchSide, slotIndex: number) {
    const assignments = side === 'home' ? homeAssignments : awayAssignments;
    const occupantId = assignments[slotIndex];

    if (swapSelection && swapSelection.side === side) {
      if (occupantId === swapSelection.playerId) {
        setSwapSelection(null);
        return;
      }
      if (occupantId) {
        swapPlayersById(side, swapSelection.playerId, occupantId);
      } else {
        const setOverrides = side === 'home' ? setHomeOverrides : setAwayOverrides;
        setOverrides({
          ...assignments,
          [slotIndex]: swapSelection.playerId,
        });
      }
      setSwapSelection(null);
      return;
    }

    if (occupantId) {
      makeGoalkeeper(side, occupantId);
    }
  }

  function handleAssignNext(side: PitchSide, slotIndex: number) {
    if (swapSelection && swapSelection.side === side) {
      const assignments = side === 'home' ? homeAssignments : awayAssignments;
      const setOverrides = side === 'home' ? setHomeOverrides : setAwayOverrides;
      setOverrides({
        ...assignments,
        [slotIndex]: swapSelection.playerId,
      });
      setSwapSelection(null);
      return;
    }

    const bench = side === 'home' ? homeBench : awayBench;
    if (bench.length === 0) return;

    const assignments = side === 'home' ? homeAssignments : awayAssignments;
    const setOverrides = side === 'home' ? setHomeOverrides : setAwayOverrides;
    setOverrides({
      ...assignments,
      [slotIndex]: bench[0].id,
    });
  }

  function resetPositions() {
    setHomeOverrides(null);
    setAwayOverrides(null);
    setCustomHomeFormation(null);
    setCustomAwayFormation(null);
    setSwapSelection(null);
  }

  async function handleAddGuest(side: PitchSide, displayName: string) {
    const teamId = side === 'home' ? homeTeam?.id : awayTeam?.id;
    if (!teamId) return;

    const player = await addGuestMutation.mutateAsync({ teamId, displayName });
    const guestObj: TeamRosterPlayer = {
      id: player.id,
      displayName: player.displayName,
      isCaptain: false,
      isGuest: true,
    };

    if (side === 'home') {
      setHomeExtras((prev) => [...prev, guestObj]);
    } else {
      setAwayExtras((prev) => [...prev, guestObj]);
    }
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
          accessibilityRole="button"
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

  if (FINISHED_MATCH_STATUSES.includes(match.status)) {
    return (
      <EndedMatchView
        matchId={match.id}
        homeTeamName={homeTeam.name}
        awayTeamName={awayTeam.name}
        status={match.status}
      />
    );
  }

  const homeStarterCount = assignedCount(homeAssignments);
  const awayStarterCount = assignedCount(awayAssignments);
  const isValid =
    homeStarterCount === match.playersPerSide && awayStarterCount === match.playersPerSide;

  function handleStart() {
    if (!match || !isValid) return;

    setLineups.mutate(
      {
        home: toLineupPayload(homeSlots, homeAssignments, homeAvailable),
        away: toLineupPayload(awaySlots, awayAssignments, awayAvailable),
      },
      {
        onSuccess: (lineupsSaved) => {
          queryClient.setQueryData(matchKeys.detail(match.id), lineupsSaved);
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
      <LineupPitchView
        homeTeamName={homeTeam.name}
        awayTeamName={awayTeam.name}
        homeFormation={effectiveHomeFormation}
        awayFormation={effectiveAwayFormation}
        onOpenFormationPicker={(side) => setFormationModalSide(side)}
        homePitchSlots={homePitchSlots}
        awayPitchSlots={awayPitchSlots}
        homeBench={homeBench}
        awayBench={awayBench}
        swapSelection={swapSelection}
        onSelectForSwap={handleSelectForSwap}
        onCancelSwap={() => setSwapSelection(null)}
        onSlotTap={handleSlotTap}
        onSwapSlots={handleSwapSlots}
        onAssignNext={handleAssignNext}
        onResetPositions={resetPositions}
        onToggleLandscape={() => void toggleLandscape()}
        isLandscape={true}
        onAddGuest={handleAddGuest}
      />
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-5 pb-16 pt-16">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back to Match Setup"
        accessibilityHint="Returns to team and format selection"
        className="self-start rounded-lg border border-gray-300 px-3.5 py-1.5 active:bg-gray-100"
      >
        <Text className="font-bold text-black">← Back</Text>
      </Pressable>

      <Text className="mt-4 text-2xl font-bold text-black">Player Setup</Text>
      <Text className="mt-0.5 text-sm font-medium text-gray-600">
        {awayTeam.name} vs {homeTeam.name} ({match.playersPerSide}v{match.playersPerSide})
      </Text>

      {/* Half Duration Pill / Editor */}
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
              accessibilityRole="button"
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
          accessibilityRole="button"
          accessibilityLabel={`Half duration: ${String(match.halfDurationSec / 60)} minutes`}
          accessibilityHint="Opens options to change the half duration"
          className="mt-2 flex-row items-center self-start rounded-full border border-gray-300 px-3 py-1.5 active:bg-gray-50"
        >
          <Clock color="#000000" size={13} />
          <Text className="ml-1.5 text-xs font-bold text-black">
            {match.halfDurationSec / 60} min halves
          </Text>
          <Pencil color="#6b7280" size={11} style={{ marginLeft: 6 }} />
        </Pressable>
      )}

      {setLineups.isError ? (
        <Text className="mt-2 text-sm text-red-700">
          Could not save the lineup — try again
          {__DEV__ && setLineups.error instanceof Error ? ` (${setLineups.error.message})` : ''}
        </Text>
      ) : null}

      {/* Main CTA */}
      <Pressable
        onPress={handleStart}
        disabled={!isValid || setLineups.isPending}
        accessibilityRole="button"
        accessibilityLabel="Continue to Match"
        accessibilityHint="Saves the lineup and proceeds to the match"
        className={`mt-4 items-center rounded-xl py-3.5 ${
          isValid && !setLineups.isPending ? 'bg-black active:bg-gray-800' : 'bg-gray-300'
        }`}
      >
        {setLineups.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-bold text-white">Continue to Match</Text>
        )}
      </Pressable>

      {!isValid ? (
        <Text className="mt-1 text-center text-xs text-gray-500">
          Assign exactly {match.playersPerSide} starters for each team to continue
        </Text>
      ) : null}

      {/* Segmented Top Tab Bar: [ ⚽ Pitch View ] and [ 📋 List View ] */}
      <View className="mt-5 flex-row rounded-xl bg-gray-100 p-1 border border-gray-200">
        <Pressable
          onPress={() => setActiveTab('pitch')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'pitch' }}
          accessibilityLabel="Pitch View tab"
          accessibilityHint="Switches to tactical pitch view"
          className={`flex-1 items-center justify-center rounded-lg py-2 ${
            activeTab === 'pitch' ? 'bg-white shadow-sm border border-gray-200/60' : ''
          }`}
        >
          <Text
            className={`text-xs ${
              activeTab === 'pitch' ? 'font-bold text-black' : 'font-medium text-gray-500'
            }`}
          >
            ⚽ Pitch View
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('list')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'list' }}
          accessibilityLabel="List View tab"
          accessibilityHint="Switches to squad list view"
          className={`flex-1 items-center justify-center rounded-lg py-2 ${
            activeTab === 'list' ? 'bg-white shadow-sm border border-gray-200/60' : ''
          }`}
        >
          <Text
            className={`text-xs ${
              activeTab === 'list' ? 'font-bold text-black' : 'font-medium text-gray-500'
            }`}
          >
            📋 List View
          </Text>
        </Pressable>
      </View>

      {/* Active Tab View */}
      {activeTab === 'pitch' ? (
        <LineupPitchView
          homeTeamName={homeTeam.name}
          awayTeamName={awayTeam.name}
          homeFormation={effectiveHomeFormation}
          awayFormation={effectiveAwayFormation}
          onOpenFormationPicker={(side) => setFormationModalSide(side)}
          homePitchSlots={homePitchSlots}
          awayPitchSlots={awayPitchSlots}
          homeBench={homeBench}
          awayBench={awayBench}
          swapSelection={swapSelection}
          onSelectForSwap={handleSelectForSwap}
          onCancelSwap={() => setSwapSelection(null)}
          onSlotTap={handleSlotTap}
          onSwapSlots={handleSwapSlots}
          onAssignNext={handleAssignNext}
          onResetPositions={resetPositions}
          onToggleLandscape={() => void toggleLandscape()}
          isLandscape={false}
          onAddGuest={handleAddGuest}
        />
      ) : (
        <LineupListView
          homeTeamName={homeTeam.name}
          awayTeamName={awayTeam.name}
          playersPerSide={match.playersPerSide}
          homeSlots={homeSlots}
          awaySlots={awaySlots}
          homeAssignments={homeAssignments}
          awayAssignments={awayAssignments}
          homeAvailable={homeAvailable}
          awayAvailable={awayAvailable}
          homeBench={homeBench}
          awayBench={awayBench}
          swapSelection={swapSelection}
          onSelectForSwap={handleSelectForSwap}
          onMakeGoalkeeper={makeGoalkeeper}
          onAssignNext={handleAssignNext}
          onAddGuest={handleAddGuest}
        />
      )}

      {/* Formation Picker Modal */}
      <FormationPickerModal
        visible={formationModalSide !== null}
        teamName={formationModalSide === 'home' ? homeTeam.name : awayTeam.name}
        side={formationModalSide ?? 'home'}
        currentFormation={
          formationModalSide === 'home' ? effectiveHomeFormation : effectiveAwayFormation
        }
        formations={formationsQuery.data ?? []}
        onSelect={(name) => {
          if (formationModalSide) {
            handleSelectFormation(formationModalSide, name);
          }
        }}
        onClose={() => setFormationModalSide(null)}
      />
    </ScrollView>
  );
}
