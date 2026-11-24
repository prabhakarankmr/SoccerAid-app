import Shield from 'lucide-react-native/icons/shield';
import User from 'lucide-react-native/icons/user';
import X from 'lucide-react-native/icons/x';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Side } from '../../hooks/useMatches';
import { StarterOption } from './GoalFlowSheet';

export interface PlayerEventSheetProps {
  visible: boolean;
  disabled?: boolean;
  title: string;
  subtitle?: string;
  eventKind: 'save' | 'foul';
  homeTeamName: string;
  awayTeamName: string;
  options: StarterOption[];
  onSelect: (option: StarterOption) => void;
  onCancel: () => void;
}

export function PlayerEventSheet({
  visible,
  disabled = false,
  title,
  subtitle,
  eventKind,
  homeTeamName,
  awayTeamName,
  options,
  onSelect,
  onCancel,
}: PlayerEventSheetProps) {
  const [activeSide, setActiveSide] = useState<Side>('HOME');

  const filteredOptions =
    eventKind === 'foul' ? options.filter((opt) => opt.side === activeSide) : options;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        accessibilityLabel="Close sheet"
        accessibilityHint="Dismisses the player selection sheet"
        className="flex-1 justify-end bg-black/60"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessible={false}
          className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-3 shadow-2xl"
        >
          {/* Drag Handle Indicator */}
          <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-gray-300" />

          {/* Header Bar */}
          <View className="flex-row items-center justify-between pb-2">
            <View>
              <Text className="text-xl font-bold text-slate-900">{title}</Text>
              {subtitle ? <Text className="mt-0.5 text-xs text-slate-500">{subtitle}</Text> : null}
            </View>
            <Pressable
              onPress={onCancel}
              accessibilityLabel="Close"
              accessibilityHint="Closes without recording"
              className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            >
              <X color="#64748b" size={18} />
            </Pressable>
          </View>

          {/* Team Filter Tabs for Fouls */}
          {eventKind === 'foul' ? (
            <View className="my-2.5 flex-row gap-2">
              <Pressable
                onPress={() => setActiveSide('HOME')}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${homeTeamName}`}
                accessibilityHint="Shows players for home team"
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 py-2.5 ${
                  activeSide === 'HOME'
                    ? 'border-orange-500 bg-orange-50 shadow-sm'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className="h-3 w-3 rounded-full bg-orange-500" />
                <Text
                  numberOfLines={1}
                  className={`text-sm font-bold ${
                    activeSide === 'HOME' ? 'text-orange-900' : 'text-gray-600'
                  }`}
                >
                  {homeTeamName}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveSide('AWAY')}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${awayTeamName}`}
                accessibilityHint="Shows players for away team"
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 py-2.5 ${
                  activeSide === 'AWAY'
                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className="h-3 w-3 rounded-full bg-blue-600" />
                <Text
                  numberOfLines={1}
                  className={`text-sm font-bold ${
                    activeSide === 'AWAY' ? 'text-blue-900' : 'text-gray-600'
                  }`}
                >
                  {awayTeamName}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Player Cards */}
          <ScrollView className="mt-2 max-h-80" showsVerticalScrollIndicator={false}>
            {filteredOptions.length === 0 ? (
              <View className="py-6 items-center">
                <Text className="text-sm text-gray-500">No eligible players found.</Text>
              </View>
            ) : (
              filteredOptions.map((player) => {
                const playerIsHome = player.side === 'HOME';
                const teamName = playerIsHome ? homeTeamName : awayTeamName;

                return (
                  <Pressable
                    key={player.playerId}
                    onPress={() => onSelect(player)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`${player.displayName} (${teamName})`}
                    accessibilityHint="Records event for this player"
                    className="mb-2.5 flex-row items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm active:bg-gray-50"
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-full border ${
                          playerIsHome
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-blue-400 bg-blue-50'
                        }`}
                      >
                        {player.isGoalkeeper ? (
                          <Shield color={playerIsHome ? '#ea580c' : '#2563eb'} size={18} />
                        ) : (
                          <User color={playerIsHome ? '#ea580c' : '#2563eb'} size={18} />
                        )}
                      </View>
                      <View>
                        <Text className="text-base font-bold text-slate-900">
                          {player.displayName}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {teamName} • {player.isGoalkeeper ? 'Goalkeeper (GK)' : 'Outfield'}
                        </Text>
                      </View>
                    </View>
                    <View className="rounded-lg bg-gray-100 px-3 py-1">
                      <Text className="text-xs font-bold text-slate-700">Select</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
