import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import SearchIcon from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MatchFixtureCard } from '../../src/components/match/MatchFixtureCard';
import { TeamPickerFab } from '../../src/components/match/TeamPickerFab';
import { SlidingSegmentedControl } from '../../src/components/ui/SlidingSegmentedControl';
import { StadiumBackdrop } from '../../src/components/ui/StadiumBackdrop';
import { useMatchesList } from '../../src/hooks/useMatches';

type Segment = 'live' | 'ended';

export default function Matches() {
  const [segment, setSegment] = useState<Segment>('live');
  const [search, setSearch] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<number | null>(null);

  const matchesQuery = useMatchesList(segment === 'live' ? 'LIVE' : 'FULL_TIME');
  const matches = matchesQuery.data ?? [];

  const availableFormats = Array.from(new Set(matches.map((m) => m.playersPerSide))).sort(
    (a, b) => a - b,
  );
  const activeFormat =
    selectedFormat !== null && availableFormats.includes(selectedFormat) ? selectedFormat : null;

  const q = search.trim().toLowerCase();
  const filteredMatches = matches.filter((m) => {
    const matchesName =
      !q || m.homeTeam.name.toLowerCase().includes(q) || m.awayTeam.name.toLowerCase().includes(q);
    const matchesFormat = activeFormat === null || m.playersPerSide === activeFormat;
    return matchesName && matchesFormat;
  });

  function handleSegmentChange(next: Segment) {
    setSegment(next);
    setSelectedFormat(null);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#0b140e', position: 'relative' }}
    >
      <StadiumBackdrop />

      <View className="w-full max-w-xl flex-1 self-center">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-36 pt-14"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-2xl font-bold text-white">Matches</Text>
          <Text className="mt-1 text-xs font-medium text-emerald-100/90">
            {segment === 'live'
              ? 'Live matches from every team — watch any of them.'
              : 'Matches that have finished.'}
          </Text>

          <SlidingSegmentedControl
            options={[
              {
                value: 'live',
                label: 'Live',
                accessibilityHint: 'Shows matches currently in progress',
              },
              {
                value: 'ended',
                label: 'Ended',
                accessibilityHint: 'Shows matches that have finished',
              },
            ]}
            selectedValue={segment}
            onSelect={handleSegmentChange}
            className="mt-4 rounded-full border-white/20 bg-white/15"
            inactiveTextClassName="text-white/90"
          />

          <View className="mt-3 flex-row items-center rounded-xl border border-white/30 bg-white/95 px-3.5 shadow-sm">
            <SearchIcon color="#64748b" size={18} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by team name"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              accessibilityLabel="Search matches"
              accessibilityHint="Filters matches by home or away team name"
              className="ml-2.5 flex-1 py-3 text-base text-slate-900"
            />
            {search.length > 0 ? (
              <Pressable
                onPress={() => setSearch('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                accessibilityHint="Clears the team name search"
                className="ml-1 rounded-full bg-slate-200 p-1 active:bg-slate-300"
              >
                <X color="#475569" size={14} />
              </Pressable>
            ) : null}
          </View>

          {availableFormats.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerClassName="gap-2"
            >
              <Pressable
                onPress={() => setSelectedFormat(null)}
                accessibilityRole="button"
                accessibilityLabel="All formats"
                accessibilityHint="Shows matches of all team sizes"
                className={`rounded-full border px-3.5 py-1.5 ${
                  activeFormat === null
                    ? 'border-emerald-400 bg-emerald-500'
                    : 'border-white/20 bg-white/15'
                }`}
              >
                <Text className="text-xs font-bold text-white">All</Text>
              </Pressable>
              {availableFormats.map((size) => {
                const isSelected = activeFormat === size;
                return (
                  <Pressable
                    key={size}
                    onPress={() => setSelectedFormat(isSelected ? null : size)}
                    accessibilityRole="button"
                    accessibilityLabel={`${String(size)}v${String(size)} format`}
                    accessibilityHint={`Filters to ${String(size)}v${String(size)} matches`}
                    className={`rounded-full border px-3.5 py-1.5 ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500'
                        : 'border-white/20 bg-white/15'
                    }`}
                  >
                    <Text className="text-xs font-bold text-white">
                      {size}v{size}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {matchesQuery.isLoading ? (
            <ActivityIndicator className="mt-8" color="#ffffff" />
          ) : matches.length === 0 ? (
            <View className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-5">
              <Text className="text-center text-sm font-medium text-white/90">
                {segment === 'live'
                  ? 'No matches are live right now — tap + to start one.'
                  : 'No matches have ended yet.'}
              </Text>
            </View>
          ) : filteredMatches.length === 0 ? (
            <View className="mt-6 items-center rounded-2xl border border-white/15 bg-white/10 p-5">
              <Text className="text-center text-sm font-medium text-white/90">
                No matches match that filter.
              </Text>
              <Pressable
                onPress={() => {
                  setSearch('');
                  setSelectedFormat(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Reset filters"
                accessibilityHint="Clears the search text and format filter"
                className="mt-3 rounded-full bg-white/20 px-4 py-1.5 active:bg-white/30"
              >
                <Text className="text-xs font-bold text-white">Reset filters</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-1">
              {filteredMatches.map((match) => (
                <MatchFixtureCard
                  key={match.id}
                  match={match}
                  segment={segment}
                  onPress={() =>
                    router.push({ pathname: '/match/[id]/live', params: { id: match.id } })
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>

        <LinearGradient
          colors={['transparent', 'rgba(11, 20, 14, 0.75)', 'rgba(11, 20, 14, 0.96)']}
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 190 }}
        />

        <TeamPickerFab
          bottom={108}
          accessibilityLabel="Create match"
          accessibilityHint="Opens match setup to create a new match"
          onPress={() => router.push('/match/new')}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
