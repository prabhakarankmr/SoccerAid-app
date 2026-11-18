import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { MatchSummary, useMatchesList } from '../../src/hooks/useMatches';

type Segment = 'live' | 'ended';

function MatchListItem({ match, segment }: { match: MatchSummary; segment: Segment }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/match/[id]/live', params: { id: match.id } })}
      accessibilityLabel={`${match.homeTeam.name} ${String(match.homeScore)} - ${String(match.awayScore)} ${match.awayTeam.name}`}
      accessibilityHint={
        segment === 'live' ? 'Opens this match to watch live' : 'Opens this match’s result'
      }
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
        {segment === 'live' ? (
          <View className="rounded-full bg-red-100 px-2 py-0.5">
            <Text className="text-[10px] font-bold uppercase tracking-wide text-red-700">
              ● Live
            </Text>
          </View>
        ) : (
          <View className="rounded-full bg-gray-100 px-2 py-0.5">
            <Text className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
              Full-Time
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function Matches() {
  const [segment, setSegment] = useState<Segment>('live');
  const matchesQuery = useMatchesList(segment === 'live' ? 'LIVE' : 'FULL_TIME');
  const matches = matchesQuery.data ?? [];

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 pb-32 pt-20">
      <Text className="text-2xl font-bold text-black">Matches</Text>
      <Text className="mt-1 text-black">
        {segment === 'live'
          ? 'Live matches from every team — watch any of them.'
          : 'Matches that have finished.'}
      </Text>

      <View className="mt-4 flex-row rounded-lg border border-gray-300 bg-gray-100 p-1">
        <Pressable
          onPress={() => setSegment('live')}
          accessibilityLabel="Live Matches"
          accessibilityHint="Shows matches currently in progress"
          className={`flex-1 items-center rounded-md py-2 ${segment === 'live' ? 'bg-white' : ''}`}
        >
          <Text className="font-bold text-black">Live</Text>
        </Pressable>
        <Pressable
          onPress={() => setSegment('ended')}
          accessibilityLabel="Ended Matches"
          accessibilityHint="Shows matches that have finished"
          className={`flex-1 items-center rounded-md py-2 ${segment === 'ended' ? 'bg-white' : ''}`}
        >
          <Text className="font-bold text-black">Ended</Text>
        </Pressable>
      </View>

      {matchesQuery.isLoading ? (
        <ActivityIndicator className="mt-8" color="#000000" />
      ) : matches.length === 0 ? (
        <Text className="mt-8 text-center text-black">
          {segment === 'live'
            ? 'No matches are live right now — check back later.'
            : 'No matches have ended yet.'}
        </Text>
      ) : (
        matches.map((match) => <MatchListItem key={match.id} match={match} segment={segment} />)
      )}
    </ScrollView>
  );
}
