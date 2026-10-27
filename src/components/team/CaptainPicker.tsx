import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { apiClient } from '../../api/client';
import { PlayerSummary } from '../../hooks/usePlayers';

import { MemberLookup } from './MemberLookup';

interface CaptainPickerProps {
  onSelect: (player: PlayerSummary) => void;
}

/**
 * Captain selection for a brand-new team: an exact phone/username lookup for a real app user
 * (MemberLookup), or a name-only guest captain — e.g. an opponent team that isn't on SoccerAid
 * at all, where nobody needs an account just to be recorded as who you played against (user
 * call, 2026-10-27 — reverses the earlier "captain must be a real user" rule, which turned out
 * to only ever have been a frontend convention; the backend never validated it). Runs during
 * team creation, before `POST /teams` exists yet, so unlike AddPlayerPanel this only creates the
 * guest `Player` via `POST /players` and hands it back — the caller passes its id as
 * `captainPlayerId`, same as it would a MemberLookup result.
 */
export function CaptainPicker({ onSelect }: CaptainPickerProps) {
  const [guestName, setGuestName] = useState('');

  const createGuestMutation = useMutation({
    mutationFn: (displayName: string) => apiClient.post<PlayerSummary>('/players', { displayName }),
    onSuccess: (player) => {
      setGuestName('');
      onSelect(player);
    },
    onError: (error) => {
      console.error('POST /players failed (guest captain):', error);
    },
  });

  return (
    <View>
      <MemberLookup label="Captain" onSelect={onSelect} />

      <View className="mt-4 flex-row items-center gap-2">
        <View className="h-px flex-1 bg-gray-300" />
        <Text className="text-xs font-bold text-gray-400">OR</Text>
        <View className="h-px flex-1 bg-gray-300" />
      </View>

      <Text className="mt-4 text-sm text-black">Guest captain</Text>
      <Text className="mt-0.5 text-xs text-black">
        For a team that isn&apos;t on SoccerAid — just a name, no account needed.
      </Text>
      <View className="mt-1 flex-row items-center gap-2">
        <TextInput
          value={guestName}
          onChangeText={setGuestName}
          placeholder="Captain's name"
          accessibilityLabel="Guest captain name"
          accessibilityHint="Creates a team captain without a SoccerAid account"
          onSubmitEditing={() => guestName.trim() && createGuestMutation.mutate(guestName.trim())}
          returnKeyType="done"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-black"
        />
        <Pressable
          onPress={() => createGuestMutation.mutate(guestName.trim())}
          disabled={!guestName.trim() || createGuestMutation.isPending}
          accessibilityLabel="Add guest captain"
          accessibilityHint="Creates and selects this guest captain"
          className={`items-center justify-center rounded-lg px-4 py-3 ${
            guestName.trim() && !createGuestMutation.isPending ? 'bg-black' : 'bg-gray-300'
          }`}
        >
          {createGuestMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-bold text-white">Add</Text>
          )}
        </Pressable>
      </View>
      {createGuestMutation.isError ? (
        <Text className="mt-2 text-sm text-red-700">
          Could not create guest captain — try again
          {__DEV__ && createGuestMutation.error instanceof Error
            ? ` (${createGuestMutation.error.message})`
            : ''}
        </Text>
      ) : null}
    </View>
  );
}
