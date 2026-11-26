import { Image, Pressable, Text, View } from 'react-native';

import { MatchSummary } from '../../hooks/useMatches';

interface MatchFixtureCardProps {
  match: MatchSummary;
  segment: 'live' | 'ended';
  onPress: () => void;
}

/**
 * Broadcast-style fixture card for the Matches tab: floating top status pill,
 * Team A (orange) & Team B (blue) crests, and centered scoreboard.
 */
export function MatchFixtureCard({ match, segment, onPress }: MatchFixtureCardProps) {
  const isLive = segment === 'live';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${match.homeTeam.name} ${String(match.homeScore)} - ${String(match.awayScore)} ${match.awayTeam.name}`}
      accessibilityHint={isLive ? 'Opens this match to watch live' : 'Opens this match’s result'}
      className="mt-5 rounded-2xl border border-white/20 bg-white/95 px-4 pb-4 pt-5 shadow-sm active:opacity-85"
    >
      {/* Floating top-center status pill */}
      <View className="-mt-8 mb-2 flex-row items-center self-center rounded-full bg-slate-900 px-3 py-1 shadow-sm">
        {isLive ? (
          <>
            <View className="mr-1.5 h-2 w-2 rounded-full bg-red-500" />
            <Text className="text-[10px] font-bold uppercase tracking-wider text-white">Live</Text>
          </>
        ) : (
          <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-200">
            Full-Time
          </Text>
        )}
      </View>

      <View className="flex-row items-center justify-between">
        {/* Team A (Home) */}
        <View className="flex-1 items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full border-2 border-orange-400 bg-orange-50">
            {match.homeTeam.logoUrl ? (
              <Image
                source={{ uri: match.homeTeam.logoUrl }}
                style={{ width: 44, height: 44, borderRadius: 22 }}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Text className="text-base font-bold text-orange-700">
                {match.homeTeam.name.trim().charAt(0).toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <Text className="mt-1.5 text-center text-xs font-bold text-slate-900" numberOfLines={1}>
            {match.homeTeam.name}
          </Text>
        </View>

        {/* Center Score */}
        <View className="items-center px-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl font-black text-slate-900">{match.homeScore}</Text>
            <Text className="text-base font-bold text-slate-400">-</Text>
            <Text className="text-2xl font-black text-slate-900">{match.awayScore}</Text>
          </View>
          <Text className="mt-0.5 text-[11px] font-semibold text-slate-400">
            {match.playersPerSide}v{match.playersPerSide}
          </Text>
        </View>

        {/* Team B (Away) */}
        <View className="flex-1 items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-50">
            {match.awayTeam.logoUrl ? (
              <Image
                source={{ uri: match.awayTeam.logoUrl }}
                style={{ width: 44, height: 44, borderRadius: 22 }}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Text className="text-base font-bold text-blue-700">
                {match.awayTeam.name.trim().charAt(0).toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <Text className="mt-1.5 text-center text-xs font-bold text-slate-900" numberOfLines={1}>
            {match.awayTeam.name}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
