import ArrowRight from 'lucide-react-native/icons/arrow-right';
import SearchIcon from 'lucide-react-native/icons/search';
import Shield from 'lucide-react-native/icons/shield';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { TeamSummary } from '../../hooks/useTeams';
import { teamA, teamB } from '../../theme/tokens';

interface TeamPickerListProps {
  tab: 'mine' | 'opponents';
  teamSlot: 'home' | 'away';
  query: string;
  onChangeQuery: (value: string) => void;
  teams: TeamSummary[] | undefined;
  isLoading: boolean;
  byCodeError: boolean;
  byCodeNotFound: boolean;
  onSelectTeam: (team: TeamSummary) => void;
}

/**
 * Searchable list of Sports Club Cards for the "Your Teams" and "Opponents" tabs
 * inside TeamPicker.
 */
export function TeamPickerList({
  tab,
  teamSlot,
  query,
  onChangeQuery,
  teams,
  isLoading,
  byCodeError,
  byCodeNotFound,
  onSelectTeam,
}: TeamPickerListProps) {
  const accent = teamSlot === 'away' ? teamB : teamA;
  const badgeBgClass =
    teamSlot === 'away' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200';

  return (
    <View className="flex-1">
      <View className="pt-3">
        <View className="flex-row items-center rounded-xl border border-white/30 bg-white/95 px-3.5 shadow-sm">
          <SearchIcon color="#64748b" size={18} />
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Name, code, captain's phone or username"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            accessibilityLabel="Search teams"
            accessibilityHint="Matches by team name, code, or the team's captain's phone or username"
            className="ml-2.5 flex-1 py-3 text-base text-slate-900"
          />
        </View>
        {byCodeError ? (
          <View className="mt-2 rounded-lg bg-red-950/80 px-3 py-2">
            <Text className="text-xs font-medium text-red-200">
              Could not look up that code — try again
            </Text>
          </View>
        ) : null}
        {byCodeNotFound ? (
          <View className="mt-2 rounded-lg bg-red-950/80 px-3 py-2">
            <Text className="text-xs font-medium text-red-200">No team found with that code.</Text>
          </View>
        ) : null}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-24 pt-3">
        {isLoading ? <ActivityIndicator className="mt-8" color="#ffffff" /> : null}

        {!isLoading && teams?.length === 0 ? (
          <View className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-5">
            <Text className="text-center text-sm font-medium text-white/90">
              {tab === 'mine'
                ? 'No teams found.'
                : 'No opponents found yet — they show up here once you play a match against them, or find them with the scanner.'}
            </Text>
          </View>
        ) : null}

        {teams?.map((team) => (
          <Pressable
            key={team.id}
            onPress={() => onSelectTeam(team)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${team.name}`}
            accessibilityHint="Opens this team's roster to choose players"
            className="mt-2.5 flex-row items-center rounded-xl border border-white/20 bg-white/95 p-3.5 shadow-sm active:opacity-85"
          >
            <View
              className={`h-11 w-11 items-center justify-center rounded-xl border ${badgeBgClass}`}
            >
              <Shield color={accent.fill} fill={accent.chipBg} size={22} />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
                {team.name}
              </Text>
              <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
                <View className="rounded-full bg-slate-100 px-2 py-0.5">
                  <Text className="text-[11px] font-semibold text-slate-700" numberOfLines={1}>
                    {team.code}
                  </Text>
                </View>
                {team.captain ? (
                  <View className="rounded-full bg-slate-100 px-2 py-0.5">
                    <Text className="text-[11px] font-medium text-slate-600" numberOfLines={1}>
                      Capt: {team.captain.displayName}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <ArrowRight color="#475569" size={16} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
