import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useTeam } from '../../src/hooks/useTeams';

export default function TeamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: team, isLoading } = useTeam(id);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  if (!team) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-emerald-700">Team not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="items-center px-6 pb-16 pt-20"
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityLabel="Back to Teams"
        accessibilityHint="Returns to the teams list"
        className="self-start rounded-lg border border-emerald-300 px-4 py-2"
      >
        <Text className="font-bold text-emerald-700">← Back</Text>
      </Pressable>

      <View
        className="mt-6 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-100"
        style={{ width: 96, height: 96 }}
      >
        <Text className="text-4xl font-bold text-emerald-700">
          {team.name.trim().charAt(0).toUpperCase() || '?'}
        </Text>
      </View>

      <Text className="mt-3 text-2xl font-bold text-emerald-800">{team.name}</Text>

      <View className="mt-6 rounded-lg border border-emerald-200 bg-white p-4">
        <QRCode value={team.code} size={160} color="#065f46" backgroundColor="#ffffff" />
      </View>
      <Text className="mt-2 text-lg font-bold tracking-widest text-emerald-800">{team.code}</Text>
      <Text className="text-sm text-emerald-600">
        Share this code or QR for opponents to find you
      </Text>

      <View className="mt-6 w-full max-w-sm rounded-lg border border-emerald-200 bg-white/80 p-4">
        {team.captain ? (
          <>
            <Text className="text-sm text-emerald-700">Captain</Text>
            <Text className="mt-1 text-emerald-900">{team.captain.displayName}</Text>
          </>
        ) : null}

        {team.contactNumber ? (
          <>
            <Text className="mt-4 text-sm text-emerald-700">Contact number</Text>
            <Text className="mt-1 text-emerald-900">{team.contactNumber}</Text>
          </>
        ) : null}

        {team.place ? (
          <>
            <Text className="mt-4 text-sm text-emerald-700">Place</Text>
            <Text className="mt-1 text-emerald-900">{team.place}</Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
