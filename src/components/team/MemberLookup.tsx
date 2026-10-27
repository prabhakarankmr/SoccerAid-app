import SearchIcon from 'lucide-react-native/icons/search';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { PlayerSummary, useMemberLookup } from '../../hooks/usePlayers';

interface MemberLookupProps {
  label: string;
  onSelect: (player: PlayerSummary) => void;
}

/**
 * Captain/roster picker — not a free-text name field. Finds a real app user by their exact
 * phone number or username (GET /teams/lookup-member) and lets the caller confirm them.
 * Shared by teams/new.tsx (captain) and teams/[id].tsx (edit captain, add player) — see
 * FRONTEND_INSTRUCTIONS.md §7.
 */
export function MemberLookup({ label, onSelect }: MemberLookupProps) {
  const [identifier, setIdentifier] = useState('');
  const lookup = useMemberLookup();
  const found = lookup.data;

  function handleSearch() {
    if (!identifier.trim()) {
      return;
    }

    lookup.mutate(identifier);
  }

  function handleConfirm(player: PlayerSummary) {
    onSelect(player);
    setIdentifier('');
    lookup.reset();
  }

  return (
    <View>
      <Text className="text-sm text-black">{label}</Text>
      <View className="mt-1 flex-row items-center gap-2">
        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Phone number or username"
          autoCapitalize="none"
          accessibilityLabel={label}
          accessibilityHint="Enter the phone number or username of an existing SoccerAid user"
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-black"
        />
        <Pressable
          onPress={handleSearch}
          disabled={!identifier.trim() || lookup.isPending}
          accessibilityLabel="Search"
          accessibilityHint="Looks up a user by the entered phone number or username"
          className={`items-center justify-center rounded-lg px-4 py-3 ${
            identifier.trim() && !lookup.isPending ? 'bg-black' : 'bg-gray-300'
          }`}
        >
          {lookup.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <SearchIcon color="#ffffff" size={18} />
          )}
        </Pressable>
      </View>

      {lookup.isSuccess && found ? (
        <View className="mt-2 flex-row items-center justify-between rounded-lg border border-gray-300 bg-gray-100 px-3 py-3">
          <View>
            <Text className="text-base text-black">{found.displayName}</Text>
            {found.phone ? <Text className="text-xs text-black">{found.phone}</Text> : null}
          </View>
          <Pressable
            onPress={() => handleConfirm(found)}
            accessibilityLabel={`Add ${found.displayName}`}
            accessibilityHint="Confirms this person"
          >
            <Text className="font-bold text-black">Add</Text>
          </Pressable>
        </View>
      ) : null}

      {lookup.isSuccess && !found ? (
        <Text className="mt-2 text-sm text-red-700">
          No SoccerAid user found with that phone number or username.
        </Text>
      ) : null}

      {lookup.isError ? (
        <Text className="mt-2 text-sm text-red-700">
          Could not search — try again
          {__DEV__ && lookup.error instanceof Error ? ` (${lookup.error.message})` : ''}
        </Text>
      ) : null}
    </View>
  );
}
