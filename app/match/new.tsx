import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { TeamPicker } from '../../src/components/match/TeamPicker';
import { useFormations, useFormats } from '../../src/hooks/useMeta';
import { useCreateMatch } from '../../src/hooks/useMatches';
import { TeamSummary } from '../../src/hooks/useTeams';

const HALF_DURATION_PRESETS_MIN = [10, 15, 20, 25, 30, 35, 40, 45];
const EXTRA_TIME_SEC = 600;

function PillButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Selects this option"
      className={`mb-2 mr-2 rounded-full border px-4 py-2 ${
        selected ? 'border-emerald-600 bg-emerald-600' : 'border-emerald-300 bg-white'
      }`}
    >
      <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-emerald-700'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function TeamSlot({
  label,
  team,
  onPress,
}: {
  label: string;
  team: TeamSummary | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={team ? `${label}: ${team.name}` : `Select ${label}`}
      accessibilityHint="Opens the team picker"
      className="flex-1 items-center rounded-lg border border-emerald-300 bg-white p-4"
    >
      <View
        className="items-center justify-center rounded-full bg-emerald-100"
        style={{ width: 56, height: 56 }}
      >
        <Text className="text-xl font-bold text-emerald-700">
          {team ? team.name.trim().charAt(0).toUpperCase() || '?' : '+'}
        </Text>
      </View>
      <Text className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-500">
        {label}
      </Text>
      <Text className="mt-1 text-center font-bold text-emerald-900" numberOfLines={1}>
        {team ? team.name : 'Select team'}
      </Text>
    </Pressable>
  );
}

