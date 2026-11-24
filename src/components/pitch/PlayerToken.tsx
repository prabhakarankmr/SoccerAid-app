import * as Haptics from 'expo-haptics';
import Target from 'lucide-react-native/icons/target';
import UserIcon from 'lucide-react-native/icons/user';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { goalkeeper } from '../../theme/tokens';

const TOKEN_SIZE = 40;
// Below this many pixels of movement, a gesture is treated as a tap (assign goalkeeper / select)
// rather than a drag (swap positions) — Gesture.Race lets both coexist on the same token.
const DRAG_THRESHOLD_PX = 8;

export interface PlayerTokenProps {
  // Resting position as a percentage of the pitch container (0-100) — see FootballPitch's
  // posX/posY → screen mapping, which already accounts for home/away mirroring.
  left: number;
  top: number;
  displayName: string;
  fill: string;
  borderColor: string;
  isGoalkeeper: boolean;
  containerWidth: number;
  containerHeight: number;
  // false for a display-only pitch (match/[id]/live.tsx) — no GestureDetector is created at
  // all in that case, not just a handler that happens to no-op, so a read-only pitch can't
  // accidentally reposition a live match's lineup.
  interactive?: boolean;
  isSelected?: boolean;
  onDragEnd: (deltaLeftPercent: number, deltaTopPercent: number) => void;
  onTap: () => void;
}

export function PlayerToken({
  left,
  top,
  displayName,
  fill,
  borderColor,
  isGoalkeeper,
  containerWidth,
  containerHeight,
  interactive = true,
  isSelected = false,
  onDragEnd,
  onTap,
}: PlayerTokenProps) {
  const reducedMotion = useReducedMotion();
  const baseLeft = useSharedValue(left);
  const baseTop = useSharedValue(top);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const dragScale = useSharedValue(1);

  // A swap elsewhere on the pitch moves this token to a new slot:
  // spring to the new coordinates on the UI thread for physical glide rather than a jump.
  useEffect(() => {
    if (reducedMotion) {
      baseLeft.value = left;
      baseTop.value = top;
    } else {
      baseLeft.value = withSpring(left, { duration: 350, dampingRatio: 0.85 });
      baseTop.value = withSpring(top, { duration: 350, dampingRatio: 0.85 });
    }
  }, [left, top, baseLeft, baseTop, reducedMotion]);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    try {
      void Haptics.impactAsync(style);
    } catch {
      // Fallback on web or unsupported devices
    }
  };

  const triggerSelectionHaptic = () => {
    try {
      void Haptics.selectionAsync();
    } catch {
      // Fallback on web or unsupported devices
    }
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
      if (!reducedMotion) {
        dragScale.value = withSpring(1.18, { duration: 250, dampingRatio: 0.7 });
      }
      scheduleOnRN(triggerHaptic, Haptics.ImpactFeedbackStyle.Light);
    })
    .onChange((event) => {
      translateX.value += event.changeX;
      translateY.value += event.changeY;
    })
    .onEnd((event) => {
      const movedEnough =
        Math.abs(event.translationX) > DRAG_THRESHOLD_PX ||
        Math.abs(event.translationY) > DRAG_THRESHOLD_PX;

      if (movedEnough && containerWidth > 0 && containerHeight > 0) {
        const deltaLeftPercent = (translateX.value / containerWidth) * 100;
        const deltaTopPercent = (translateY.value / containerHeight) * 100;
        scheduleOnRN(triggerHaptic, Haptics.ImpactFeedbackStyle.Medium);
        scheduleOnRN(onDragEnd, deltaLeftPercent, deltaTopPercent);
      }

      // Preserve finger release momentum for natural spring settle
      translateX.value = withSpring(0, {
        duration: 400,
        dampingRatio: 0.8,
        velocity: event.velocityX,
      });
      translateY.value = withSpring(0, {
        duration: 400,
        dampingRatio: 0.8,
        velocity: event.velocityY,
      });
    })
    .onFinalize(() => {
      isDragging.value = false;
      dragScale.value = withSpring(1, { duration: 300, dampingRatio: 0.8 });
    });

  // RNGH Tap primitive raced with Pan to cleanly separate taps from drags
  const tap = Gesture.Tap()
    .maxDistance(DRAG_THRESHOLD_PX)
    .onEnd(() => {
      scheduleOnRN(triggerSelectionHaptic);
      scheduleOnRN(onTap);
    });

  const gesture = Gesture.Race(tap, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    left: `${baseLeft.value}%`,
    top: `${baseTop.value}%`,
    zIndex: isDragging.value ? 99 : isSelected ? 10 : isGoalkeeper ? 2 : 1,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: dragScale.value },
    ],
    shadowColor: '#000000',
    shadowOpacity: isDragging.value ? 0.35 : 0.08,
    shadowRadius: isDragging.value ? 12 : 4,
    shadowOffset: { width: 0, height: isDragging.value ? 8 : 2 },
    elevation: isDragging.value ? 12 : 2,
  }));

  const tokenBody = (
    <Animated.View
      accessible
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={`${displayName}${isGoalkeeper ? ', goalkeeper' : ''}${isSelected ? ', selected' : ''}`}
      accessibilityHint={
        interactive
          ? isSelected
            ? 'Tap to deselect'
            : 'Tap to select for swap. Drag to swap positions with another player.'
          : undefined
      }
      style={[
        {
          position: 'absolute',
          width: TOKEN_SIZE,
          height: TOKEN_SIZE,
          marginLeft: -TOKEN_SIZE / 2,
          marginTop: -TOKEN_SIZE / 2,
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      <View
        className="items-center justify-center rounded-full border-2"
        style={{
          width: TOKEN_SIZE,
          height: TOKEN_SIZE,
          backgroundColor: isGoalkeeper ? goalkeeper.fill : fill,
          borderColor: isSelected ? '#10b981' : isGoalkeeper ? goalkeeper.border : borderColor,
          borderWidth: isSelected ? 3 : 2,
        }}
      >
        {isSelected ? (
          <View
            className="absolute -inset-1.5 rounded-full border-2 border-emerald-400/80 bg-emerald-400/20"
            pointerEvents="none"
          />
        ) : null}
        {isGoalkeeper ? (
          <Target color="#ffffff" size={18} />
        ) : (
          <UserIcon color="#ffffff" size={18} />
        )}
      </View>
      <View className="mt-0.5 max-w-[64px] rounded-full bg-black/60 px-1.5 py-0.5">
        <Text className="text-[10px] font-bold text-white" numberOfLines={1}>
          {displayName}
        </Text>
      </View>
    </Animated.View>
  );

  if (!interactive) {
    return tokenBody;
  }

  return <GestureDetector gesture={gesture}>{tokenBody}</GestureDetector>;
}
