import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';

import { sendOtp } from '../../src/api/firebasePhoneAuth';

const logo = require('../../assets/logo.png');

const INDIA_LOCAL_NUMBER = /^[6-9]\d{9}$/;

export default function Login() {
  const [digits, setDigits] = useState('');
  const isValid = INDIA_LOCAL_NUMBER.test(digits);

  const mutation = useMutation({
    mutationFn: async () => {
      const phone = `+91${digits}`;
      await sendOtp(phone);
      return phone;
    },
    onSuccess: (phone) => {
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    },
  });

  return (
    <View className="flex-1 items-center justify-center bg-emerald-50 px-6">
      <Image
        source={logo}
        className="mb-4 h-32 w-32"
        resizeMode="contain"
        accessible={false}
        importantForAccessibility="no"
        accessibilityIgnoresInvertColors
      />

      <View className="w-full max-w-sm rounded-lg border border-emerald-200 bg-white/80 p-6">
        <Text className="text-2xl font-bold text-emerald-800">Enter your phone number</Text>
        <Text className="mt-1 text-emerald-600">A one-time code will be sent to verify it.</Text>

        <View className="mt-6 flex-row items-center rounded-lg border border-emerald-300 bg-white px-3">
          <Text className="text-base text-emerald-700">+91</Text>
          <TextInput
            value={digits}
            onChangeText={(text) => setDigits(text.replace(/\D/g, '').slice(0, 10))}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="98765 43210"
            accessibilityLabel="Phone number"
            accessibilityHint="Enter your 10-digit Indian mobile number"
            className="ml-2 flex-1 py-3 text-base text-emerald-900"
          />
        </View>

        {!isValid && digits.length > 0 ? (
          <Text className="mt-2 text-sm text-red-700">
            Enter a valid 10-digit Indian mobile number
          </Text>
        ) : null}
        {mutation.isError ? (
          <Text className="mt-2 text-sm text-red-700">
            Could not send the OTP — check the number and try again
          </Text>
        ) : null}

        <Pressable
          onPress={() => mutation.mutate()}
          disabled={!isValid || mutation.isPending}
          accessibilityLabel="Send OTP"
          accessibilityHint="Sends a one-time verification code by SMS"
          className={`mt-6 items-center rounded-lg py-3 ${
            isValid && !mutation.isPending ? 'bg-emerald-600' : 'bg-emerald-300'
          }`}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-bold text-white">Send OTP</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
