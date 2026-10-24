import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function TournamentSetup() {
  return (
    <View className="flex-1 bg-emerald-50 px-6 pt-20">
      <Pressable
        onPress={() => router.back()}
        accessibilityLabel="Back to Dashboard"
        accessibilityHint="Returns to the home screen"
        className="self-start rounded-lg border border-emerald-300 px-4 py-2"
      >
        <Text className="font-bold text-emerald-700">← Back to Dashboard</Text>
      </Pressable>

      <Text className="mt-6 text-2xl font-bold text-emerald-800">New Tournament</Text>
      <Text className="mt-1 text-emerald-600">
        Tournament setup lands per FRONTEND_INSTRUCTIONS.md §5.5.
      </Text>
    </View>
  );
}
