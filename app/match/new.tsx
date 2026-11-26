import { router } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { DualWheelPicker } from '../../src/components/match/DualWheelPicker';
import { MatchupCard } from '../../src/components/match/MatchupCard';
import { TeamPicker } from '../../src/components/match/TeamPicker';
import { ScalePressable } from '../../src/components/ui/ScalePressable';
import { StadiumBackdrop } from '../../src/components/ui/StadiumBackdrop';
import { useCreateMatch } from '../../src/hooks/useMatches';
import { useFormations } from '../../src/hooks/useMeta';
import { TeamSummary } from '../../src/hooks/useTeams';

interface OpposingTeamContext {
  disabledPlayerIds: string[];
  disabledReason?: string;
}

/**
 * Single unified helper to resolve disabled players and reason based on which slot is active
 * and which team was selected first (bidirectional: Team A first -> filter in B, Team B first -> filter in A).
 */
export function getOpposingTeamContext(
  currentSlot: 'home' | 'away' | null,
  homeTeam: TeamSummary | null,
  homePlayerIds: string[],
  awayTeam: TeamSummary | null,
  awayPlayerIds: string[],
): OpposingTeamContext {
  if (currentSlot === 'home' && awayTeam && awayPlayerIds.length > 0) {
    return {
      disabledPlayerIds: awayPlayerIds,
      disabledReason: `Selected for ${awayTeam.name}`,
    };
  }

  if (currentSlot === 'away' && homeTeam && homePlayerIds.length > 0) {
    return {
      disabledPlayerIds: homePlayerIds,
      disabledReason: `Selected for ${homeTeam.name}`,
    };
  }

  return { disabledPlayerIds: [] };
}

export default function MatchSetup() {
  const [homeTeam, setHomeTeam] = useState<TeamSummary | null>(null);
  const [awayTeam, setAwayTeam] = useState<TeamSummary | null>(null);
  const [homePlayerIds, setHomePlayerIds] = useState<string[]>([]);
  const [awayPlayerIds, setAwayPlayerIds] = useState<string[]>([]);
  const [pickerSlot, setPickerSlot] = useState<'home' | 'away' | null>(null);

  const [playersPerSide, setPlayersPerSide] = useState<number>(7);
  const [halfDurationMin, setHalfDurationMin] = useState<number>(15);

  const formationsQuery = useFormations(playersPerSide);
  const createMatch = useCreateMatch();

  const opposingContext = getOpposingTeamContext(
    pickerSlot,
    homeTeam,
    homePlayerIds,
    awayTeam,
    awayPlayerIds,
  );

  function handleTeamSelected(team: TeamSummary, playerIds: string[]) {
    if (pickerSlot === 'home') {
      setHomeTeam(team);
      setHomePlayerIds(playerIds);
      // Auto-filter: if Team B was chosen first, remove any player now chosen for Team A
      setAwayPlayerIds((prev) => prev.filter((id) => !playerIds.includes(id)));
    } else if (pickerSlot === 'away') {
      setAwayTeam(team);
      setAwayPlayerIds(playerIds);
      // Auto-filter: if Team A was chosen first, remove any player now chosen for Team B
      setHomePlayerIds((prev) => prev.filter((id) => !playerIds.includes(id)));
    }

    setPickerSlot(null);
  }

  const bothTeamsSelected = Boolean(homeTeam) && Boolean(awayTeam) && homeTeam?.id !== awayTeam?.id;
  const isDuplicate = Boolean(homeTeam && awayTeam && homeTeam.id === awayTeam.id);
  const canSubmit = bothTeamsSelected && !createMatch.isPending;

  const feedbackMessage =
    !homeTeam && !awayTeam
      ? 'Select Team A and Team B to continue'
      : !homeTeam
        ? 'Select Team A to continue'
        : !awayTeam
          ? 'Select Team B to continue'
          : isDuplicate
            ? 'Team A and Team B must be different'
            : null;

  function handleSubmit() {
    if (!homeTeam || !awayTeam || homeTeam.id === awayTeam.id || createMatch.isPending) {
      return;
    }

    const defaultFormation = formationsQuery.data?.[0]?.name ?? `${String(playersPerSide)}-default`;

    createMatch.mutate(
      {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        playersPerSide,
        formationHome: defaultFormation,
        formationAway: defaultFormation,
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

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0b140e',
      }}
    >
      <StadiumBackdrop scrollY={scrollY} />

      <Animated.ScrollView
        className="flex-1"
        contentContainerClassName="pb-16 pt-12"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View className="w-full max-w-xl self-center px-5">
          {/* Header */}
          <View className="relative flex-row items-center justify-center py-2">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back to Dashboard"
              accessibilityHint="Returns to the home screen"
              className="absolute left-0 h-10 w-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
            >
              <ArrowLeft color="#ffffff" size={20} />
            </Pressable>
            <Text className="text-2xl font-bold text-white">New Match Setup</Text>
          </View>

          {/* Unified "VS" Matchup Card */}
          <View className="mt-6">
            <MatchupCard
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              onSelectHome={() => setPickerSlot('home')}
              onSelectAway={() => setPickerSlot('away')}
            />
          </View>

          {/* Dual Vertical Picker Wheels */}
          <DualWheelPicker
            playersPerSide={playersPerSide}
            onSelectPlayersPerSide={setPlayersPerSide}
            halfDurationMin={halfDurationMin}
            onSelectHalfDurationMin={setHalfDurationMin}
          />

          {/* Error notice if creation failed */}
          {createMatch.isError ? (
            <View className="mt-4 rounded-xl border border-red-300/40 bg-red-950/80 p-3">
              <Text className="text-center text-xs font-medium text-red-200">
                Could not set up the match — please try again
                {__DEV__ && createMatch.error instanceof Error
                  ? ` (${createMatch.error.message})`
                  : ''}
              </Text>
            </View>
          ) : null}

          {/* Action CTA */}
          <View className="mt-6">
            {feedbackMessage ? (
              <Text className="mb-2 text-center text-xs font-semibold text-emerald-200">
                {feedbackMessage}
              </Text>
            ) : null}

            <ScalePressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeScale={0.97}
              hapticFeedback="medium"
              accessibilityRole="button"
              accessibilityLabel="Set Up Lineups and Pitch"
              accessibilityHint="Creates the match and opens lineup selection"
              style={{
                shadowColor: canSubmit ? '#059669' : 'transparent',
                shadowOpacity: canSubmit ? 0.35 : 0,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: canSubmit ? 4 : 0,
              }}
              className={`items-center justify-center rounded-2xl py-4 ${
                canSubmit ? 'bg-emerald-500 active:bg-emerald-600' : 'bg-white/20'
              }`}
            >
              {createMatch.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text
                  className={`text-base font-bold ${canSubmit ? 'text-white' : 'text-white/40'}`}
                >
                  Set Up Lineups
                </Text>
              )}
            </ScalePressable>
          </View>
        </View>
      </Animated.ScrollView>

      <TeamPicker
        visible={pickerSlot !== null}
        title={pickerSlot === 'home' ? 'Select Team A' : 'Select Team B'}
        teamSlot={pickerSlot ?? 'home'}
        disabledPlayerIds={opposingContext.disabledPlayerIds}
        disabledReason={opposingContext.disabledReason}
        onClose={() => setPickerSlot(null)}
        onSelect={handleTeamSelected}
      />
    </View>
  );
}
