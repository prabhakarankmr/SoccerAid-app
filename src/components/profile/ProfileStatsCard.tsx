import { ActivityIndicator, Text, View } from 'react-native';

import { PlayerStats } from '../../hooks/usePlayers';

interface ProfileStatsCardProps {
  stats: PlayerStats | undefined;
  isLoading: boolean;
}

/**
 * Unified elevated white card displaying a player's career stats:
 * Hero "Matches Played" row on top + symmetrical 2x2 grid (Goals, Assists / Saves, Fouls).
 */
export function ProfileStatsCard({ stats, isLoading }: ProfileStatsCardProps) {
  return (
    <View className="mt-6">
      <Text className="text-base font-bold text-white">My Stats</Text>
      <View className="mt-2.5 overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-sm">
        {isLoading ? (
          <View className="py-8">
            <ActivityIndicator color="#0f172a" />
          </View>
        ) : (
          <>
            {/* Hero Stat: Matches Played */}
            <View className="flex-row items-baseline justify-center gap-2 border-b border-slate-200 bg-slate-50/70 py-4">
              <Text className="text-3xl font-black text-slate-900">
                {stats?.matchesPlayed ?? 0}
              </Text>
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Matches Played
              </Text>
            </View>

            {/* Symmetrical 2x2 Grid */}
            <View className="flex-row border-b border-slate-200">
              <View className="flex-1 items-center border-r border-slate-200 py-4">
                <Text className="text-2xl font-black text-slate-900">{stats?.goals ?? 0}</Text>
                <Text className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Goals
                </Text>
              </View>
              <View className="flex-1 items-center py-4">
                <Text className="text-2xl font-black text-slate-900">{stats?.assists ?? 0}</Text>
                <Text className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Assists
                </Text>
              </View>
            </View>

            <View className="flex-row">
              <View className="flex-1 items-center border-r border-slate-200 py-4">
                <Text className="text-2xl font-black text-slate-900">{stats?.saves ?? 0}</Text>
                <Text className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Saves
                </Text>
              </View>
              <View className="flex-1 items-center py-4">
                <Text className="text-2xl font-black text-slate-900">{stats?.fouls ?? 0}</Text>
                <Text className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Fouls
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
