import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Eye from 'lucide-react-native/icons/eye';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import Plus from 'lucide-react-native/icons/plus';
import Square from 'lucide-react-native/icons/square';
import { ActivityIndicator, Text, View } from 'react-native';

import { MatchPeriod } from '../../hooks/useMatches';
import { ScalePressable } from '../ui/ScalePressable';

export interface MatchControlsProps {
  period: MatchPeriod | null | undefined;
  isPaused: boolean;
  canScore: boolean;
  isPausePending?: boolean;
  isResumePending?: boolean;
  isEndFirstHalfPending?: boolean;
  isEndMatchPending?: boolean;
  isAddTimePending?: boolean;
  onTogglePause: () => void;
  onEndFirstHalf: () => void;
  onEndMatch: () => void;
  onAddTime: (seconds: number) => void;
}

const ADD_TIME_PRESETS_MIN = [1, 2, 5];

export function MatchControls({
  period,
  isPaused,
  canScore,
  isPausePending = false,
  isResumePending = false,
  isEndFirstHalfPending = false,
  isEndMatchPending = false,
  isAddTimePending = false,
  onTogglePause,
  onEndFirstHalf,
  onEndMatch,
  onAddTime,
}: MatchControlsProps) {
  if (!canScore) {
    return (
      <View className="mt-3 flex-row items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 py-3">
        <Eye color="#6b7280" size={16} />
        <Text className="text-xs font-bold text-gray-500">
          Spectating — you&apos;re viewing this match
        </Text>
      </View>
    );
  }

  const isTogglePending = isPausePending || isResumePending;
  const isFirstHalf = period === 'FIRST_HALF';

  return (
    <View className="mt-3">
      {/* Option 1 Side-by-Side Controls */}
      <View className="flex-row items-center gap-2">
        {/* Button 1: Pause / Resume (Subtle Gray) */}
        <ScalePressable
          onPress={onTogglePause}
          disabled={isTogglePending}
          activeScale={0.96}
          hapticFeedback="light"
          accessibilityRole="button"
          accessibilityLabel={isPaused ? 'Resume match' : 'Pause match'}
          accessibilityHint={isPaused ? 'Resumes the match clock' : 'Pauses the match clock'}
          className="flex-1"
        >
          <View className="flex-row items-center justify-center gap-2 rounded-xl border border-gray-300 bg-gray-100/90 py-3 active:bg-gray-200">
            {isTogglePending ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : isPaused ? (
              <>
                <Play color="#000000" size={16} />
                <Text className="text-sm font-bold text-black">Resume</Text>
              </>
            ) : (
              <>
                <Pause color="#000000" size={16} />
                <Text className="text-sm font-bold text-black">Pause</Text>
              </>
            )}
          </View>
        </ScalePressable>

        {/* Button 2: End 1st Half (Prominent) or End Match (Red Button in Main View) */}
        {isFirstHalf ? (
          <ScalePressable
            onPress={onEndFirstHalf}
            disabled={isEndFirstHalfPending}
            activeScale={0.96}
            hapticFeedback="light"
            accessibilityRole="button"
            accessibilityLabel="End 1st Half"
            accessibilityHint="Ends the first half and transitions to half-time"
            className="flex-1"
          >
            <View className="flex-row items-center justify-center gap-2 rounded-xl bg-black py-3 active:bg-slate-800">
              {isEndFirstHalfPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text className="text-sm font-bold text-white">End 1st Half</Text>
                  <ChevronRight color="#ffffff" size={16} />
                </>
              )}
            </View>
          </ScalePressable>
        ) : (
          <ScalePressable
            onPress={onEndMatch}
            disabled={isEndMatchPending}
            activeScale={0.96}
            hapticFeedback="medium"
            accessibilityRole="button"
            accessibilityLabel="End Match"
            accessibilityHint="Ends the match and finalizes score"
            className="flex-1"
          >
            <View className="flex-row items-center justify-center gap-2 rounded-xl bg-red-600 py-3 active:bg-red-700">
              {isEndMatchPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Square color="#ffffff" size={14} fill="#ffffff" />
                  <Text className="text-sm font-bold text-white">End Match</Text>
                </>
              )}
            </View>
          </ScalePressable>
        )}
      </View>

      {/* Stoppage Time Pills */}
      <View className="mt-2.5 flex-row items-center justify-center gap-2">
        <Text className="text-xs font-semibold text-gray-500">Add Time:</Text>
        {ADD_TIME_PRESETS_MIN.map((minutes) => (
          <ScalePressable
            key={minutes}
            onPress={() => onAddTime(minutes * 60)}
            disabled={isAddTimePending}
            activeScale={0.92}
            hapticFeedback="selection"
            accessibilityRole="button"
            accessibilityLabel={`Add ${minutes} minute${minutes > 1 ? 's' : ''}`}
            accessibilityHint="Adds stoppage time to this half"
          >
            <View className="flex-row items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1.5 active:bg-gray-100">
              <Plus color="#000000" size={12} />
              <Text className="text-xs font-bold text-black">+{minutes} min</Text>
            </View>
          </ScalePressable>
        ))}
      </View>
    </View>
  );
}
