import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import Camera from 'lucide-react-native/icons/camera';
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

import { apiClient } from '../../src/api/client';
import { CaptainPicker } from '../../src/components/team/CaptainPicker';
import { PlayerSummary } from '../../src/hooks/usePlayers';
import { TeamSummary } from '../../src/hooks/useTeams';

export default function NewTeam() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [place, setPlace] = useState('');
  const [selectedCaptain, setSelectedCaptain] = useState<PlayerSummary | null>(null);

  const createTeamMutation = useMutation({
    mutationFn: () =>
      apiClient.post<TeamSummary>('/teams', {
        name: name.trim(),
        captainPlayerId: selectedCaptain?.id,
        contactNumber: contactNumber.trim() || undefined,
        place: place.trim() || undefined,
      }),
    onSuccess: (team) => {
      // Covers the owned/opponents/detail list all at once — TanStack Query matches by key
      // prefix, and every team query key starts with 'teams' (src/api/queryKeys.ts).
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
      router.replace({ pathname: '/teams/[id]', params: { id: team.id } });
    },
    onError: (error) => {
      console.error('POST /teams failed:', error);
    },
  });

  const isValid = name.trim().length > 0 && Boolean(selectedCaptain);

  return (
    // KeyboardAvoidingView + ScrollView, not a plain View: this form is tall (logo, 4
    // fields, captain search results) — the keyboard would otherwise cover whichever field
    // is focused instead of the screen scrolling it into view (FRONTEND_INSTRUCTIONS.md §9).
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="px-6 pb-16 pt-20"
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back to Teams"
          accessibilityHint="Returns to the teams list without saving"
          className="self-start rounded-lg border border-gray-300 px-4 py-2"
        >
          <Text className="font-bold text-black">← Back to Teams</Text>
        </Pressable>

        <Text className="mt-6 text-2xl font-bold text-black">Add Team</Text>
        <Text className="mt-1 text-black">Set up your team profile.</Text>

        {/* Logo placeholder — same pattern as the profile avatar: not a stub, this is the
            permanent no-photo state; the camera badge marks where upload will go later. */}
        <View className="mt-4 items-center">
          <View className="relative">
            <View
              className="items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100"
              style={{ width: 88, height: 88 }}
            >
              <Text className="text-3xl font-bold text-black">
                {name.trim() ? name.trim().charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View
              className="absolute bottom-0 right-0 items-center justify-center rounded-full border-2 border-white bg-black"
              style={{ width: 28, height: 28 }}
            >
              <Camera color="#ffffff" size={14} />
            </View>
          </View>
          <Text className="mt-2 text-xs text-black">Photo upload coming soon</Text>
        </View>

        <Text className="mt-6 text-sm text-black">Team name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Riverside FC"
          accessibilityLabel="Team name"
          accessibilityHint="The name shown for this team"
          className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-black"
        />

        {/* Captain: a real app user (exact phone/username lookup) or a guest with no account —
            e.g. an opponent team that isn't on SoccerAid at all (FRONTEND_INSTRUCTIONS.md §5.9). */}
        {selectedCaptain ? (
          <>
            <Text className="mt-4 text-sm text-black">Captain</Text>
            <View className="mt-1 flex-row items-center justify-between rounded-lg border border-gray-300 bg-gray-100 px-3 py-3">
              <Text className="text-base text-black">{selectedCaptain.displayName}</Text>
              <Pressable
                onPress={() => setSelectedCaptain(null)}
                accessibilityLabel="Change captain"
                accessibilityHint="Clears the selected captain so you can search again"
              >
                <Text className="font-bold text-black">Change</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View className="mt-4">
            <CaptainPicker onSelect={setSelectedCaptain} />
          </View>
        )}

        <Text className="mt-4 text-sm text-black">Contact number</Text>
        <TextInput
          value={contactNumber}
          onChangeText={setContactNumber}
          placeholder="e.g. 98765 43210"
          keyboardType="phone-pad"
          accessibilityLabel="Contact number"
          accessibilityHint="Optional — a phone number for this team"
          className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-black"
        />

        <Text className="mt-4 text-sm text-black">Place</Text>
        <TextInput
          value={place}
          onChangeText={setPlace}
          placeholder="e.g. Riverside Ground, Chennai"
          accessibilityLabel="Place"
          accessibilityHint="Optional — where this team is based or usually plays"
          className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-black"
        />

        {createTeamMutation.isError ? (
          <Text className="mt-2 text-sm text-red-700">
            Could not save — try again
            {__DEV__ && createTeamMutation.error instanceof Error
              ? ` (${createTeamMutation.error.message})`
              : ''}
          </Text>
        ) : null}

        <Pressable
          onPress={() => createTeamMutation.mutate()}
          disabled={!isValid || createTeamMutation.isPending}
          accessibilityLabel="Save team"
          accessibilityHint="Creates the team and opens its details"
          className={`mt-6 items-center rounded-lg py-3 ${
            isValid && !createTeamMutation.isPending ? 'bg-black' : 'bg-gray-300'
          }`}
        >
          {createTeamMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-bold text-white">Save</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
