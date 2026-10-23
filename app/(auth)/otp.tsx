import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { apiClient } from '../../src/api/client';
import { confirmOtp } from '../../src/api/firebasePhoneAuth';
import { useAuthStore } from '../../src/stores/authStore';

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  user: { id: string; phone: string; name: string | null };
}

export default function Otp() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [code, setCode] = useState('');
  const isValid = /^\d{6}$/.test(code);

  const mutation = useMutation({
    mutationFn: async () => {
      const idToken = await confirmOtp(code);
      return apiClient.post<AuthResult>('/auth/firebase/verify', { idToken });
    },
    onSuccess: async (result) => {
      await setTokens(result);
      router.replace(result.isNewUser ? '/(auth)/profile-setup' : '/(tabs)');
    },
  });

  return (
    <View className="flex-1 items-center justify-center bg-emerald-50 px-6">
      <View className="w-full max-w-sm rounded-lg border border-emerald-200 bg-white/80 p-6">
        <Text className="text-2xl font-bold text-emerald-800">Enter the code</Text>
        <Text className="mt-1 text-emerald-600">Sent to {phone}</Text>

        <TextInput
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="123456"
          accessibilityLabel="One-time code"
          accessibilityHint="Enter the 6-digit code sent by SMS"
          className="mt-6 rounded-lg border border-emerald-300 bg-white px-3 py-3 text-center text-lg tracking-widest text-emerald-900"
        />

        {mutation.isError ? (
          <Text className="mt-2 text-sm text-red-700">Incorrect or expired code — try again</Text>
        ) : null}

        <Pressable
          onPress={() => mutation.mutate()}
          disabled={!isValid || mutation.isPending}
          accessibilityLabel="Verify code"
          accessibilityHint="Confirms the code and signs you in"
          className={`mt-6 items-center rounded-lg py-3 ${
            isValid && !mutation.isPending ? 'bg-emerald-600' : 'bg-emerald-300'
          }`}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-bold text-white">Verify</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
