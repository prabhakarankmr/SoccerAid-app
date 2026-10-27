import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import Camera from 'lucide-react-native/icons/camera';
import LogOut from 'lucide-react-native/icons/log-out';
import Pencil from 'lucide-react-native/icons/pencil';
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
import { Me, useMe } from '../../src/hooks/useMe';
import { useAuthStore } from '../../src/stores/authStore';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default function Profile() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  const [isEditing, setIsEditing] = useState(false);
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
    onSuccess: (updated) => {
      queryClient.setQueryData(meKeys.me, updated);
      setIsEditing(false);
    },
    onError: (error) => {
      // The on-screen message is deliberately generic; the real error (ApiError has
      // .code/.message from the backend's envelope, or a network/validation error
      // otherwise) goes to the console so it's actually diagnosable.
      console.error('PATCH /me failed:', error);
    },
  });

  function startEditing() {
    setDisplayName(me?.name ?? '');
    setUsername(me?.username ?? '');
    setBio(me?.bio ?? '');
    setPreferredPosition(me?.player?.preferredPosition ?? '');
    mutation.reset();
    setIsEditing(true);
  }

  async function handleLogout() {
    await logout();
    // Cached `me` (and anything else) belongs to the session that just ended — don't let
    // the next login flash stale data from a different account.
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  const isUsernameValid = USERNAME_PATTERN.test(username);
  const isValid = displayName.trim().length > 0 && isUsernameValid;
  const usernameTaken =
    mutation.error instanceof ApiError && mutation.error.code === 'USERNAME_TAKEN';
  const avatarLetter = (isEditing ? displayName : me?.name)?.trim().charAt(0).toUpperCase() || '?';

  return (
    // KeyboardAvoidingView + ScrollView, not a plain View: without this the keyboard covers
    // whichever field is focused instead of the screen scrolling it into view (§9).
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="px-6 pb-32 pt-20"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center">
          <View className="relative">
            {/* Letter-avatar fallback — a real photo comes later via file storage; this isn't
              a stub, it's the permanent empty/no-photo state most apps show regardless. The
              camera badge in edit mode signals where upload will go without pretending it
              works yet — tapping it would be a dead end, so it's not pressable. */}
            <View
              className="items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100"
              style={{ width: 88, height: 88 }}
            >
              <Text className="text-3xl font-bold text-black">{avatarLetter}</Text>
            </View>
            {isEditing ? (
              <View
                className="absolute bottom-0 right-0 items-center justify-center rounded-full border-2 border-gray-300 bg-black"
                style={{ width: 28, height: 28 }}
              >
                <Camera color="#ffffff" size={14} />
              </View>
            ) : null}
          </View>
          {isEditing ? (
            <Text className="mt-2 text-xs text-black">Photo upload coming soon</Text>
          ) : (
            <>
              <Text className="mt-3 text-xl font-bold text-black">
                {me?.name ?? 'Your profile'}
              </Text>
              {me?.username ? <Text className="text-black">@{me.username}</Text> : null}
            </>
          )}
        </View>

        {isEditing ? (
          <View className="mt-6">
            <Text className="text-sm text-black">Display name</Text>
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

            <Text className="mt-4 text-sm text-black">Bio</Text>
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

            <Text className="mt-4 text-sm text-black">Preferred position</Text>
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

            <View className="mt-6 flex-row gap-3">
              <Pressable
                onPress={() => setIsEditing(false)}
                disabled={mutation.isPending}
                accessibilityLabel="Cancel editing"
                accessibilityHint="Discards changes and returns to your profile"
                className="flex-1 items-center rounded-lg border border-gray-300 py-3"
              >
                <Text className="font-bold text-black">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => mutation.mutate()}
                disabled={!isValid || mutation.isPending}
                accessibilityLabel="Save profile"
                accessibilityHint="Saves your changes"
                className={`flex-1 items-center rounded-lg py-3 ${
                  isValid && !mutation.isPending ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                {mutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="font-bold text-white">Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View className="mt-6 rounded-lg border border-gray-300 bg-white/80 p-4">
              <Text className="text-sm text-black">Bio</Text>
              <Text className="mt-1 text-black">{me?.bio ?? 'No bio yet'}</Text>

              <Text className="mt-4 text-sm text-black">Phone</Text>
              <Text className="mt-1 text-black">{me?.phone}</Text>

              {me?.player?.preferredPosition ? (
                <>
                  <Text className="mt-4 text-sm text-black">Preferred position</Text>
                  <Text className="mt-1 text-black">{me.player.preferredPosition}</Text>
                </>
              ) : null}
            </View>

            <Pressable
              onPress={startEditing}
              accessibilityLabel="Edit profile"
              accessibilityHint="Opens the profile fields for editing"
              className="mt-6 flex-row items-center justify-center rounded-lg bg-black px-5 py-4"
            >
              <Pencil color="#ffffff" size={18} />
              <Text className="ml-2 text-base font-bold text-white">Edit Profile</Text>
            </Pressable>

            <Pressable
              onPress={handleLogout}
              accessibilityLabel="Log out"
              accessibilityHint="Signs you out of SoccerAid"
              className="mt-3 flex-row items-center justify-center rounded-lg border border-red-300 bg-red-50 px-5 py-4"
            >
              <LogOut color="#b91c1c" size={20} />
              <Text className="ml-2 text-base font-bold text-red-700">Log out</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
