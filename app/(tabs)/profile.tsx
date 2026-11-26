import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
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
  View,
} from 'react-native';

import { ApiError, apiClient } from '../../src/api/client';
import { meKeys } from '../../src/api/queryKeys';
import { ProfileEditCard } from '../../src/components/profile/ProfileEditCard';
import { ProfileStatsCard } from '../../src/components/profile/ProfileStatsCard';
import { StadiumBackdrop } from '../../src/components/ui/StadiumBackdrop';
import { Me, useMe } from '../../src/hooks/useMe';
import { usePlayerStats } from '../../src/hooks/usePlayers';
import { useAuthStore } from '../../src/stores/authStore';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default function Profile() {
  const { data: me, isPending: isMePending, isError: isMeError } = useMe();
  const stats = usePlayerStats(me?.player?.id);
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
    onError: (error) => console.error('PATCH /me failed:', error),
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
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  const isUsernameValid = USERNAME_PATTERN.test(username);
  const isValid = displayName.trim().length > 0 && isUsernameValid;
  const usernameTaken =
    mutation.error instanceof ApiError && mutation.error.code === 'USERNAME_TAKEN';
  const avatarLetter = (isEditing ? displayName : me?.name)?.trim().charAt(0).toUpperCase() || '?';

  if (isMePending || isMeError) {
    // On error this is a brief transitional state, not a dead end: app/(tabs)/_layout.tsx's
    // guard sees the same `useMe()` failure and immediately logs out + redirects to login — there
    // is no "stay here and retry" offered, since a failed account fetch always means login again.
    return (
      <View
        style={{ flex: 1, backgroundColor: '#0b140e', position: 'relative' }}
        className="items-center justify-center"
      >
        <StadiumBackdrop />
        <ActivityIndicator color="#ffffff" />
      </View>
    );
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
          {!isEditing ? (
            <View className="flex-row items-center justify-end gap-2.5">
              <Pressable
                onPress={startEditing}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                accessibilityHint="Opens the profile fields for editing"
                className="h-10 w-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
              >
                <Pencil color="#ffffff" size={18} />
              </Pressable>
              <Pressable
                onPress={handleLogout}
                accessibilityRole="button"
                accessibilityLabel="Log out"
                accessibilityHint="Signs you out of SoccerAid"
                className="h-10 w-10 items-center justify-center rounded-full border border-red-400/30 bg-red-500/20 active:bg-red-500/35"
              >
                <LogOut color="#fca5a5" size={18} />
              </Pressable>
            </View>
          ) : null}

          <View className={`items-center ${isEditing ? 'mt-4' : 'mt-2'}`}>
            <View className="relative">
              <View
                className="items-center justify-center rounded-full border-2 border-white/30 bg-white/15"
                style={{ width: 88, height: 88 }}
              >
                <Text className="text-3xl font-black text-white">{avatarLetter}</Text>
              </View>
              {isEditing ? (
                <View
                  className="absolute bottom-0 right-0 items-center justify-center rounded-full border-2 border-slate-900 bg-white"
                  style={{ width: 28, height: 28 }}
                >
                  <Camera color="#0f172a" size={14} />
                </View>
              ) : null}
            </View>

            {isEditing ? (
              <Text className="mt-2 text-xs font-medium text-slate-300">
                Photo upload coming soon
              </Text>
            ) : (
              <>
                <Text className="mt-3 text-2xl font-bold text-white">
                  {me?.name ?? 'Your profile'}
                </Text>
                {me?.username ? (
                  <View className="mt-1 rounded-full bg-white/15 px-3 py-0.5">
                    <Text className="text-xs font-medium text-slate-200">@{me.username}</Text>
                  </View>
                ) : null}
              </>
            )}
          </View>

          {isEditing ? (
            <ProfileEditCard
              displayName={displayName}
              onChangeDisplayName={setDisplayName}
              username={username}
              onChangeUsername={setUsername}
              bio={bio}
              onChangeBio={setBio}
              preferredPosition={preferredPosition}
              onChangePreferredPosition={setPreferredPosition}
              isUsernameValid={isUsernameValid}
              usernameTaken={usernameTaken}
              isValid={isValid}
              isPending={mutation.isPending}
              error={mutation.isError ? mutation.error : null}
              onCancel={() => setIsEditing(false)}
              onSave={() => mutation.mutate()}
            />
          ) : (
            <>
              <View className="mt-6 overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-sm">
                <View className="border-b border-slate-100 px-4 py-3.5">
                  <Text className="text-xs font-semibold text-slate-400">Bio</Text>
                  <Text className="mt-1 text-sm font-medium text-slate-900">
                    {me?.bio ?? 'No bio yet'}
                  </Text>
                </View>

                <View
                  className={`px-4 py-3.5 ${
                    me?.player?.preferredPosition ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <Text className="text-xs font-semibold text-slate-400">Phone</Text>
                  <Text className="mt-1 text-sm font-medium text-slate-900">{me?.phone}</Text>
                </View>

                {me?.player?.preferredPosition ? (
                  <View className="px-4 py-3.5">
                    <Text className="text-xs font-semibold text-slate-400">Preferred position</Text>
                    <Text className="mt-1 text-sm font-medium text-slate-900">
                      {me.player.preferredPosition}
                    </Text>
                  </View>
                ) : null}
              </View>

              {me?.player ? (
                <ProfileStatsCard stats={stats.data} isLoading={stats.isLoading} />
              ) : null}
            </>
          )}
        </ScrollView>

        <LinearGradient
          colors={['transparent', 'rgba(11, 20, 14, 0.75)', 'rgba(11, 20, 14, 0.96)']}
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
