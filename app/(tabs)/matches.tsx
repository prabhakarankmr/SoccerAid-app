import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { MatchSummary, useMatchesList } from '../../src/hooks/useMatches';

function MatchListItem({ match }: { match: MatchSummary }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/match/[id]/live', params: { id: match.id } })}
      accessibilityLabel={`${match.homeTeam.name} ${String(match.homeScore)} - ${String(match.awayScore)} ${match.awayTeam.name}`}
      accessibilityHint="Opens this match to watch live"
      className="mt-3 rounded-lg border border-gray-300 bg-white p-4"
    >
      <View className="flex-row items-center">
        <Text className="flex-1 text-sm font-bold text-black" numberOfLines={1}>
          {match.homeTeam.name}
        </Text>
        <View className="flex-row items-center gap-2 px-3">
          <Text className="text-xl font-bold text-black">{match.homeScore}</Text>
          <Text className="text-sm font-bold text-gray-400">-</Text>
          <Text className="text-xl font-bold text-black">{match.awayScore}</Text>
        </View>
        <Text className="flex-1 text-right text-sm font-bold text-black" numberOfLines={1}>
          {match.awayTeam.name}
        </Text>
        <ChevronRight color="#9ca3af" size={20} />
      </View>
      <View className="mt-2 flex-row items-center justify-center">
        <View className="rounded-full bg-red-100 px-2 py-0.5">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-red-700">● Live</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function Matches() {
  const liveMatches = useMatchesList('LIVE');
  const matches = liveMatches.data ?? [];

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 pb-32 pt-20">
      <Text className="text-2xl font-bold text-black">Matches</Text>
      <Text className="mt-1 text-black">Live matches from every team — watch any of them.</Text>

      {liveMatches.isLoading ? (
        <ActivityIndicator className="mt-8" color="#000000" />
      ) : matches.length === 0 ? (
        <Text className="mt-8 text-center text-black">
          No matches are live right now — check back later.
        </Text>
      ) : (
        matches.map((match) => <MatchListItem key={match.id} match={match} />)
      )}
    </ScrollView>
  );
}
