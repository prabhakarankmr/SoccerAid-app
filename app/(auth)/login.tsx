import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { sendOtp } from '../../src/api/firebasePhoneAuth';

const logo = require('../../assets/logo.png');

const INDIA_LOCAL_NUMBER = /^[6-9]\d{9}$/;

// Must match RECAPTCHA_CONTAINER_ID in src/api/firebasePhoneAuth.web.ts — web-only phone
// auth needs a real DOM node to bind its reCAPTCHA verifier to (FRONTEND_INSTRUCTIONS.md
// §11.1). Duplicated instead of imported: Metro resolves `firebasePhoneAuth` to the right
// platform file at bundle time, but `tsc` always type-checks the base (native) one, which
// doesn't export this constant.
const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

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
    onError: (error) => {
      // The on-screen message is deliberately generic for users; the real Firebase error
      // (invalid-api-key, operation-not-allowed, unauthorized-domain, ...) goes to the
      // console so it's actually diagnosable instead of guessed at.
      console.error('sendOtp failed:', error);
    },
  });

  return (
    // KeyboardAvoidingView, not a plain View: without this the keyboard covers the phone
    // input instead of the screen shifting it into view (§9).
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 items-center justify-center bg-white px-6"
    >
      {Platform.OS === 'web' ? <View nativeID={RECAPTCHA_CONTAINER_ID} /> : null}

      {/* Explicit style, not h-32 w-32: NativeWind didn't apply sizing classes to this
          Image, so it fell back to the asset's intrinsic 900x896 and filled the screen. */}
      <Image
        source={logo}
        className="mb-4"
        style={{ width: 128, height: 128 }}
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
            {__DEV__ && mutation.error instanceof Error ? ` (${mutation.error.message})` : ''}
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
    </KeyboardAvoidingView>
  );
}
