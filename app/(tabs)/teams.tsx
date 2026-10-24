import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Plus from 'lucide-react-native/icons/plus';
import SearchIcon from 'lucide-react-native/icons/search';
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

import { TeamSummary, useOpponentTeams, useOwnedTeams } from '../../src/hooks/useTeams';

type Segment = 'our' | 'opponents';

function TeamListItem({ team }: { team: TeamSummary }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/teams/[id]', params: { id: team.id } })}
      accessibilityLabel={`${team.name}, code ${team.code}`}
      accessibilityHint="Opens this team's details"
      className="mt-3 flex-row items-center rounded-lg border border-emerald-200 bg-white p-3"
    >
      <View
        className="items-center justify-center rounded-full bg-emerald-100"
        style={{ width: 48, height: 48 }}
      >
        <Text className="text-lg font-bold text-emerald-700">
          {team.name.trim().charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-emerald-900">{team.name}</Text>
        <Text className="text-xs text-emerald-600">Code: {team.code}</Text>
        {team.captain ? (
          <Text className="text-xs text-emerald-600">Captain: {team.captain.displayName}</Text>
        ) : null}
      </View>
      <ChevronRight color="#9ca3af" size={20} />
    </Pressable>
  );
}

export default function Teams() {
  const [segment, setSegment] = useState<Segment>('our');
  const [search, setSearch] = useState('');

  const owned = useOwnedTeams(search);
  const opponents = useOpponentTeams(search);
  const active = segment === 'our' ? owned : opponents;
  const teams = active.data ?? [];

  return (
    // KeyboardAvoidingView + ScrollView, not a plain View: the search field needs this like
    // every other screen with a TextInput (FRONTEND_INSTRUCTIONS.md §9).
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="px-6 pb-32 pt-20"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-emerald-800">Teams</Text>
          {segment === 'our' ? (
            <Pressable
              onPress={() => router.push('/teams/new')}
              accessibilityLabel="Add team"
              accessibilityHint="Opens the form to create a new team"
              className="flex-row items-center rounded-lg bg-emerald-600 px-3 py-2"
            >
              <Plus color="#ffffff" size={18} />
              <Text className="ml-1 font-bold text-white">Add Team</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="mt-4 flex-row rounded-lg border border-emerald-200 bg-emerald-50 p-1">
          <Pressable
            onPress={() => setSegment('our')}
            accessibilityLabel="Our Teams"
            accessibilityHint="Shows teams you own"
            className={`flex-1 items-center rounded-md py-2 ${segment === 'our' ? 'bg-white' : ''}`}
          >
            <Text
              className={`font-bold ${segment === 'our' ? 'text-emerald-800' : 'text-emerald-500'}`}
            >
              Our Teams
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSegment('opponents')}
            accessibilityLabel="Opponent Teams"
            accessibilityHint="Shows teams that have played against your teams"
            className={`flex-1 items-center rounded-md py-2 ${segment === 'opponents' ? 'bg-white' : ''}`}
          >
            <Text
              className={`font-bold ${segment === 'opponents' ? 'text-emerald-800' : 'text-emerald-500'}`}
            >
              Opponent Teams
            </Text>
          </Pressable>
        </View>

        <View className="mt-4 flex-row items-center rounded-lg border border-emerald-300 bg-white px-3">
          <SearchIcon color="#047857" size={18} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or code"
            autoCapitalize="none"
            accessibilityLabel="Search teams"
            accessibilityHint="Type a team name or its unique code"
            className="ml-2 flex-1 py-3 text-base text-emerald-900"
          />
        </View>

        {active.isLoading ? (
          <ActivityIndicator className="mt-8" color="#059669" />
        ) : teams.length === 0 ? (
          <Text className="mt-8 text-center text-emerald-500">
            {segment === 'our'
              ? 'No teams yet — add one to get started.'
              : 'No opponent teams yet — they will show up here once you play a match against them.'}
          </Text>
        ) : (
          teams.map((team) => <TeamListItem key={team.id} team={team} />)
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
