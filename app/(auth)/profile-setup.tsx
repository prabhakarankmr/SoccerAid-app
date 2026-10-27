import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
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

import { ApiError, apiClient } from '../../src/api/client';
import { meKeys } from '../../src/api/queryKeys';
import { Me } from '../../src/hooks/useMe';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default function ProfileSetup() {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [preferredPosition, setPreferredPosition] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.patch<Me>('/me', {
        displayName: displayName.trim(),
        username,
        bio: bio.trim() || undefined,
        preferredPosition: preferredPosition.trim() || undefined,
      }),
    onSuccess: (me) => {
      queryClient.setQueryData(meKeys.me, me);
      router.replace('/(tabs)');
    },
    onError: (error) => {
      // The on-screen message is deliberately generic; the real error (ApiError has
      // .code/.message from the backend's envelope, or a network/validation error
      // otherwise) goes to the console so it's actually diagnosable.
      console.error('PATCH /me failed:', error);
    },
  });

  const isUsernameValid = USERNAME_PATTERN.test(username);
  const isValid = displayName.trim().length > 0 && isUsernameValid;
  const usernameTaken =
    mutation.error instanceof ApiError && mutation.error.code === 'USERNAME_TAKEN';

  return (
    // KeyboardAvoidingView + ScrollView, not a plain View: this form is tall enough (4
    // fields + avatar) that the keyboard can cover whichever field is focused instead of
    // the screen scrolling it into view (§9).
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="flex-grow items-center justify-center px-6 py-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-sm rounded-lg border border-gray-300 bg-white/80 p-6">
          <Text className="text-2xl font-bold text-black">Set up your profile</Text>
          <Text className="mt-1 text-black">This is how other players will see you.</Text>

          {/* Letter-avatar fallback — a real photo comes later via file storage; this isn't a
            stub, it's the permanent empty/no-photo state most apps show regardless. */}
          <View className="mt-4 items-center">
            <View
              className="items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100"
              style={{ width: 88, height: 88 }}
            >
              <Text className="text-3xl font-bold text-black">
                {displayName.trim() ? displayName.trim().charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          </View>

          <Text className="mt-6 text-sm text-black">Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Virat K"
            accessibilityLabel="Display name"
            accessibilityHint="The name other players will see"
            className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-black"
          />

          <Text className="mt-4 text-sm text-black">Username</Text>
          <View className="mt-1 flex-row items-center rounded-lg border border-gray-300 bg-white px-3">
            <Text className="text-base text-black">@</Text>
            <TextInput
              value={username}
              onChangeText={(text) =>
                setUsername(
                  text
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, '')
                    .slice(0, 20),
                )
              }
              placeholder="yourname"
              autoCapitalize="none"
              accessibilityLabel="Username"
              accessibilityHint="3 to 20 characters: lowercase letters, numbers, underscores"
              className="ml-1 flex-1 py-3 text-base text-black"
            />
          </View>
          {username.length > 0 && !isUsernameValid ? (
            <Text className="mt-1 text-sm text-red-700">
              3-20 characters: lowercase letters, numbers, underscores only
            </Text>
          ) : null}
          {usernameTaken ? (
            <Text className="mt-1 text-sm text-red-700">That username is already taken</Text>
          ) : null}

          <Text className="mt-4 text-sm text-black">Bio (optional)</Text>
          <TextInput
            value={bio}
            onChangeText={(text) => setBio(text.slice(0, 160))}
            placeholder="Tell other players a bit about yourself"
            multiline
            numberOfLines={3}
            maxLength={160}
            accessibilityLabel="Bio"
            accessibilityHint="Optional — a short description shown on your profile"
            className="mt-1 h-20 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-black"
            style={{ textAlignVertical: 'top' }}
          />

          <Text className="mt-4 text-sm text-black">Preferred position (optional)</Text>
          <TextInput
            value={preferredPosition}
            onChangeText={setPreferredPosition}
            placeholder="e.g. Striker"
            accessibilityLabel="Preferred position"
            accessibilityHint="Optional — the position you usually play"
            className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-black"
          />

          {mutation.isError && !usernameTaken ? (
            <Text className="mt-2 text-sm text-red-700">
              Could not save — try again
              {__DEV__ && mutation.error instanceof Error ? ` (${mutation.error.message})` : ''}
            </Text>
          ) : null}

          <Pressable
            onPress={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            accessibilityLabel="Save profile and continue"
            accessibilityHint="Saves your profile and takes you to the home screen"
            className={`mt-6 items-center rounded-lg py-3 ${
              isValid && !mutation.isPending ? 'bg-black' : 'bg-gray-300'
            }`}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-bold text-white">Continue</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
