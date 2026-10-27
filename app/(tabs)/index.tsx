import { router } from 'expo-router';
// Subpath imports, not `import { Goal, Trophy } from 'lucide-react-native'`: the barrel
// entry pulled the whole icon set into this chunk under Metro's web bundler (2.3MB for two
// icons, confirmed) despite the package's sideEffects:false — these `/icons/*` exports are
// what lucide-react-native ships specifically to avoid that. (This used to crash `tsc` with
// "Maximum call stack size exceeded" — turned out to be Node's default stack size on
// Windows, unrelated to this import pattern; see the `typecheck` script in package.json.)
import Goal from 'lucide-react-native/icons/goal';
import Trophy from 'lucide-react-native/icons/trophy';
import { Pressable, Text, View } from 'react-native';

import { useMe } from '../../src/hooks/useMe';

export default function Home() {
  const { data: me } = useMe();

  return (
    <View className="flex-1 bg-white px-6 pb-32 pt-20">
      <Text className="text-2xl font-bold text-black">
        {me?.name ? `Welcome, ${me.name}` : 'Welcome to SoccerAid'}
      </Text>
      <Text className="mt-1 text-black">What would you like to set up?</Text>

      <Pressable
        onPress={() => router.push('/match/new')}
        accessibilityLabel="Create match"
        accessibilityHint="Starts setting up a new match"
        className="mt-6 flex-row items-center rounded-lg bg-black px-5 py-4"
      >
        <Goal color="#ffffff" size={22} />
        <Text className="ml-3 text-base font-bold text-white">Create Match</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/tournament/new')}
        accessibilityLabel="Create tournament"
        accessibilityHint="Starts setting up a new tournament"
        className="mt-3 flex-row items-center rounded-lg bg-blue-600 px-5 py-4"
      >
        <Trophy color="#ffffff" size={22} />
        <Text className="ml-3 text-base font-bold text-white">Create Tournament</Text>
      </Pressable>
    </View>
  );
}
