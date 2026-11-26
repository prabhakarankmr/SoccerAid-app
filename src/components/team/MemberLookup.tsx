import SearchIcon from 'lucide-react-native/icons/search';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { PlayerSummary, useMemberLookup } from '../../hooks/usePlayers';

interface MemberLookupProps {
  label: string;
  variant?: 'light' | 'dark';
  onSelect: (player: PlayerSummary) => void;
}

/**
 * Captain/roster picker — not a free-text name field. Finds a real app user by their exact
 * phone number or username (GET /teams/lookup-member) and lets the caller confirm them.
 */
export function MemberLookup({ label, variant = 'light', onSelect }: MemberLookupProps) {
  const [identifier, setIdentifier] = useState('');
  const lookup = useMemberLookup();
  const found = lookup.data;
  const isDark = variant === 'dark';

  function handleSearch() {
    if (!identifier.trim()) return;
    lookup.mutate(identifier);
  }

  function handleConfirm(player: PlayerSummary) {
    onSelect(player);
    setIdentifier('');
    lookup.reset();
  }

  return (
    <View>
      {label ? (
        <Text className={`text-sm ${isDark ? 'text-white/80' : 'text-black'}`}>{label}</Text>
      ) : null}

      {isDark ? (
        <View
          className={`${label ? 'mt-1.5 ' : ''}flex-row items-center rounded-xl border border-white/15 bg-white/10 pl-3.5 pr-1.5`}
        >
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Phone number or username"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            accessibilityLabel={label || 'Phone number or username'}
            accessibilityHint="Enter the phone number or username of an existing SoccerAid user"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            className="flex-1 py-3 text-base text-white"
          />
          <Pressable
            onPress={handleSearch}
            disabled={!identifier.trim() || lookup.isPending}
            accessibilityRole="button"
            accessibilityLabel="Search"
            accessibilityHint="Looks up a user by the entered phone number or username"
            className={`h-9 w-9 items-center justify-center rounded-lg ${
              identifier.trim() && !lookup.isPending ? 'bg-emerald-500' : 'bg-white/15'
            }`}
          >
            {lookup.isPending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <SearchIcon color="#ffffff" size={16} />
            )}
          </Pressable>
        </View>
      ) : (
        <View className={`${label ? 'mt-1 ' : ''}flex-row items-center gap-2`}>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Phone number or username"
            autoCapitalize="none"
            accessibilityLabel={label || 'Phone number or username'}
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
      )}

      {lookup.isSuccess && found ? (
        <View
          className={`mt-2 flex-row items-center justify-between rounded-xl border px-3.5 py-3 ${
            isDark ? 'border-emerald-400/40 bg-emerald-500/15' : 'border-gray-300 bg-gray-100'
          }`}
        >
          <View className="flex-1">
            <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-black'}`}>
              {found.displayName}
            </Text>
            {found.phone ? (
              <Text className={`text-xs ${isDark ? 'text-emerald-200/80' : 'text-black'}`}>
                {found.phone}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => handleConfirm(found)}
            accessibilityLabel={`Add ${found.displayName}`}
            accessibilityHint="Confirms this person"
            className={isDark ? 'rounded-lg bg-emerald-500 px-3 py-1.5' : undefined}
          >
            <Text className={`font-bold ${isDark ? 'text-xs text-white' : 'text-black'}`}>Add</Text>
          </Pressable>
        </View>
      ) : null}

      {lookup.isSuccess && !found ? (
        <Text className={`mt-2 text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
          No SoccerAid user found with that phone number or username.
        </Text>
      ) : null}

      {lookup.isError ? (
        <Text className={`mt-2 text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
          Could not search — try again
          {__DEV__ && lookup.error instanceof Error ? ` (${lookup.error.message})` : ''}
        </Text>
      ) : null}
    </View>
  );
}
