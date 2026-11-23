import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { LineupPitchView, SelectedPlayer } from '../../../src/components/match/LineupPitchView';
import { FormationSlot, slotsFor, useFormations } from '../../../src/hooks/useMeta';
import { LineupPlayerInput, useMatch, useSetLineups } from '../../../src/hooks/useMatches';
import { PlayerSummary } from '../../../src/hooks/usePlayers';
import { TeamDetail, TeamRosterPlayer, useTeam } from '../../../src/hooks/useTeams';

const pitchBg = require('../../../assets/pitch-bg.jpg');

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

function swapPlayers(
  assignments: SlotAssignments,
  playerIdA: string,
  playerIdB: string,
): SlotAssignments {
  if (playerIdA === playerIdB) return assignments;

  const slotA = slotIndexForPlayer(assignments, playerIdA);
  const slotB = slotIndexForPlayer(assignments, playerIdB);

  const next = { ...assignments };

  if (slotA !== null && slotB !== null) {
    next[slotA] = playerIdB;
    next[slotB] = playerIdA;
  } else if (slotA !== null && slotB === null) {
    next[slotA] = playerIdB;
  } else if (slotA === null && slotB !== null) {
    next[slotB] = playerIdA;
  }

  return next;
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
  available: TeamRosterPlayer[],
): SlotAssignments {
  const newAssignments: SlotAssignments = {};

  const oldGkSlot = oldSlots.find((s) => s.isGoalkeeper);
  const currentGkPlayerId = oldGkSlot ? currentAssignments[oldGkSlot.slotIndex] : null;

  const currentOutfieldIds: string[] = [];
  for (const slot of oldSlots) {
    if (slot.isGoalkeeper) continue;
    const pid = currentAssignments[slot.slotIndex];
    if (pid && pid !== currentGkPlayerId) {
      currentOutfieldIds.push(pid);
    }
  }

  const assignedSet = new Set(
    [currentGkPlayerId, ...currentOutfieldIds].filter((id): id is string => id !== null),
  );
  const unassignedQueue = available
    .filter((player) => !assignedSet.has(player.id))
    .map((player) => player.id);

  const newGkSlot = newSlots.find((s) => s.isGoalkeeper);
  if (newGkSlot) {
    newAssignments[newGkSlot.slotIndex] =
      currentGkPlayerId ?? currentOutfieldIds.shift() ?? unassignedQueue.shift() ?? null;
  }

  for (const slot of newSlots) {
    if (slot.isGoalkeeper) continue;
    newAssignments[slot.slotIndex] = currentOutfieldIds.shift() ?? unassignedQueue.shift() ?? null;
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

  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayer | null>(null);

  const setLineups = useSetLineups(id);

  const addGuestMutation = useMutation({
    mutationFn: async ({ teamId, displayName }: { teamId: string; displayName: string }) => {
      const player = await apiClient.post<PlayerSummary>('/players', { displayName });
      await apiClient.post<TeamDetail>(`/teams/${teamId}/members`, { playerId: player.id });
      return player;
    },
  });

  // Allow auto-rotation while on this screen; restore portrait lock upon leaving
  useEffect(() => {
    if (Platform.OS !== 'web') {
      void ScreenOrientation.unlockAsync().catch(() => {});
    }

    return () => {
      if (Platform.OS !== 'web') {
        void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(
          () => {},
        );
      }
    };
  }, []);

  const homeAvailable = useMemo(
    () => [...filterAvailable(homeTeam?.players ?? [], homePlayerIds), ...homeExtras],
    [homeTeam, homePlayerIds, homeExtras],
  );

  const homePlayerIdSet = useMemo(
    () => new Set(homeAvailable.map((player) => player.id)),
    [homeAvailable],
  );

  // Safety filter: ensure no player in Team A appears in Team B's roster/bench
  const awayAvailable = useMemo(
    () =>
      [...filterAvailable(awayTeam?.players ?? [], awayPlayerIds), ...awayExtras].filter(
        (player) => !homePlayerIdSet.has(player.id),
      ),
    [awayTeam, awayPlayerIds, awayExtras, homePlayerIdSet],
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

    const currentFormation = side === 'home' ? effectiveHomeFormation : effectiveAwayFormation;
    const available = side === 'home' ? homeAvailable : awayAvailable;
    const newSlots = slotsFor(formationsQuery.data, newFormationName);

    // Auto-Reset: selecting the active formation resets all positions to default
    if (newFormationName === currentFormation) {
      if (side === 'home') {
        setHomeOverrides(null);
      } else {
        setAwayOverrides(null);
      }
      setSelectedPlayer(null);
      return;
    }

    const oldSlots = side === 'home' ? homeSlots : awaySlots;
    const currentAssignments = side === 'home' ? homeAssignments : awayAssignments;

    const updatedAssignments = reassignToNewFormation(
      oldSlots,
      newSlots,
      currentAssignments,
      available,
    );

    if (side === 'home') {
      setCustomHomeFormation(newFormationName);
      setHomeOverrides(updatedAssignments);
    } else {
      setCustomAwayFormation(newFormationName);
      setAwayOverrides(updatedAssignments);
    }

    setSelectedPlayer(null);
  }

  function handlePlayerTap(side: PitchSide, playerId: string) {
    if (!selectedPlayer) {
      setSelectedPlayer({ side, playerId });
      return;
    }

    if (selectedPlayer.side === side && selectedPlayer.playerId === playerId) {
      setSelectedPlayer(null);
      return;
    }

    if (selectedPlayer.side !== side) {
      setSelectedPlayer({ side, playerId });
      return;
    }

    const currentAssignments = side === 'home' ? homeAssignments : awayAssignments;
    const setOverrides = side === 'home' ? setHomeOverrides : setAwayOverrides;

    setOverrides(swapPlayers(currentAssignments, selectedPlayer.playerId, playerId));
    setSelectedPlayer(null);
  }

  function handleSwapSlots(side: PitchSide, slotA: number, slotB: number) {
    const assignments = side === 'home' ? homeAssignments : awayAssignments;
    const setOverrides = side === 'home' ? setHomeOverrides : setAwayOverrides;

    const playerA = assignments[slotA];
    const playerB = assignments[slotB];

    if (playerA && playerB) {
      setOverrides(swapPlayers(assignments, playerA, playerB));
    } else {
      setOverrides({
        ...assignments,
        [slotA]: playerB ?? null,
        [slotB]: playerA ?? null,
      });
    }
    setSelectedPlayer(null);
  }

  function handleSlotTap(side: PitchSide, slotIndex: number) {
    const assignments = side === 'home' ? homeAssignments : awayAssignments;
    const occupantId = assignments[slotIndex];

    if (occupantId) {
      handlePlayerTap(side, occupantId);
      return;
    }

    if (selectedPlayer && selectedPlayer.side === side) {
      const setOverrides = side === 'home' ? setHomeOverrides : setAwayOverrides;
      const oldSlot = slotIndexForPlayer(assignments, selectedPlayer.playerId);
      const next = { ...assignments };
      if (oldSlot !== null) {
        next[oldSlot] = null;
      }
      next[slotIndex] = selectedPlayer.playerId;
      setOverrides(next);
      setSelectedPlayer(null);
      return;
    }

    handleAssignNext(side, slotIndex);
  }

  function handleAssignNext(side: PitchSide, slotIndex: number) {
    if (selectedPlayer && selectedPlayer.side === side) {
      const assignments = side === 'home' ? homeAssignments : awayAssignments;
      const setOverrides = side === 'home' ? setHomeOverrides : setAwayOverrides;
      const oldSlot = slotIndexForPlayer(assignments, selectedPlayer.playerId);
      const next = { ...assignments };
      if (oldSlot !== null) {
        next[oldSlot] = null;
      }
      next[slotIndex] = selectedPlayer.playerId;
      setOverrides(next);
      setSelectedPlayer(null);
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
      <View className="flex-1 items-center justify-center bg-[#0d2015]">
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (!match) {
    const notFound = error instanceof ApiError && error.code === 'NOT_FOUND';
    return (
      <View className="flex-1 items-center justify-center bg-[#0d2015] px-6">
        <Text className="text-white text-base font-semibold">
          {notFound ? 'Match not found.' : 'Could not load this match — try again.'}
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
          accessibilityHint="Returns to the home screen"
          className="mt-4 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 active:bg-white/20"
        >
          <Text className="font-bold text-white">Go to Home</Text>
        </Pressable>
      </View>
    );
  }

  if (!homeTeam || !awayTeam) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0d2015]">
        <ActivityIndicator color="#ffffff" />
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

  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0d2015',
      }}
    >
      <Image
        source={pitchBg}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.25)' }]} />

      <ScrollView className="flex-1" contentContainerClassName="pb-16 pt-12">
        <View className="w-full max-w-xl self-center px-5">
          {/* Header */}
          <View className="relative flex-row items-center justify-center py-2">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back to Match Setup"
              accessibilityHint="Returns to team and format selection"
              className="absolute left-0 h-10 w-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
            >
              <ArrowLeft color="#ffffff" size={20} />
            </Pressable>
            <Text className="text-2xl font-bold text-white">Player Setup</Text>
          </View>
          <Text className="mt-1 text-center text-xs font-medium text-emerald-100/90">
            {awayTeam.name} vs {homeTeam.name} ({match.playersPerSide}v{match.playersPerSide})
          </Text>

          {/* Segmented Top Tab Bar: Pitch View and List View (no emojis) */}
          <View className="mt-5 flex-row rounded-2xl bg-black/35 p-1 border border-white/15">
            <Pressable
              onPress={() => setActiveTab('pitch')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'pitch' }}
              accessibilityLabel="Pitch View tab"
              accessibilityHint="Switches to tactical pitch view"
              className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
                activeTab === 'pitch' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-xs ${
                  activeTab === 'pitch'
                    ? 'font-bold text-slate-900'
                    : 'font-semibold text-emerald-100/75'
                }`}
              >
                Pitch View
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('list')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'list' }}
              accessibilityLabel="List View tab"
              accessibilityHint="Switches to squad list view"
              className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
                activeTab === 'list' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-xs ${
                  activeTab === 'list'
                    ? 'font-bold text-slate-900'
                    : 'font-semibold text-emerald-100/75'
                }`}
              >
                List View
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
              selectedPlayer={selectedPlayer}
              onPlayerTap={handlePlayerTap}
              onSlotTap={handleSlotTap}
              onSwapSlots={handleSwapSlots}
              onAssignNext={handleAssignNext}
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
              selectedPlayer={selectedPlayer}
              onPlayerTap={handlePlayerTap}
              onAssignNext={handleAssignNext}
              onAddGuest={handleAddGuest}
            />
          )}

          {/* End-of-page CTA: Continue to Match */}
          <View className="mt-6">
            {!isValid ? (
              <Text className="mb-2 text-center text-xs font-semibold text-emerald-200">
                Assign exactly {match.playersPerSide} starters for each team to continue
              </Text>
            ) : null}

            {setLineups.isError ? (
              <View className="mb-3 rounded-xl border border-red-300/40 bg-red-950/80 p-3">
                <Text className="text-center text-xs font-medium text-red-200">
                  Could not save the lineup — please try again
                  {__DEV__ && setLineups.error instanceof Error
                    ? ` (${setLineups.error.message})`
                    : ''}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleStart}
              disabled={!isValid || setLineups.isPending}
              accessibilityRole="button"
              accessibilityLabel="Continue to Match"
              accessibilityHint="Saves the lineup and proceeds to the match"
              style={{
                shadowColor: isValid ? '#059669' : 'transparent',
                shadowOpacity: isValid ? 0.35 : 0,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: isValid ? 4 : 0,
              }}
              className={`items-center justify-center rounded-2xl py-4 ${
                isValid && !setLineups.isPending
                  ? 'bg-emerald-500 active:bg-emerald-600'
                  : 'bg-white/20'
              }`}
            >
              {setLineups.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className={`text-base font-bold ${isValid ? 'text-white' : 'text-white/40'}`}>
                  Continue to Match →
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

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
    </View>
  );
}
