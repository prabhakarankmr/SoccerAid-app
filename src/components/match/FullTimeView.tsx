import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { MatchEvent } from '../../hooks/useMatches';
import { EventsTimeline } from './EventsTimeline';
import { Scoreboard } from './Scoreboard';

export interface FullTimeViewProps {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  events: MatchEvent[];
  nameOf: (playerId: string | null) => string;
  currentUserName: string;
}

export function FullTimeView({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  homeLogoUrl,
  awayLogoUrl,
  events,
  nameOf,
  currentUserName,
}: FullTimeViewProps) {
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
        period="FULL_TIME"
        showClockHud={false}
      />

      <View className="my-3 items-center">
        <View className="rounded-full border border-slate-600/40 bg-slate-900/80 px-4 py-1.5">
          <Text className="text-xs font-black uppercase tracking-wider text-slate-300">
            Full Time — Match Ended
          </Text>
        </View>
      </View>

      <View className="mt-2">
        <EventsTimeline
          events={events}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          nameOf={nameOf}
          isMatchLive={false}
          isFullHeight={false}
          currentUserName={currentUserName}
          currentMinute={90}
        />
      </View>
    </ScrollView>
  );
}
