import ChevronDown from 'lucide-react-native/icons/chevron-down';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import RotateCw from 'lucide-react-native/icons/rotate-cw';
import UserIcon from 'lucide-react-native/icons/user';
import UserPlus from 'lucide-react-native/icons/user-plus';
import X from 'lucide-react-native/icons/x';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { FootballPitch, PitchSide, PitchSlot } from '../pitch/FootballPitch';
import { TeamRosterPlayer } from '../../hooks/useTeams';
import { teamA, teamB } from '../../theme/tokens';

export interface SwapSelection {
  side: PitchSide;
  playerId: string;
  displayName: string;
}

interface LineupPitchViewProps {
  homeTeamName: string;
  awayTeamName: string;
  homeFormation: string;
  awayFormation: string;
  onOpenFormationPicker: (side: PitchSide) => void;
  homePitchSlots: PitchSlot[];
  awayPitchSlots: PitchSlot[];
  homeBench: TeamRosterPlayer[];
  awayBench: TeamRosterPlayer[];
  swapSelection: SwapSelection | null;
  onSelectForSwap: (side: PitchSide, playerId: string, displayName: string) => void;
  onCancelSwap: () => void;
  onSlotTap: (side: PitchSide, slotIndex: number) => void;
  onSwapSlots: (side: PitchSide, fromSlotIndex: number, toSlotIndex: number) => void;
  onAssignNext: (side: PitchSide, slotIndex: number) => void;
  onResetPositions: () => void;
  onToggleLandscape: () => void;
  isLandscape: boolean;
  onAddGuest: (side: PitchSide, displayName: string) => Promise<void>;
}

