import Play from 'lucide-react-native/icons/play';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { MatchEvent } from '../../hooks/useMatches';
import { EventsTimeline } from './EventsTimeline';
import { Scoreboard } from './Scoreboard';

export interface HalfTimeViewProps {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  canScore: boolean;
  isStartingSecondHalf: boolean;
  isSecondHalfError: boolean;
  onStartSecondHalf: () => void;
  events: MatchEvent[];
  halfDurationSec: number;
  nameOf: (playerId: string | null) => string;
  currentUserName: string;
  currentMinute: number;
}

export function HalfTimeView({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  homeLogoUrl,
  awayLogoUrl,
  canScore,
  isStartingSecondHalf,
  isSecondHalfError,
  onStartSecondHalf,
  events,
  halfDurationSec,
  nameOf,
  currentUserName,
  currentMinute,
}: HalfTimeViewProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pb-16 pt-2"
      showsVerticalScrollIndicator={false}
    >
      <Scoreboard
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        homeScore={homeScore}
        awayScore={awayScore}
        homeLogoUrl={homeLogoUrl}
        awayLogoUrl={awayLogoUrl}
        period="HALF_TIME"
        showClockHud={false}
      />

      <View className="my-3 items-center">
        <View className="rounded-full border border-emerald-400/30 bg-emerald-950/60 px-4 py-1.5">
          <Text className="text-xs font-black uppercase tracking-wider text-emerald-300">
            Half Time
          </Text>
        </View>
      </View>

      {canScore ? (
        <View className="mb-4">
          {isSecondHalfError ? (
            <Text className="mb-2 text-center text-xs font-semibold text-red-400">
              Could not start the second half — try again
            </Text>
          ) : null}
          <Pressable
            onPress={onStartSecondHalf}
            disabled={isStartingSecondHalf}
            accessibilityRole="button"
            accessibilityLabel="Kick Off Second Half"
            accessibilityHint="Starts the second half's clock now"
            className="mx-auto flex-row items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3.5 shadow-md active:bg-emerald-600"
          >
            {isStartingSecondHalf ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Play color="#ffffff" size={18} fill="#ffffff" />
                <Text className="text-sm font-bold text-white">Kick Off 2nd Half</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : (
        <View className="mb-4 items-center">
          <Text className="text-xs font-medium text-slate-400">
            Half-time interval — waiting for second half kickoff
          </Text>
        </View>
      )}

      <View className="mt-2">
        <EventsTimeline
          events={events}
          halfDurationSec={halfDurationSec}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          nameOf={nameOf}
          isMatchLive={false}
          isFullHeight={false}
          currentUserName={currentUserName}
          currentMinute={currentMinute}
        />
      </View>
    </ScrollView>
  );
}
