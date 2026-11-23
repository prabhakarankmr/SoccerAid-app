import { router } from 'expo-router';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useMe } from '../../src/hooks/useMe';

const pitchBg = require('../../assets/pitch-bg.jpg');

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
  const scale = new Animated.Value(1);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          shadowColor: '#0f172a',
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 5,
          borderRadius: 20,
          overflow: 'hidden',
        }}
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

  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0d2015',
      }}
    >
      <Image
        source={pitchBg}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.25)' }]} />
      <ScrollView className="flex-1" contentContainerClassName="pb-32">
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
      </ScrollView>
    </View>
  );
}
