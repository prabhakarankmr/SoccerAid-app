import * as Haptics from 'expo-haptics';
import Flag from 'lucide-react-native/icons/flag';
import GoalIcon from 'lucide-react-native/icons/goal';
import Hand from 'lucide-react-native/icons/hand';
import Shield from 'lucide-react-native/icons/shield';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export interface MatchActionBarProps {
  onGoalPress: () => void;
  onSavePress: () => void;
  onFoulPress: () => void;
  disabled?: boolean;
  isPaused?: boolean;
  saveIcon?: 'shield' | 'hand';
}

export function MatchActionBar({
  onGoalPress,
  onSavePress,
  onFoulPress,
  disabled = false,
  isPaused = false,
  saveIcon = 'shield',
}: MatchActionBarProps) {
  const triggerHaptic = () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Graceful fallback on web or unsupported devices
    }
  };

  const handleGoal = () => {
    if (disabled) return;
    triggerHaptic();
    onGoalPress();
  };

  const handleSave = () => {
    if (disabled) return;
    triggerHaptic();
    onSavePress();
  };

  const handleFoul = () => {
    if (disabled) return;
    triggerHaptic();
    onFoulPress();
  };

  return (
    <View className="mt-4 w-full">
      <View className="flex-row items-center gap-3">
        {/* Goal Button */}
        <Pressable
          onPress={handleGoal}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Record a goal"
          accessibilityHint="Opens options to pick who scored and who assisted"
          accessibilityState={{ disabled }}
          style={({ pressed }) => [
            {
              transform: [{ scale: pressed && !disabled ? 0.94 : 1 }],
              opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
          className="min-h-[72px] flex-1 items-center justify-center rounded-2xl border-2 border-white bg-slate-900 px-2 py-3.5 shadow-md shadow-black/40 active:bg-slate-800"
        >
          <View className="mb-1.5 items-center justify-center">
            <GoalIcon color="#ffffff" size={22} strokeWidth={2.2} />
          </View>
          <Text className="text-xs font-bold uppercase tracking-wider text-white">Goal</Text>
        </Pressable>

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Record a goalkeeper save"
          accessibilityHint="Opens options to pick which goalkeeper made the save"
          accessibilityState={{ disabled }}
          style={({ pressed }) => [
            {
              transform: [{ scale: pressed && !disabled ? 0.94 : 1 }],
              opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
          className="min-h-[72px] flex-1 items-center justify-center rounded-2xl border-2 border-white bg-slate-900 px-2 py-3.5 shadow-md shadow-black/40 active:bg-slate-800"
        >
          <View className="mb-1.5 items-center justify-center">
            {saveIcon === 'hand' ? (
              <Hand color="#ffffff" size={22} strokeWidth={2.2} />
            ) : (
              <Shield color="#ffffff" size={22} strokeWidth={2.2} />
            )}
          </View>
          <Text className="text-xs font-bold uppercase tracking-wider text-white">Save</Text>
        </Pressable>

        {/* Foul Button */}
        <Pressable
          onPress={handleFoul}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Record a foul"
          accessibilityHint="Opens options to pick who committed the foul, from either team"
          accessibilityState={{ disabled }}
          style={({ pressed }) => [
            {
              transform: [{ scale: pressed && !disabled ? 0.94 : 1 }],
              opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
          className="min-h-[72px] flex-1 items-center justify-center rounded-2xl border-2 border-white bg-slate-900 px-2 py-3.5 shadow-md shadow-black/40 active:bg-slate-800"
        >
          <View className="mb-1.5 items-center justify-center">
            <Flag color="#ffffff" size={22} strokeWidth={2.2} />
          </View>
          <Text className="text-xs font-bold uppercase tracking-wider text-white">Foul</Text>
        </Pressable>
      </View>

      {isPaused ? (
        <Text className="mt-2.5 text-center text-xs font-medium text-gray-500">
          Paused — resume to record goals, saves or fouls
        </Text>
      ) : null}
    </View>
  );
}
