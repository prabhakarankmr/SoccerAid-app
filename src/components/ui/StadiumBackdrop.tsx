import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const pitchBg = require('../../../assets/pitch-bg.jpg');

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export interface StadiumBackdropProps {
  /** Optional scroll Y shared value to drive subtle physical depth parallax */
  scrollY?: SharedValue<number>;
  /** Incrementing number (e.g. total goals scored) that triggers the goal celebration glow */
  celebrateTrigger?: number;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Optional children if used as a container wrapper */
  children?: React.ReactNode;
}

export function StadiumBackdrop({
  scrollY,
  celebrateTrigger,
  style,
  children,
}: StadiumBackdropProps) {
  const reducedMotion = useReducedMotion();
  const celebrationOpacity = useSharedValue(0);
  const prevTriggerRef = useRef(celebrateTrigger ?? 0);

  // Goal celebration wave: triggers when celebrateTrigger increases
  useEffect(() => {
    const current = celebrateTrigger ?? 0;
    if (current > prevTriggerRef.current) {
      prevTriggerRef.current = current;
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Fallback for web or devices without haptics
      }
      celebrationOpacity.value = withSequence(
        withTiming(1, { duration: 180, easing: EASE_OUT }),
        withTiming(0, { duration: 750, easing: EASE_OUT }),
      );
    } else {
      prevTriggerRef.current = current;
    }
  }, [celebrateTrigger, celebrationOpacity]);

  // Parallax transform: moves at 12% scroll speed, slightly scaled to prevent border clipping
  const animatedPitchStyle = useAnimatedStyle(() => {
    if (reducedMotion || !scrollY) {
      return {
        transform: [{ scale: 1.0 }],
      };
    }
    // Subtle physical depth: when scrolling down, content moves up, pitch moves at -12% rate
    const translateY = scrollY.value * -0.12;
    return {
      transform: [{ translateY }, { scale: 1.08 }],
    };
  });

  const celebrationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: celebrationOpacity.value,
  }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.container, style]} pointerEvents="none">
      {/* ── 1. Scaled pitch photo with smooth parallax worklet ── */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedPitchStyle]}>
        <Image
          source={pitchBg}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          style={[StyleSheet.absoluteFill, styles.fullSize]}
        />
      </Animated.View>

      {/* ── 2. Deep stadium turf base tint ── */}
      <View style={[StyleSheet.absoluteFill, styles.turfTint]} />

      {/* ── 3. Champions League Atmospheric Floodlights (Top down) ── */}
      <LinearGradient
        colors={[
          'rgba(56, 189, 248, 0.24)', // Electric sky floodlight glare at the very top
          'rgba(16, 185, 129, 0.16)', // Emerald atmospheric haze on pitch
          'rgba(6, 25, 16, 0.65)', // Natural turf shadow
          'rgba(11, 20, 14, 0.96)', // Deep bottom vignette for crisp card contrast
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── 4. Overhead Spotlight Glare Beam ── */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.22)', 'rgba(255, 255, 255, 0.04)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.32 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── 5. Edge Vignette for Foreground Separation ── */}
      <LinearGradient
        colors={['rgba(2, 6, 23, 0.40)', 'transparent', 'rgba(2, 6, 23, 0.65)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── 6. Goal Celebration Stadium Glow Wave ── */}
      <Animated.View style={[StyleSheet.absoluteFill, celebrationAnimatedStyle]}>
        <LinearGradient
          colors={[
            'rgba(251, 191, 36, 0.50)', // Warm golden celebration flash
            'rgba(52, 211, 153, 0.30)', // Emerald stadium bloom
            'transparent',
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.85 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0b140e',
    overflow: 'hidden',
  },
  fullSize: {
    width: '100%',
    height: '100%',
  },
  turfTint: {
    backgroundColor: 'rgba(11, 20, 14, 0.75)',
  },
});
