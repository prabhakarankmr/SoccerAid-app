import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  AccessibilityRole,
  AccessibilityState,
  GestureResponderEvent,
  Insets,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export interface ScalePressableProps {
  onPress?: (event: GestureResponderEvent) => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  activeScale?: number;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  style?: StyleProp<ViewStyle>;
  className?: string;
  pressRetentionOffset?: Insets;
  hitSlop?: Insets | number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  children: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
}

export function ScalePressable({
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  disabled = false,
  activeScale = 0.96,
  hapticFeedback = 'light',
  style,
  className,
  pressRetentionOffset = { top: 12, left: 12, bottom: 12, right: 12 },
  hitSlop,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  children,
}: ScalePressableProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const triggerHaptic = () => {
    if (hapticFeedback === 'none') return;
    try {
      if (hapticFeedback === 'selection') {
        void Haptics.selectionAsync();
      } else if (hapticFeedback === 'medium') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (hapticFeedback === 'heavy') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // Graceful fallback on web or unsupported devices
    }
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;
    triggerHaptic();
    if (!reducedMotion) {
      scale.value = withTiming(activeScale, { duration: 100, easing: EASE_OUT });
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (!reducedMotion) {
      scale.value = withSpring(1, { duration: 250, dampingRatio: 0.8 });
    }
    onPressOut?.(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
      pressRetentionOffset={pressRetentionOffset}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState ?? { disabled }}
      className={className}
      style={style}
    >
      {(state) => (
        <Animated.View style={animatedStyle}>
          {typeof children === 'function' ? children(state) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}