export function LineupPitchView({
  homeTeamName,
  awayTeamName,
  homeFormation,
  awayFormation,
  onOpenFormationPicker,
  homePitchSlots,
  awayPitchSlots,
  homeBench,
  awayBench,
  swapSelection,
  onSelectForSwap,
  onCancelSwap,
  onSlotTap,
  onSwapSlots,
  onAssignNext,
  onResetPositions,
  onToggleLandscape,
  isLandscape,
  onAddGuest,
}: LineupPitchViewProps) {
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

  function renderBenchTray(side: PitchSide, label: string, bench: TeamRosterPlayer[]) {
    const isHome = side === 'home';
    const accentFill = isHome ? teamA.fill : teamB.fill;
    const isAdding = addingGuestSide === side;

    return (
      <View className="flex-1 rounded-xl border border-gray-200 bg-gray-50/70 p-2.5">
        <View className="flex-row items-center justify-between pb-1.5">
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: accentFill }} />
            <Text className="text-xs font-bold text-black" numberOfLines={1}>
              {label} Bench ({bench.length})
            </Text>
          </View>
        </View>

        {bench.length === 0 ? (
          <Text className="my-2 text-[11px] italic text-gray-400">No substitutes</Text>
        ) : (
          <View className="mt-1 flex-row flex-wrap gap-1.5">
            {bench.map((player) => {
              const isSelected =
                swapSelection?.side === side && swapSelection.playerId === player.id;

              return (
                <Pressable
                  key={player.id}
                  onPress={() => onSelectForSwap(side, player.id, player.displayName)}
                  accessibilityRole="button"
                  accessibilityLabel={`${player.displayName}, bench substitute`}
                  accessibilityHint="Tap to swap with a starter on the pitch"
                  className={`flex-row items-center gap-1 rounded-full border px-2.5 py-1 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-100 shadow-sm'
                      : 'border-gray-300 bg-white active:bg-gray-100'
                  }`}
                >
                  <UserIcon color={isSelected ? '#b45309' : '#4b5563'} size={12} />
                  <Text
                    className={`text-xs font-medium ${
                      isSelected ? 'font-bold text-amber-900' : 'text-black'
                    }`}
                    numberOfLines={1}
                  >
                    {player.displayName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {isAdding ? (
          <View className="mt-2 rounded-lg border border-gray-300 bg-white p-2">
            <TextInput
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Guest player name"
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
            accessibilityLabel={`Add guest to ${label}`}
            accessibilityHint="Opens form to add a guest player"
            className="mt-2 flex-row items-center justify-center rounded-lg border border-dashed border-gray-300 py-1.5 active:bg-white"
          >
            <UserPlus color="#374151" size={13} />
            <Text className="ml-1 text-[11px] font-bold text-gray-700">+ Add Guest</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (isLandscape) {
    return (
      <View className="flex-1 bg-white px-4 pb-6 pt-12">
        <View className="flex-row items-center justify-between gap-2">
          <Pressable
            onPress={onToggleLandscape}
            accessibilityRole="button"
            accessibilityLabel="Exit landscape view"
            accessibilityHint="Returns to portrait orientation"
            className="flex-row items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2"
          >
            <RotateCw color="#000000" size={16} />
            <Text className="text-xs font-bold text-black">Exit Landscape</Text>
          </Pressable>
          <Pressable
            onPress={onResetPositions}
            accessibilityRole="button"
            accessibilityLabel="Reset positions"
            accessibilityHint="Reverts every player to their default position"
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
            onSwap={onSwapSlots}
            onSetGoalkeeper={onSlotTap}
            onAssignNext={onAssignNext}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="mt-3">
      {/* Top pitch toolbar: Landscape + Reset */}
      <View className="mb-3 flex-row gap-2">
        <Pressable
          onPress={onToggleLandscape}
          accessibilityRole="button"
          accessibilityLabel="Landscape view"
          accessibilityHint="Rotates the pitch for more room to arrange players"
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-2 active:bg-gray-100"
        >
          <RotateCw color="#000000" size={15} />
          <Text className="text-xs font-bold text-black">Landscape View</Text>
        </Pressable>
        <Pressable
          onPress={onResetPositions}
          accessibilityRole="button"
          accessibilityLabel="Reset positions"
          accessibilityHint="Reverts every player to their default position"
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-2 active:bg-gray-100"
        >
          <RotateCcw color="#000000" size={15} />
          <Text className="text-xs font-bold text-black">Reset Positions</Text>
        </Pressable>
      </View>

      {/* Formation Dropdowns directly above each half */}
      <View className="mb-2 flex-row items-center justify-between gap-3">
        {/* Team B Dropdown (Left half) */}
        <Pressable
          onPress={() => onOpenFormationPicker('away')}
          accessibilityRole="button"
          accessibilityLabel={`Select formation for Team B. Current: ${awayFormation}`}
          accessibilityHint="Opens tactical formation selector for Team B"
          className="flex-1 flex-row items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 active:bg-blue-100/80"
        >
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: teamB.fill }} />
            <Text className="text-xs font-bold text-blue-950" numberOfLines={1}>
              {awayTeamName}: {awayFormation}
            </Text>
          </View>
          <ChevronDown color="#1d4ed8" size={14} />
        </Pressable>

        {/* Team A Dropdown (Right half) */}
        <Pressable
          onPress={() => onOpenFormationPicker('home')}
          accessibilityRole="button"
          accessibilityLabel={`Select formation for Team A. Current: ${homeFormation}`}
          accessibilityHint="Opens tactical formation selector for Team A"
          className="flex-1 flex-row items-center justify-between rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2 active:bg-orange-100/80"
        >
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: teamA.fill }} />
            <Text className="text-xs font-bold text-orange-950" numberOfLines={1}>
              {homeTeamName}: {homeFormation}
            </Text>
          </View>
          <ChevronDown color="#c2410c" size={14} />
        </Pressable>
      </View>

      {/* Active Swap Guidance Banner */}
      {swapSelection ? (
        <View className="mb-2 flex-row items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
          <Text className="flex-1 text-xs font-semibold text-amber-900" numberOfLines={1}>
            Swapping {swapSelection.displayName}: tap any starter on the pitch or bench substitute
          </Text>
          <Pressable
            onPress={onCancelSwap}
            accessibilityRole="button"
            accessibilityLabel="Cancel swap"
            accessibilityHint="Dismisses player swap selection"
            className="ml-2 rounded-full p-1 active:bg-amber-100"
          >
            <X color="#92400e" size={14} />
          </Pressable>
        </View>
      ) : null}

      {/* Football Pitch */}
      <View>
        <FootballPitch
          homeLabel={homeTeamName}
          awayLabel={awayTeamName}
          homeSlots={homePitchSlots}
          awaySlots={awayPitchSlots}
          onSwap={onSwapSlots}
          onSetGoalkeeper={onSlotTap}
          onAssignNext={onAssignNext}
        />
      </View>

      {/* Dedicated Bench Trays below pitch */}
      <View className="mt-3 flex-row gap-3">
        {renderBenchTray('away', awayTeamName, awayBench)}
        {renderBenchTray('home', homeTeamName, homeBench)}
      </View>
    </View>
  );
}
