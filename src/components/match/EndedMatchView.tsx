import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MatchStatus } from '../../hooks/useMatches';
import { Toast, useToast } from '../ui/Toast';

export const FINISHED_MATCH_STATUSES: readonly MatchStatus[] = [
  'FULL_TIME',
  'COMPLETED',
  'ABANDONED',
];

function endedStatusLabel(status: MatchStatus): string {
  switch (status) {
    case 'ABANDONED':
      return 'Abandoned';
    default:
      return 'Full-time — ended';
  }
}

interface EndedMatchViewProps {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  status: MatchStatus;
}

export function EndedMatchView({
  matchId,
  homeTeamName,
  awayTeamName,
  status,
}: EndedMatchViewProps) {
  const { message, showToast } = useToast();

  useEffect(() => {
    showToast('This match has ended.');
    // Only ever meant to fire once on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 bg-white">
      <Toast message={message} />
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="items-center px-6 pb-16 pt-20"
      >
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          accessibilityLabel="Go to Home"
          accessibilityHint="Returns to the home screen"
          className="self-start rounded-lg border border-gray-300 px-4 py-2"
        >
          <Text className="font-bold text-black">← Home</Text>
        </Pressable>

        <Text className="mt-6 text-center text-2xl font-bold text-black">
          {homeTeamName} vs {awayTeamName}
        </Text>
        <Text className="mt-1 text-sm font-bold uppercase tracking-wide text-gray-500">
          {endedStatusLabel(status)}
        </Text>
        <Text className="mt-4 text-center text-black">
          This match has ended, so the lineup and formation can no longer be changed.
        </Text>

        <Pressable
          onPress={() => router.push({ pathname: '/match/[id]/live', params: { id: matchId } })}
          accessibilityLabel="View Match"
          accessibilityHint="Opens the match screen"
          className="mt-6 items-center rounded-lg bg-black px-8 py-4"
        >
          <Text className="text-base font-bold text-white">View Match</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
