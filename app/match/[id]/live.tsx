import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function MatchLive() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <Pressable
        onPress={() => router.replace('/(tabs)')}
        accessibilityLabel="Back to Dashboard"
        accessibilityHint="Returns to the home screen"
        className="self-start rounded-lg border border-gray-300 px-4 py-2"
      >
        <Text className="font-bold text-black">← Back to Dashboard</Text>
      </Pressable>

      <Text className="mt-6 text-2xl font-bold text-black">Lineup saved</Text>
      <Text className="mt-1 text-black">
        Match {id} is ready — live scoring lands per FRONTEND_INSTRUCTIONS.md §5.3.
      </Text>
    </View>
  );
}
