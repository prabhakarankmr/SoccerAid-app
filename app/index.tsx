import { Text, View } from 'react-native';

export default function Index() {
  // Solid fallback — the real screen gradient (§4) needs expo-linear-gradient,
  // NativeWind has no RN equivalent for bg-gradient-to-* utilities.
  return (
    <View className="flex-1 items-center justify-center bg-emerald-50 px-6">
      <Text className="text-3xl font-bold text-emerald-800">SoccerAid</Text>
      <Text className="mt-2 text-center text-emerald-600">
        Project scaffolded — screens land per FRONTEND_INSTRUCTIONS.md §5.
      </Text>
    </View>
  );
}
