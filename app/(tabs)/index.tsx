import { router } from 'expo-router';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { StadiumBackdrop } from '../../src/components/ui/StadiumBackdrop';
import { useMe } from '../../src/hooks/useMe';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function formatToday(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function ActionCard({
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accentColor,
  title,
  description,
  ctaLabel,
  ctaColor,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
  accentColor: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaColor: string;
}) {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    scale.value = withTiming(0.97, { duration: 120, easing: EASE_OUT });
  };
  const onPressOut = () => {
    scale.value = withTiming(1, { duration: 180, easing: EASE_OUT });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      pressRetentionOffset={{ top: 12, left: 12, bottom: 12, right: 12 }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            shadowColor: '#0f172a',
            shadowOpacity: 0.1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 5,
            borderRadius: 20,
            overflow: 'hidden',
          },
        ]}
      >
        <View className="bg-white px-5 py-5">
          <Text className="text-xl font-bold text-slate-900">{title}</Text>
          <Text className="mt-1 text-xs leading-5 text-slate-400">{description}</Text>
          <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
            <Text className="text-xs font-semibold" style={{ color: ctaColor }}>
              {ctaLabel}
            </Text>
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: accentColor }}
            >
              <ArrowRight color="#ffffff" size={14} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function Home() {
  const { data: me } = useMe();
  const firstName = me?.name?.trim().split(' ')[0] ?? 'Player';

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0b140e',
      }}
    >
      <StadiumBackdrop scrollY={scrollY} />
      <Animated.ScrollView
        className="flex-1"
        contentContainerClassName="pb-32"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* ── Header ── */}
        <View className="w-full max-w-xl self-center px-6 pt-16 pb-8">
          <Text className="text-3xl font-bold text-white">Hey, {firstName}!</Text>
          <Text className="mt-1 text-sm font-medium text-emerald-200">{formatToday()}</Text>
          <Text className="mt-1 text-xs text-emerald-100/80">
            Ready to kick off? Choose an action below.
          </Text>
        </View>

        {/* ── Action cards floating over pitch ── */}
        <View className="w-full max-w-xl flex-1 self-center px-5 pb-16">
          <View className="mb-4">
            <ActionCard
              onPress={() => router.push('/match/new')}
              accessibilityLabel="Create match"
              accessibilityHint="Starts setting up a new match"
              accentColor="#059669"
              title="Create Match"
              description="3v3 to 11v11 formats with custom formations, live pitch tracking, timer, and events."
              ctaLabel="Setup Lineups & Kick Off"
              ctaColor="#059669"
            />
          </View>

          <ActionCard
            onPress={() => router.push('/tournament/new')}
            accessibilityLabel="Create tournament"
            accessibilityHint="Starts setting up a new tournament"
            accentColor="#d97706"
            title="Create Tournament"
            description="Multi-team tournament brackets, live points tables, standings, and top scorer awards."
            ctaLabel="Set Up Fixtures"
            ctaColor="#d97706"
          />
        </View>
      </Animated.ScrollView>
    </View>
  );
}
