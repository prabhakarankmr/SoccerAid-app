import ChevronDown from 'lucide-react-native/icons/chevron-down';
import UserPlus from 'lucide-react-native/icons/user-plus';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { FootballPitch, PitchSide, PitchSlot } from '../pitch/FootballPitch';
import { TeamRosterPlayer } from '../../hooks/useTeams';
import { teamA, teamB } from '../../theme/tokens';

export interface SelectedPlayer {
  side: PitchSide;
  playerId: string;
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
  selectedPlayer: SelectedPlayer | null;
  onPlayerTap: (side: PitchSide, playerId: string) => void;
  onSlotTap: (side: PitchSide, slotIndex: number) => void;
  onSwapSlots: (side: PitchSide, fromSlotIndex: number, toSlotIndex: number) => void;
  onAssignNext: (side: PitchSide, slotIndex: number) => void;
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
  selectedPlayer,
  onPlayerTap,
  onSlotTap,
  onSwapSlots,
  onAssignNext,
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
      <View className="flex-1 rounded-2xl border border-white/30 bg-white/95 p-3 shadow-md">
        <View className="flex-row items-center justify-between pb-2 border-b border-gray-100">
          <View className="flex-row items-center gap-1.5">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentFill }} />
            <Text className="text-xs font-bold text-black" numberOfLines={1}>
              {label} Bench ({bench.length})
            </Text>
          </View>
        </View>

        {bench.length === 0 ? (
          <Text className="my-3 text-center text-[11px] italic text-gray-400">No substitutes</Text>
        ) : (
          <View className="mt-2 flex-col gap-1.5">
            {bench.map((player) => {
              const isSelected =
                selectedPlayer?.side === side && selectedPlayer.playerId === player.id;

              return (
                <Pressable
                  key={player.id}
                  onPress={() => onPlayerTap(side, player.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${player.displayName}, substitute${isSelected ? ', selected' : ''}`}
                  accessibilityHint={
                    isSelected ? 'Tap to deselect' : 'Tap to swap with another player'
                  }
                  className={`flex-row items-center justify-between rounded-xl border px-3 py-2 ${
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
                      className={`text-xs ${
                        isSelected ? 'font-bold text-emerald-950' : 'font-medium text-slate-800'
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

  return (
    <View className="mt-4">
      {/* Formation Dropdowns directly above each half */}
      <View className="mb-2 flex-row items-center justify-between gap-3">
        {/* Team B Dropdown (Left half) */}
        <Pressable
          onPress={() => onOpenFormationPicker('away')}
          accessibilityRole="button"
          accessibilityLabel={`Select formation for Team B. Current: ${awayFormation}`}
          accessibilityHint="Opens tactical formation selector for Team B"
          className="flex-1 flex-row items-center justify-between rounded-xl border border-blue-200 bg-white/95 px-3 py-2.5 shadow-sm active:bg-white"
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
          className="flex-1 flex-row items-center justify-between rounded-xl border border-orange-200 bg-white/95 px-3 py-2.5 shadow-sm active:bg-white"
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

      {/* Football Pitch */}
      <View>
        <FootballPitch
          homeLabel={homeTeamName}
          awayLabel={awayTeamName}
          homeSlots={homePitchSlots}
          awaySlots={awayPitchSlots}
          selectedPlayerId={selectedPlayer?.playerId ?? null}
          onSwap={onSwapSlots}
          onSlotTap={onSlotTap}
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
