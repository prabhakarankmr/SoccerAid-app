import Flag from 'lucide-react-native/icons/flag';
import GoalIcon from 'lucide-react-native/icons/goal';
import Hand from 'lucide-react-native/icons/hand';
import Shield from 'lucide-react-native/icons/shield';
import React from 'react';
import { Text, View } from 'react-native';

import { ScalePressable } from '../ui/ScalePressable';

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
  return (
    <View className="mt-4 w-full">
      <View className="flex-row items-center gap-3">
        {/* Goal Button */}
        <ScalePressable
          onPress={onGoalPress}
          disabled={disabled}
          activeScale={0.94}
          hapticFeedback="medium"
          accessibilityRole="button"
          accessibilityLabel="Record a goal"
          accessibilityHint="Opens options to pick who scored and who assisted"
          className="flex-1"
        >
          <View
            className={`min-h-[72px] w-full items-center justify-center rounded-2xl border-2 border-white bg-slate-900 px-2 py-3.5 shadow-md shadow-black/40 ${
              disabled ? 'opacity-45' : 'active:bg-slate-800'
            }`}
          >
            <View className="mb-1.5 items-center justify-center">
              <GoalIcon color="#ffffff" size={22} strokeWidth={2.2} />
            </View>
            <Text className="text-xs font-bold uppercase tracking-wider text-white">Goal</Text>
          </View>
        </ScalePressable>

        {/* Save Button */}
        <ScalePressable
          onPress={onSavePress}
          disabled={disabled}
          activeScale={0.94}
          hapticFeedback="medium"
          accessibilityRole="button"
          accessibilityLabel="Record a goalkeeper save"
          accessibilityHint="Opens options to pick which goalkeeper made the save"
          className="flex-1"
        >
          <View
            className={`min-h-[72px] w-full items-center justify-center rounded-2xl border-2 border-white bg-slate-900 px-2 py-3.5 shadow-md shadow-black/40 ${
              disabled ? 'opacity-45' : 'active:bg-slate-800'
            }`}
          >
            <View className="mb-1.5 items-center justify-center">
              {saveIcon === 'hand' ? (
                <Hand color="#ffffff" size={22} strokeWidth={2.2} />
              ) : (
                <Shield color="#ffffff" size={22} strokeWidth={2.2} />
              )}
            </View>
            <Text className="text-xs font-bold uppercase tracking-wider text-white">Save</Text>
          </View>
        </ScalePressable>

        {/* Foul Button */}
        <ScalePressable
          onPress={onFoulPress}
          disabled={disabled}
          activeScale={0.94}
          hapticFeedback="medium"
          accessibilityRole="button"
          accessibilityLabel="Record a foul"
          accessibilityHint="Opens options to pick who committed the foul, from either team"
          className="flex-1"
        >
          <View
            className={`min-h-[72px] w-full items-center justify-center rounded-2xl border-2 border-white bg-slate-900 px-2 py-3.5 shadow-md shadow-black/40 ${
              disabled ? 'opacity-45' : 'active:bg-slate-800'
            }`}
          >
            <View className="mb-1.5 items-center justify-center">
              <Flag color="#ffffff" size={22} strokeWidth={2.2} />
            </View>
            <Text className="text-xs font-bold uppercase tracking-wider text-white">Foul</Text>
          </View>
        </ScalePressable>
      </View>

      {isPaused ? (
        <Text className="mt-2.5 text-center text-xs font-medium text-gray-500">
          Paused — resume to record goals, saves or fouls
        </Text>
      ) : null}
    </View>
  );
}
