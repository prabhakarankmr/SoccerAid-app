import UserPlus from 'lucide-react-native/icons/user-plus';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { PitchSide } from '../pitch/FootballPitch';
import { FormationSlot } from '../../hooks/useMeta';
import { TeamRosterPlayer } from '../../hooks/useTeams';
import { teamA, teamB } from '../../theme/tokens';
import { SelectedPlayer } from './LineupPitchView';

type SlotAssignments = Record<number, string | null>;

interface LineupListViewProps {
  homeTeamName: string;
  awayTeamName: string;
  playersPerSide: number;
  homeSlots: FormationSlot[];
  awaySlots: FormationSlot[];
  homeAssignments: SlotAssignments;
  awayAssignments: SlotAssignments;
  homeAvailable: TeamRosterPlayer[];
  awayAvailable: TeamRosterPlayer[];
  homeBench: TeamRosterPlayer[];
  awayBench: TeamRosterPlayer[];
  selectedPlayer: SelectedPlayer | null;
  onPlayerTap: (side: PitchSide, playerId: string) => void;
  onAssignNext: (side: PitchSide, slotIndex: number) => void;
  onAddGuest: (side: PitchSide, displayName: string) => Promise<void>;
}

export function LineupListView({
  homeTeamName,
  awayTeamName,
  playersPerSide,
  homeSlots,
  awaySlots,
  homeAssignments,
  awayAssignments,
  homeAvailable,
  awayAvailable,
  homeBench,
  awayBench,
  selectedPlayer,
  onPlayerTap,
  onAssignNext,
  onAddGuest,
}: LineupListViewProps) {
  const [addingGuestSide, setAddingGuestSide] = useState<PitchSide | null>(null);
  const [guestName, setGuestName] = useState('');
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  async function handleConfirmAddGuest(side: PitchSide) {
    const trimmed = guestName.trim();
    if (!trimmed) return;

    try {
      setIsSubmittingGuest(true);
      setGuestError(null);
      await onAddGuest(side, trimmed);
      setGuestName('');
      setAddingGuestSide(null);
    } catch {
      setGuestError('Could not add guest — try again');
    } finally {
      setIsSubmittingGuest(false);
    }
  }

  function renderTeamColumn(
    side: PitchSide,
    teamName: string,
    slots: FormationSlot[],
    assignments: SlotAssignments,
    available: TeamRosterPlayer[],
    bench: TeamRosterPlayer[],
  ) {
    const isHome = side === 'home';
    const accentFill = isHome ? teamA.fill : teamB.fill;
    const isAdding = addingGuestSide === side;
    const filledStarters = Object.values(assignments).filter((id) => id !== null).length;

    return (
      <View className="flex-1 rounded-2xl border border-white/30 bg-white/95 p-3 shadow-md">
        {/* Column Header */}
        <View className="flex-row items-center justify-between pb-2 border-b border-gray-100">
          <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: accentFill }}>
            <Text className="text-xs font-bold text-white">{teamName}</Text>
          </View>
          <Text className="text-xs font-bold text-black">
            {filledStarters}/{playersPerSide}
          </Text>
        </View>

        {/* TOP SECTION: STARTERS */}
        <View className="mt-1">
          <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Starters ({filledStarters}/{playersPerSide})
          </Text>

          {slots.map((slot, index) => {
            const playerId = assignments[slot.slotIndex];
            const player = playerId ? available.find((p) => p.id === playerId) : null;
            const isSelected =
              selectedPlayer?.side === side && selectedPlayer.playerId === playerId;

            if (!player) {
              return (
                <Pressable
                  key={`empty-${slot.slotIndex}`}
                  onPress={() => onAssignNext(side, slot.slotIndex)}
                  accessibilityRole="button"
                  accessibilityLabel={`Empty slot ${index + 1}, tap to assign`}
                  accessibilityHint="Assigns the next available bench player to this slot"
                  className="mt-1.5 flex-row items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50/80 px-2.5 py-2.5"
                >
                  <View className="flex-row items-center gap-2">
                    <View className="h-5 w-5 items-center justify-center rounded-full bg-gray-200">
                      <Text className="text-[10px] font-bold text-gray-600">{index + 1}</Text>
                    </View>
                    <Text className="text-xs italic text-gray-400">
                      Empty Slot {slot.isGoalkeeper ? '(GK)' : ''}
                    </Text>
                  </View>
                  <Text className="text-[10px] font-bold text-emerald-700">+ Assign</Text>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={player.id}
                onPress={() => onPlayerTap(side, player.id)}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1}. ${player.displayName}${slot.isGoalkeeper ? ', goalkeeper' : ''}${isSelected ? ', selected' : ''}`}
                accessibilityHint={
                  isSelected ? 'Tap to deselect' : 'Tap to swap with another player'
                }
                className={`mt-1.5 flex-row items-center justify-between rounded-xl border px-2.5 py-2.5 ${
                  isSelected
                    ? 'border-2 border-emerald-500/80 bg-emerald-500/10 shadow-sm'
                    : 'border-gray-200 bg-white active:bg-gray-50'
                }`}
              >
                <View className="flex-1 flex-row items-center gap-2 pr-1">
                  <View className="h-5 w-5 items-center justify-center rounded-full bg-gray-100">
                    <Text className="text-[10px] font-bold text-gray-700">{index + 1}</Text>
                  </View>
                  <Text
                    className={`flex-1 text-xs ${
                      isSelected ? 'font-bold text-emerald-950' : 'font-medium text-black'
                    }`}
                    numberOfLines={1}
                  >
                    {player.displayName}
                  </Text>
                </View>

                {slot.isGoalkeeper ? (
                  <View className="rounded-full bg-red-100 px-1.5 py-0.5">
                    <Text className="text-[10px] font-bold text-red-700">GK</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* DISTINCT DIVIDER & NOTICEABLE GAP */}
        <View className="my-5 border-b-2 border-gray-200">
          <View className="absolute -top-2.5 self-center bg-white px-2">
            <Text className="text-[9px] font-bold tracking-widest text-gray-400">
              BENCH / SUBSTITUTES
            </Text>
          </View>
        </View>

        {/* BOTTOM SECTION: BENCH / SUBSTITUTES */}
        <View>
          <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Bench ({bench.length})
          </Text>

          {bench.length === 0 ? (
            <Text className="my-2 text-xs italic text-gray-400">No substitutes on bench</Text>
          ) : (
            bench.map((player) => {
              const isSelected =
                selectedPlayer?.side === side && selectedPlayer.playerId === player.id;

              return (
                <Pressable
                  key={player.id}
                  onPress={() => onPlayerTap(side, player.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${player.displayName}, bench substitute${isSelected ? ', selected' : ''}`}
                  accessibilityHint={isSelected ? 'Tap to deselect' : 'Tap to swap with a starter'}
                  className={`mt-1.5 flex-row items-center justify-between rounded-xl border px-2.5 py-2.5 ${
                    isSelected
                      ? 'border-2 border-emerald-500/80 bg-emerald-500/10 shadow-sm'
                      : 'border-gray-200 bg-white active:bg-gray-50'
                  }`}
                >
                  <View className="flex-1 flex-row items-center gap-2 pr-1">
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: accentFill }}
                    />
                    <Text
                      className={`flex-1 text-xs ${
                        isSelected ? 'font-bold text-emerald-950' : 'font-medium text-black'
                      }`}
                      numberOfLines={1}
                    >
                      {player.displayName}
                    </Text>
                  </View>

                  {player.isGuest ? (
                    <View className="rounded bg-gray-100 px-1.5 py-0.5">
                      <Text className="text-[10px] text-gray-500">Guest</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}

          {/* Add Guest Button / Form */}
          {isAdding ? (
            <View className="mt-2 rounded-lg border border-gray-300 bg-white p-2">
              <TextInput
                value={guestName}
                onChangeText={setGuestName}
                placeholder="Guest name"
                accessibilityLabel="Guest player name"
                accessibilityHint="Enter name for guest player"
                className="rounded border border-gray-200 px-2 py-1 text-xs text-black"
              />
              <View className="mt-2 flex-row gap-1.5">
                <Pressable
                  onPress={() => void handleConfirmAddGuest(side)}
                  disabled={!guestName.trim() || isSubmittingGuest}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm add guest"
                  accessibilityHint="Adds guest to team bench"
                  className={`flex-1 items-center rounded py-1.5 ${
                    guestName.trim() && !isSubmittingGuest ? 'bg-black' : 'bg-gray-300'
                  }`}
                >
                  {isSubmittingGuest ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text className="text-[11px] font-bold text-white">Add</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => {
                    setAddingGuestSide(null);
                    setGuestName('');
                    setGuestError(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel adding guest"
                  accessibilityHint="Closes the guest form"
                  className="flex-1 items-center rounded border border-gray-300 py-1.5"
                >
                  <Text className="text-[11px] font-bold text-black">Cancel</Text>
                </Pressable>
              </View>
              {guestError ? (
                <Text className="mt-1 text-[10px] text-red-600">{guestError}</Text>
              ) : null}
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setAddingGuestSide(side);
                setGuestName('');
                setGuestError(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add guest to ${teamName}`}
              accessibilityHint="Opens form to add a guest player"
              className="mt-2 flex-row items-center justify-center rounded-lg border border-dashed border-gray-300 py-2 active:bg-gray-50"
            >
              <UserPlus color="#000000" size={14} />
              <Text className="ml-1 text-xs font-bold text-black">+ Add Guest</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="mt-4 flex-row gap-3">
      {renderTeamColumn('away', awayTeamName, awaySlots, awayAssignments, awayAvailable, awayBench)}
      {renderTeamColumn('home', homeTeamName, homeSlots, homeAssignments, homeAvailable, homeBench)}
    </View>
  );
}
