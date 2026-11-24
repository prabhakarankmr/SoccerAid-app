import Clock from 'lucide-react-native/icons/clock';
import { useEffect, useRef } from 'react';
import { Image, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { MatchPeriod } from '../../hooks/useMatches';
import { formatClock } from '../../utils/format';

export interface ScoreboardProps {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  period?: MatchPeriod | null;
  elapsedSec?: number;
  halfLimitSec?: number;
  addedTimeSec?: number;
  timeUp?: boolean;
  showClockHud?: boolean;
}

function AnimatedScoreDigit({ score }: { score: number }) {
  const scale = useSharedValue(1);
  const prevScore = useRef(score);

  useEffect(() => {
    if (score !== prevScore.current) {
      prevScore.current = score;
      scale.value = withSequence(
        withSpring(1.3, { duration: 250, dampingRatio: 0.6 }),
        withSpring(1, { duration: 300, dampingRatio: 0.8 }),
      );
    }
  }, [score, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text className="font-mono text-3xl font-black text-white">{score}</Text>
    </Animated.View>
  );
}

function periodBadgeText(period: MatchPeriod | null | undefined): string {
  switch (period) {
    case 'FIRST_HALF':
      return '1ST HALF';
    case 'HALF_TIME':
      return 'HALF TIME';
    case 'SECOND_HALF':
      return '2ND HALF';
    case 'FULL_TIME':
      return 'FULL TIME';
    default:
      return 'LIVE';
  }
}

export function Scoreboard({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  homeLogoUrl,
  awayLogoUrl,
  period,
  elapsedSec = 0,
  halfLimitSec = 0,
  addedTimeSec = 0,
  timeUp = false,
  showClockHud = true,
}: ScoreboardProps) {
  const homeInitial = homeTeamName.trim().charAt(0).toUpperCase() || 'H';
  const awayInitial = awayTeamName.trim().charAt(0).toUpperCase() || 'A';

  return (
    <View
      style={{
        shadowColor: '#0f172a',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
      className="rounded-2xl border border-gray-200/90 bg-white p-4"
    >
      {/* Broadcast Score Bug Row */}
      <View className="flex-row items-center justify-between">
        {/* Home Team (Team A - Orange Accent) */}
        <View className="flex-1 items-center px-1">
          <View className="h-11 w-11 items-center justify-center rounded-full border-2 border-orange-400 bg-orange-50">
            {homeLogoUrl ? (
              <Image
                source={{ uri: homeLogoUrl }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Text className="text-base font-bold text-orange-700">{homeInitial}</Text>
            )}
          </View>
          <Text className="mt-1 text-[10px] font-bold uppercase tracking-wider text-orange-600">
            Home
          </Text>
          <Text
            className="mt-0.5 text-center text-xs font-bold text-slate-900"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {homeTeamName}
          </Text>
        </View>

        {/* Digital Scoreboard Box */}
        <View className="mx-2 items-center justify-center">
          <View className="flex-row items-center rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 shadow-sm">
            <AnimatedScoreDigit score={homeScore} />
            <Text className="mx-2.5 text-xl font-bold text-slate-400">-</Text>
            <AnimatedScoreDigit score={awayScore} />
          </View>
        </View>

        {/* Away Team (Team B - Blue Accent) */}
        <View className="flex-1 items-center px-1">
          <View className="h-11 w-11 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-50">
            {awayLogoUrl ? (
              <Image
                source={{ uri: awayLogoUrl }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Text className="text-base font-bold text-blue-700">{awayInitial}</Text>
            )}
          </View>
          <Text className="mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
            Away
          </Text>
          <Text
            className="mt-0.5 text-center text-xs font-bold text-slate-900"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {awayTeamName}
          </Text>
        </View>
      </View>

      {/* Clock Timer HUD */}
      {showClockHud ? (
        <View className="mt-3 border-t border-gray-100 pt-3">
          <View className="flex-row items-center justify-center gap-1.5">
            <Clock color="#0f172a" size={15} />
            <Text className="font-mono text-base font-bold text-slate-900">
              {formatClock(elapsedSec)}
            </Text>
            <Text className="font-mono text-sm font-semibold text-gray-500">
              / {formatClock(halfLimitSec)}
            </Text>
            <View className="ml-1 rounded bg-slate-100 px-2 py-0.5">
              <Text className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                {periodBadgeText(period)}
              </Text>
            </View>
            {addedTimeSec > 0 ? (
              <View className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5">
                <Text className="text-[11px] font-bold text-emerald-700">
                  +{Math.round(addedTimeSec / 60)} min
                </Text>
              </View>
            ) : null}
          </View>

          {timeUp ? (
            <Text className="mt-2 text-center text-xs font-bold text-red-600">
              Time&apos;s up — end {period === 'FIRST_HALF' ? 'the first half' : 'the match'} when
              ready
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
