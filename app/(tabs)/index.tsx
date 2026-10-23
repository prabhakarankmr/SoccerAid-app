import { Text, View } from 'react-native';

import { useMe } from '../../src/hooks/useMe';

export default function Home() {
  const { data: me } = useMe();

  return (
    <View className="flex-1 items-center justify-center bg-emerald-50 px-6">
      <Text className="text-2xl font-bold text-emerald-800">
        {me?.name ? `Welcome, ${me.name}` : 'Welcome to SoccerAid'}
      </Text>
      <Text className="mt-2 text-center text-emerald-600">
        Dashboard lands per FRONTEND_INSTRUCTIONS.md §5.7.
      </Text>
    </View>
  );
}
