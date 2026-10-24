import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  return <Redirect href={refreshToken ? '/(tabs)' : '/(auth)/login'} />;
}
