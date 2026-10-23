import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { apiClient } from '../../src/api/client';
import { meKeys } from '../../src/api/queryKeys';
import { Me } from '../../src/hooks/useMe';

export default function ProfileSetup() {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [preferredPosition, setPreferredPosition] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.patch<Me>('/me', {
        displayName: displayName.trim(),
        preferredPosition: preferredPosition.trim() || undefined,
      }),
    onSuccess: (me) => {
      queryClient.setQueryData(meKeys.me, me);
      router.replace('/(tabs)');
    },
  });

  const isValid = displayName.trim().length > 0;

  return (
    <View className="flex-1 items-center justify-center bg-emerald-50 px-6">
      <View className="w-full max-w-sm rounded-lg border border-emerald-200 bg-white/80 p-6">
        <Text className="text-2xl font-bold text-emerald-800">Set up your profile</Text>
        <Text className="mt-1 text-emerald-600">This is how other players will see you.</Text>

        <Text className="mt-6 text-sm text-emerald-700">Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Virat K"
          accessibilityLabel="Display name"
          accessibilityHint="The name other players will see"
          className="mt-1 rounded-lg border border-emerald-300 bg-white px-3 py-3 text-base text-emerald-900"
        />

        <Text className="mt-4 text-sm text-emerald-700">Preferred position (optional)</Text>
        <TextInput
          value={preferredPosition}
          onChangeText={setPreferredPosition}
          placeholder="e.g. Striker"
          accessibilityLabel="Preferred position"
          accessibilityHint="Optional — the position you usually play"
          className="mt-1 rounded-lg border border-emerald-300 bg-white px-3 py-3 text-base text-emerald-900"
        />

        {mutation.isError ? (
          <Text className="mt-2 text-sm text-red-700">Could not save — try again</Text>
        ) : null}

        <Pressable
          onPress={() => mutation.mutate()}
          disabled={!isValid || mutation.isPending}
          accessibilityLabel="Save profile and continue"
          accessibilityHint="Saves your profile and takes you to the home screen"
          className={`mt-6 items-center rounded-lg py-3 ${
            isValid && !mutation.isPending ? 'bg-emerald-600' : 'bg-emerald-300'
          }`}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-bold text-white">Continue</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
