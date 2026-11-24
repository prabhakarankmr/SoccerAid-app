import { LinearGradient } from 'expo-linear-gradient';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Play from 'lucide-react-native/icons/play';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { MatchTeamRef, Side } from '../../hooks/useMatches';

const pitchBg = require('../../../assets/pitch-bg.jpg');

interface PreMatchKickoffViewProps {
  homeTeam: MatchTeamRef;
  awayTeam: MatchTeamRef;
  playersPerSide: number;
  canScore: boolean;
  isStarting: boolean;
  isError: boolean;
  onStartMatch: (side: Side) => void;
  onBack: () => void;
}

export function PreMatchKickoffView({
  homeTeam,
  awayTeam,
  playersPerSide,
  canScore,
  isStarting,
  isError,
  onStartMatch,
  onBack,
}: PreMatchKickoffViewProps) {
  const [startingSide, setStartingSide] = useState<Side | null>(null);

  const translateY = useSharedValue(24);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 450 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
  }, [opacity, translateY]);

  const activeSide = isStarting ? startingSide : null;

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleKickoff = (side: Side) => {
    if (isStarting) return;
    setStartingSide(side);
    onStartMatch(side);
  };

  const kickoffTeams = [
    {
      side: 'HOME' as const,
      team: homeTeam,
      tag: 'Team A',
      borderClass: 'border-orange-500/60',
      bgClass: 'bg-orange-950/40 active:bg-orange-900/50',
      shadowColor: '#ea580c',
      avatarBorder: 'border-orange-400/60',
      avatarBg: 'bg-orange-500/20',
      textAccent: 'text-orange-400',
      subtextAccent: 'text-orange-300',
      btnBg: 'bg-orange-500',
    },
    {
      side: 'AWAY' as const,
      team: awayTeam,
      tag: 'Team B',
      borderClass: 'border-blue-500/60',
      bgClass: 'bg-blue-950/40 active:bg-blue-900/50',
      shadowColor: '#2563eb',
      avatarBorder: 'border-blue-400/60',
      avatarBg: 'bg-blue-500/20',
      textAccent: 'text-blue-400',
      subtextAccent: 'text-blue-300',
      btnBg: 'bg-blue-600',
    },
  ];

  return (
    <View className="flex-1 bg-[#0b140e]">
      {/* Stadium Pitch Backdrop */}
      <Image
        source={pitchBg}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
      />
      {/* Dark Contrast Scrim & Floodlight Gradients */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(11, 20, 14, 0.85)' }]} />
      <LinearGradient
        colors={[
          'rgba(52, 211, 153, 0.28)',
          'rgba(16, 185, 129, 0.12)',
          'rgba(6, 25, 16, 0.65)',
          'rgba(11, 20, 14, 0.96)',
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.16)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.35 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-16 pt-12"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-xl self-center">
          {/* Header Bar */}
          <View className="flex-row items-center justify-between pb-6">
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back to Lineup"
              accessibilityHint="Returns to lineup and tactical setup"
              className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 active:bg-white/20"
            >
              <ArrowLeft color="#ffffff" size={20} />
            </Pressable>
            <View className="flex-row items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-950/70 px-3 py-1">
              <View className="h-2 w-2 rounded-full bg-emerald-400" />
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                Kickoff Ready
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Smooth Entrance Content */}
          <Animated.View style={animatedCardStyle}>
            {/* Matchup Preview Card */}
            <View
              style={{
                shadowColor: '#000000',
                shadowOpacity: 0.45,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
                elevation: 8,
              }}
              className="rounded-3xl border border-white/20 bg-slate-950/85 p-6 backdrop-blur-md"
            >
              <View className="flex-row items-center justify-between">
                {/* Team A (Home) */}
                <View className="flex-1 items-center">
                  <View
                    style={{ width: 64, height: 64 }}
                    className="items-center justify-center rounded-full border-2 border-orange-500/80 bg-orange-500/20 shadow-md"
                  >
                    {homeTeam.logoUrl ? (
                      <Image
                        source={{ uri: homeTeam.logoUrl }}
                        style={{ width: 60, height: 60, borderRadius: 30 }}
                        accessibilityIgnoresInvertColors
                      />
                    ) : (
                      <Text className="text-2xl font-black text-orange-400">
                        {homeTeam.name.trim().charAt(0).toUpperCase() || 'A'}
                      </Text>
                    )}
                  </View>
                  <Text className="mt-2.5 text-[10px] font-extrabold uppercase tracking-widest text-orange-400">
                    Team A
                  </Text>
                  <Text
                    className="mt-0.5 text-center text-sm font-bold text-white"
                    numberOfLines={1}
                  >
                    {homeTeam.name}
                  </Text>
                </View>

                {/* VS Center Badge */}
                <View className="mx-2 items-center justify-center">
                  <View
                    style={{
                      shadowColor: '#10b981',
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                    className="h-11 w-11 items-center justify-center rounded-full border border-emerald-400/40 bg-slate-900"
                  >
                    <Text className="text-xs font-black tracking-widest text-white">VS</Text>
                  </View>
                  <View className="mt-2 rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                      {playersPerSide}v{playersPerSide}
                    </Text>
                  </View>
                </View>

                {/* Team B (Away) */}
                <View className="flex-1 items-center">
                  <View
                    style={{ width: 64, height: 64 }}
                    className="items-center justify-center rounded-full border-2 border-blue-500/80 bg-blue-500/20 shadow-md"
                  >
                    {awayTeam.logoUrl ? (
                      <Image
                        source={{ uri: awayTeam.logoUrl }}
                        style={{ width: 60, height: 60, borderRadius: 30 }}
                        accessibilityIgnoresInvertColors
                      />
                    ) : (
                      <Text className="text-2xl font-black text-blue-400">
                        {awayTeam.name.trim().charAt(0).toUpperCase() || 'B'}
                      </Text>
                    )}
                  </View>
                  <Text className="mt-2.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-400">
                    Team B
                  </Text>
                  <Text
                    className="mt-0.5 text-center text-sm font-bold text-white"
                    numberOfLines={1}
                  >
                    {awayTeam.name}
                  </Text>
                </View>
              </View>
            </View>

            {/* Kickoff Section */}
            {canScore ? (
              <View className="mt-7">
                <Text className="text-center text-xs font-extrabold uppercase tracking-widest text-slate-300">
                  Select Kickoff Team
                </Text>
                <Text className="mt-1 text-center text-xs text-slate-400">
                  Choose which team starts with the ball
                </Text>

                {isError ? (
                  <View className="mt-4 rounded-xl border border-red-500/40 bg-red-950/80 p-3">
                    <Text className="text-center text-xs font-semibold text-red-200">
                      Could not start the match — please tap to try again.
                    </Text>
                  </View>
                ) : null}

                {kickoffTeams.map((item) => {
                  const isCurrentStarting = activeSide === item.side;
                  const isOtherStarting = activeSide !== null && activeSide !== item.side;

                  return (
                    <Pressable
                      key={item.side}
                      onPress={() => handleKickoff(item.side)}
                      disabled={isStarting}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.team.name} kicks off`}
                      accessibilityHint={`Starts the match clock with ${item.tag} kicking off`}
                      style={{
                        shadowColor: item.shadowColor,
                        shadowOpacity: 0.25,
                        shadowRadius: 10,
                        elevation: 3,
                      }}
                      className={`mt-3.5 flex-row items-center justify-between rounded-2xl border-2 ${item.borderClass} ${item.bgClass} p-4 ${
                        isOtherStarting ? 'opacity-40' : 'opacity-100'
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <View
                          className={`h-10 w-10 items-center justify-center rounded-full border ${item.avatarBorder} ${item.avatarBg}`}
                        >
                          <Text className={`text-base font-black ${item.textAccent}`}>
                            {item.team.name.trim().charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-base font-bold text-white" numberOfLines={1}>
                            {item.team.name}
                          </Text>
                          <Text className={`text-xs font-semibold ${item.subtextAccent}`}>
                            Tap to kick off
                          </Text>
                        </View>
                      </View>

                      <View
                        className={`h-11 w-11 items-center justify-center rounded-full ${item.btnBg} shadow-md`}
                      >
                        {isCurrentStarting ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <Play color="#ffffff" size={18} fill="#ffffff" />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View className="mt-8 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <Text className="text-center text-sm font-medium text-slate-300">
                  Waiting for match officials or team captains to kick off...
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
