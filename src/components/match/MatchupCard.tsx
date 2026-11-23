import Plus from 'lucide-react-native/icons/plus';
import { Image, Pressable, Text, View } from 'react-native';

import { TeamSummary } from '../../hooks/useTeams';

interface MatchupCardProps {
  homeTeam: TeamSummary | null;
  awayTeam: TeamSummary | null;
  onSelectHome: () => void;
  onSelectAway: () => void;
}

export function MatchupCard({ homeTeam, awayTeam, onSelectHome, onSelectAway }: MatchupCardProps) {
  const isDuplicate = Boolean(homeTeam && awayTeam && homeTeam.id === awayTeam.id);

  return (
    <View
      style={{
        shadowColor: '#0f172a',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
      }}
      className="rounded-2xl border border-white/20 bg-white/95 p-5"
    >
      <View className="flex-row items-center justify-between">
        {/* Team A (Home) */}
        <Pressable
          onPress={onSelectHome}
          accessibilityRole="button"
          accessibilityLabel={homeTeam ? `Team A: ${homeTeam.name}` : 'Select Team A'}
          accessibilityHint="Opens team picker to choose Team A"
          className="flex-1 items-center active:opacity-75"
        >
          <View
            style={{ width: 60, height: 60 }}
            className={`items-center justify-center rounded-full ${
              homeTeam
                ? 'border-2 border-orange-400 bg-orange-50'
                : 'border-2 border-dashed border-slate-300 bg-slate-100'
            }`}
          >
            {homeTeam?.logoUrl ? (
              <Image
                source={{ uri: homeTeam.logoUrl }}
                style={{ width: 56, height: 56, borderRadius: 28 }}
                accessibilityIgnoresInvertColors
              />
            ) : homeTeam ? (
              <Text className="text-xl font-bold text-orange-700">
                {homeTeam.name.trim().charAt(0).toUpperCase() || '?'}
              </Text>
            ) : (
              <Plus color="#94a3b8" size={24} />
            )}
          </View>
          <Text className="mt-2 text-[11px] font-bold uppercase tracking-wider text-orange-700">
            Team A
          </Text>
          <Text className="mt-0.5 text-center text-sm font-bold text-slate-900" numberOfLines={1}>
            {homeTeam ? homeTeam.name : 'Select Team A'}
          </Text>
          <Text className="text-[11px] font-semibold text-emerald-600">
            {homeTeam ? 'Change' : 'Tap to pick'}
          </Text>
        </Pressable>

        {/* VS Badge */}
        <View className="mx-2 items-center justify-center">
          <View
            style={{
              shadowColor: '#000000',
              shadowOpacity: 0.2,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
            }}
            className="h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-900"
          >
            <Text className="text-xs font-black tracking-widest text-white">VS</Text>
          </View>
        </View>

        {/* Team B (Away) */}
        <Pressable
          onPress={onSelectAway}
          accessibilityRole="button"
          accessibilityLabel={awayTeam ? `Team B: ${awayTeam.name}` : 'Select Team B'}
          accessibilityHint="Opens team picker to choose Team B"
          className="flex-1 items-center active:opacity-75"
        >
          <View
            style={{ width: 60, height: 60 }}
            className={`items-center justify-center rounded-full ${
              awayTeam
                ? 'border-2 border-blue-400 bg-blue-50'
                : 'border-2 border-dashed border-slate-300 bg-slate-100'
            }`}
          >
            {awayTeam?.logoUrl ? (
              <Image
                source={{ uri: awayTeam.logoUrl }}
                style={{ width: 56, height: 56, borderRadius: 28 }}
                accessibilityIgnoresInvertColors
              />
            ) : awayTeam ? (
              <Text className="text-xl font-bold text-blue-700">
                {awayTeam.name.trim().charAt(0).toUpperCase() || '?'}
              </Text>
            ) : (
              <Plus color="#94a3b8" size={24} />
            )}
          </View>
          <Text className="mt-2 text-[11px] font-bold uppercase tracking-wider text-blue-700">
            Team B
          </Text>
          <Text className="mt-0.5 text-center text-sm font-bold text-slate-900" numberOfLines={1}>
            {awayTeam ? awayTeam.name : 'Select Team B'}
          </Text>
          <Text className="text-[11px] font-semibold text-emerald-600">
            {awayTeam ? 'Change' : 'Tap to pick'}
          </Text>
        </Pressable>
      </View>

      {isDuplicate ? (
        <View className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5">
          <Text className="text-center text-xs font-semibold text-red-700">
            Team A and Team B must be different teams.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
