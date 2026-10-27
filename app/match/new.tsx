import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { TeamPicker } from '../../src/components/match/TeamPicker';
import { useFormations, useFormats } from '../../src/hooks/useMeta';
import { useCreateMatch } from '../../src/hooks/useMatches';
import { TeamSummary } from '../../src/hooks/useTeams';

const HALF_DURATION_PRESETS_MIN = [5, 10, 15, 20, 25, 30, 35, 40, 45];

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
        selected ? 'border-gray-300 bg-black' : 'border-gray-300 bg-white'
      }`}
    >
      <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-black'}`}>{label}</Text>
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
      className="flex-1 items-center rounded-lg border border-gray-300 bg-white p-4"
    >
      <View
        className="items-center justify-center rounded-full bg-gray-100"
        style={{ width: 56, height: 56 }}
      >
        <Text className="text-xl font-bold text-black">
          {team ? team.name.trim().charAt(0).toUpperCase() || '?' : '+'}
        </Text>
      </View>
      <Text className="mt-2 text-xs font-bold uppercase tracking-wide text-black">{label}</Text>
      <Text className="mt-1 text-center font-bold text-black" numberOfLines={1}>
        {team ? team.name : 'Select team'}
      </Text>
    </Pressable>
  );
}

export default function MatchSetup() {
  const [homeTeam, setHomeTeam] = useState<TeamSummary | null>(null);
  const [awayTeam, setAwayTeam] = useState<TeamSummary | null>(null);
  // Who from each team's roster is actually playing — picked alongside the team itself in
  // TeamPicker's roster step, carried to the lineup screen so starter/sub selection only
  // offers players marked as playing here, not the whole historical roster (§5.1/§5.2).
  const [homePlayerIds, setHomePlayerIds] = useState<string[]>([]);
  const [awayPlayerIds, setAwayPlayerIds] = useState<string[]>([]);
  const [pickerSlot, setPickerSlot] = useState<'home' | 'away' | null>(null);

  const [playersPerSide, setPlayersPerSide] = useState<number | null>(null);
  const [formationHome, setFormationHome] = useState<string | null>(null);
  const [formationAway, setFormationAway] = useState<string | null>(null);
  const [halfDurationMin, setHalfDurationMin] = useState<number | null>(null);

  const formatsQuery = useFormats();
  const formationsQuery = useFormations(playersPerSide ?? undefined);
  const createMatch = useCreateMatch();

  function selectPlayersPerSide(value: number) {
    setPlayersPerSide(value);
    setFormationHome(null);
    setFormationAway(null);
  }

  function handleTeamSelected(team: TeamSummary, playerIds: string[]) {
    if (pickerSlot === 'home') {
      setHomeTeam(team);
      setHomePlayerIds(playerIds);
    } else if (pickerSlot === 'away') {
      setAwayTeam(team);
      setAwayPlayerIds(playerIds);
    }

    setPickerSlot(null);
  }

  const bothTeamsSelected = Boolean(homeTeam) && Boolean(awayTeam) && homeTeam?.id !== awayTeam?.id;

  const isValid =
    bothTeamsSelected &&
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
      },
      {
        onSuccess: (match) => {
          router.replace({
            pathname: '/match/[id]/lineup',
            params: {
              id: match.id,
              homePlayerIds: homePlayerIds.join(','),
              awayPlayerIds: awayPlayerIds.join(','),
            },
          });
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
        <View className="flex-row items-center justify-center">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Back to Dashboard"
            accessibilityHint="Returns to the home screen"
            style={{ position: 'absolute', left: 0 }}
          >
            <Image
              source={require('../../assets/left.png')}
              accessible={false}
              accessibilityIgnoresInvertColors
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          </Pressable>
          <Text className="text-2xl font-bold text-black">New Match Setup</Text>
        </View>
        <Text className="mt-1 text-center text-black">
          {bothTeamsSelected
            ? 'Now pick the format and formations.'
            : 'Start by picking both teams.'}
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

        {bothTeamsSelected ? (
          <>
            <Text className="mt-6 text-sm font-bold text-black">Players per side</Text>
            {formatsQuery.isLoading ? (
              <ActivityIndicator className="mt-2" color="#000000" />
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
                <Text className="mt-4 text-sm font-bold text-black">
                  {homeTeam?.name ?? 'Team A'}&apos;s formation
                </Text>
                {formationsQuery.isLoading ? (
                  <ActivityIndicator className="mt-2" color="#000000" />
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

                <Text className="mt-4 text-sm font-bold text-black">
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

            <Text className="mt-4 text-sm font-bold text-black">Half duration</Text>
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

            {createMatch.isError ? (
              <Text className="mt-4 text-sm text-red-700">
                Could not set up the match — try again
                {__DEV__ && createMatch.error instanceof Error
                  ? ` (${createMatch.error.message})`
                  : ''}
              </Text>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={!isValid || createMatch.isPending}
              accessibilityLabel="Set Up Players"
              accessibilityHint="Creates the match and opens lineup selection"
              className={`mt-6 items-center rounded-lg py-4 ${
                isValid && !createMatch.isPending ? 'bg-black' : 'bg-gray-300'
              }`}
            >
              {createMatch.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-bold text-white">Set Up Players</Text>
              )}
            </Pressable>
          </>
        ) : null}
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