export default function MatchSetup() {
  const [homeTeam, setHomeTeam] = useState<TeamSummary | null>(null);
  const [awayTeam, setAwayTeam] = useState<TeamSummary | null>(null);
  const [pickerSlot, setPickerSlot] = useState<'home' | 'away' | null>(null);

  const [playersPerSide, setPlayersPerSide] = useState<number | null>(null);
  const [formationHome, setFormationHome] = useState<string | null>(null);
  const [formationAway, setFormationAway] = useState<string | null>(null);
  const [halfDurationMin, setHalfDurationMin] = useState<number | null>(null);
  const [hasExtraTime, setHasExtraTime] = useState(false);
  const [hasPenalties, setHasPenalties] = useState(false);

  const formatsQuery = useFormats();
  const formationsQuery = useFormations(playersPerSide ?? undefined);
  const createMatch = useCreateMatch();

  function selectPlayersPerSide(value: number) {
    setPlayersPerSide(value);
    setFormationHome(null);
    setFormationAway(null);
  }

  function handleTeamSelected(team: TeamSummary) {
    if (pickerSlot === 'home') {
      setHomeTeam(team);
    } else if (pickerSlot === 'away') {
      setAwayTeam(team);
    }

    setPickerSlot(null);
  }

  const isValid =
    Boolean(homeTeam) &&
    Boolean(awayTeam) &&
    homeTeam?.id !== awayTeam?.id &&
    Boolean(playersPerSide) &&
    Boolean(formationHome) &&
    Boolean(formationAway) &&
    Boolean(halfDurationMin);

  function handleSubmit() {
    if (
      !homeTeam ||
      !awayTeam ||
      !playersPerSide ||
      !formationHome ||
      !formationAway ||
      !halfDurationMin
    ) {
      return;
    }

    createMatch.mutate(
      {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        playersPerSide,
        formationHome,
        formationAway,
        halfDurationSec: halfDurationMin * 60,
        extraTimeSec: hasExtraTime ? EXTRA_TIME_SEC : undefined,
        hasPenalties,
      },
      {
        onSuccess: (match) => {
          router.replace({ pathname: '/match/[id]/lineup', params: { id: match.id } });
        },
        onError: (error) => {
          console.error('POST /matches failed:', error);
        },
      },
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-16 pt-20">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back to Dashboard"
          accessibilityHint="Returns to the home screen"
          className="self-start rounded-lg border border-emerald-300 px-4 py-2"
        >
          <Text className="font-bold text-emerald-700">← Back to Dashboard</Text>
        </Pressable>

        <Text className="mt-6 text-2xl font-bold text-emerald-800">New Match Setup</Text>
        <Text className="mt-1 text-emerald-600">
          Pick both teams, the format and the formations.
        </Text>

        <View className="mt-6 flex-row gap-3">
          <TeamSlot label="Team A" team={homeTeam} onPress={() => setPickerSlot('home')} />
          <TeamSlot label="Team B" team={awayTeam} onPress={() => setPickerSlot('away')} />
        </View>
        {homeTeam && awayTeam && homeTeam.id === awayTeam.id ? (
          <Text className="mt-2 text-sm text-red-700">
            Team A and Team B must be different teams.
          </Text>
        ) : null}

        <Text className="mt-6 text-sm font-bold text-emerald-700">Players per side</Text>
        {formatsQuery.isLoading ? (
          <ActivityIndicator className="mt-2" color="#059669" />
        ) : (
          <View className="mt-2 flex-row flex-wrap">
            {formatsQuery.data?.map((format) => (
              <PillButton
                key={format.playersPerSide}
                label={format.label}
                selected={playersPerSide === format.playersPerSide}
                onPress={() => selectPlayersPerSide(format.playersPerSide)}
              />
            ))}
          </View>
        )}

        {playersPerSide ? (
          <>
            <Text className="mt-4 text-sm font-bold text-emerald-700">
              {homeTeam?.name ?? 'Team A'}&apos;s formation
            </Text>
            {formationsQuery.isLoading ? (
              <ActivityIndicator className="mt-2" color="#059669" />
            ) : (
              <View className="mt-2 flex-row flex-wrap">
                {formationsQuery.data?.map((formation) => (
                  <PillButton
                    key={formation.name}
                    label={formation.name}
                    selected={formationHome === formation.name}
                    onPress={() => setFormationHome(formation.name)}
                  />
                ))}
              </View>
            )}

            <Text className="mt-4 text-sm font-bold text-emerald-700">
              {awayTeam?.name ?? 'Team B'}&apos;s formation
            </Text>
            <View className="mt-2 flex-row flex-wrap">
              {formationsQuery.data?.map((formation) => (
                <PillButton
                  key={formation.name}
                  label={formation.name}
                  selected={formationAway === formation.name}
                  onPress={() => setFormationAway(formation.name)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text className="mt-4 text-sm font-bold text-emerald-700">Half duration</Text>
        <View className="mt-2 flex-row flex-wrap">
          {HALF_DURATION_PRESETS_MIN.map((minutes) => (
            <PillButton
              key={minutes}
              label={`${String(minutes)} min`}
              selected={halfDurationMin === minutes}
              onPress={() => setHalfDurationMin(minutes)}
            />
          ))}
        </View>

        <View className="mt-4 flex-row items-center justify-between rounded-lg border border-emerald-200 bg-white px-4 py-3">
          <Text className="text-emerald-900">Extra time if drawn (+10 min)</Text>
          <Switch
            value={hasExtraTime}
            onValueChange={setHasExtraTime}
            accessibilityLabel="Extra time if drawn"
            accessibilityHint="Toggles an extra 10 minutes if the match is level at full time"
            trackColor={{ true: '#059669' }}
          />
        </View>

        <View className="mt-3 flex-row items-center justify-between rounded-lg border border-emerald-200 bg-white px-4 py-3">
          <Text className="text-emerald-900">Penalties if still level</Text>
          <Switch
            value={hasPenalties}
            onValueChange={setHasPenalties}
            accessibilityLabel="Penalties if still level"
            accessibilityHint="Toggles a penalty shootout if the match is still level after extra time"
            trackColor={{ true: '#059669' }}
          />
        </View>

        {createMatch.isError ? (
          <Text className="mt-4 text-sm text-red-700">
            Could not set up the match — try again
            {__DEV__ && createMatch.error instanceof Error ? ` (${createMatch.error.message})` : ''}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={!isValid || createMatch.isPending}
          accessibilityLabel="Set Up Players"
          accessibilityHint="Creates the match and opens lineup selection"
          className={`mt-6 items-center rounded-lg py-4 ${
            isValid && !createMatch.isPending ? 'bg-emerald-600' : 'bg-emerald-300'
          }`}
        >
          {createMatch.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-bold text-white">Set Up Players</Text>
          )}
        </Pressable>
      </ScrollView>

      <TeamPicker
        visible={pickerSlot !== null}
        title={pickerSlot === 'home' ? 'Select Team A' : 'Select Team B'}
        onClose={() => setPickerSlot(null)}
        onSelect={handleTeamSelected}
      />
    </View>
  );
}
