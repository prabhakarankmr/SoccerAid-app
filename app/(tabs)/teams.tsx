import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import SearchIcon from 'lucide-react-native/icons/search';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TeamPickerFab } from '../../src/components/match/TeamPickerFab';
import { TeamClubCard } from '../../src/components/team/TeamClubCard';
import { SlidingSegmentedControl } from '../../src/components/ui/SlidingSegmentedControl';
import { StadiumBackdrop } from '../../src/components/ui/StadiumBackdrop';
import { useOpponentTeams, useOwnedTeams } from '../../src/hooks/useTeams';

type Segment = 'our' | 'opponents';

export default function Teams() {
  const [segment, setSegment] = useState<Segment>('our');
  const [search, setSearch] = useState('');

  const owned = useOwnedTeams(search);
  const opponents = useOpponentTeams(search);
  const active = segment === 'our' ? owned : opponents;
  const teams = active.data ?? [];

  const isOur = segment === 'our';
  const accentColor = isOur ? '#10b981' : '#2563eb';
  const accentBgColor = isOur ? '#d1fae5' : '#dbeafe';
  const badgeClassName = isOur ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50';

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
          <Text className="text-2xl font-bold text-white">Teams</Text>

          <SlidingSegmentedControl
            options={[
              { value: 'our', label: 'Our Teams', accessibilityHint: 'Shows teams you own' },
              {
                value: 'opponents',
                label: 'Opponent Teams',
                accessibilityHint: 'Shows teams that have played against your teams',
              },
            ]}
            selectedValue={segment}
            onSelect={setSegment}
            className="mt-4 rounded-full border-white/20 bg-white/15"
            inactiveTextClassName="text-white/90"
          />

          <View className="mt-4 flex-row items-center rounded-xl border border-white/30 bg-white/95 px-3.5 shadow-sm">
            <SearchIcon color="#64748b" size={18} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, code, captain's phone or username"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              accessibilityLabel="Search teams"
              accessibilityHint="Type a team name or its unique code"
              className="ml-2.5 flex-1 py-3 text-base text-slate-900"
            />
          </View>

          {active.isLoading ? (
            <ActivityIndicator className="mt-8" color="#ffffff" />
          ) : teams.length === 0 ? (
            <View className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-5">
              <Text className="text-center text-sm font-medium text-white/90">
                {isOur
                  ? 'No teams yet — tap + to add one.'
                  : 'No opponent teams yet — they will show up here once you play a match against them.'}
              </Text>
            </View>
          ) : (
            <View className="mt-1">
              {teams.map((team) => (
                <TeamClubCard
                  key={team.id}
                  team={team}
                  accentColor={accentColor}
                  accentBgColor={accentBgColor}
                  badgeClassName={badgeClassName}
                  accessibilityHint="Opens this team's details"
                  onPress={() => router.push({ pathname: '/teams/[id]', params: { id: team.id } })}
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

        {isOur ? (
          <TeamPickerFab
            bottom={108}
            accessibilityLabel="Add team"
            accessibilityHint="Opens the form to create a new team"
            onPress={() => router.push('/teams/new')}
          />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
