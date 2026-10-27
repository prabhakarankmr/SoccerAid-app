import Target from 'lucide-react-native/icons/target';
import UserIcon from 'lucide-react-native/icons/user';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { goalkeeper } from '../../theme/tokens';

const TOKEN_SIZE = 40;
// Below this many pixels of movement, a gesture is treated as a tap (assign goalkeeper) rather
// than a drag (swap positions) — Gesture.Race lets both coexist on the same token.
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
  onDragEnd,
  onTap,
}: PlayerTokenProps) {
  const baseLeft = useSharedValue(left);
  const baseTop = useSharedValue(top);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // A swap (elsewhere on the pitch) changes this token's resting slot — animate to it rather
  // than jumping, so the swap reads as a move, not a re-render.
  useEffect(() => {
    baseLeft.value = withTiming(left, { duration: 220 });
    baseTop.value = withTiming(top, { duration: 220 });
  }, [left, top, baseLeft, baseTop]);

  const pan = Gesture.Pan()
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
        runOnJS(onDragEnd)(deltaLeftPercent, deltaTopPercent);
      }

      translateX.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
    });

  // A plain RN Pressable nested inside this GestureDetector wouldn't reliably receive taps —
  // the Pan gesture claims the touch first. Gesture.Tap, composed via Race, is RNGH's own
  // answer: it fails to activate past `maxDistance`, letting Pan take over past that point,
  // and wins outright for a true tap (same gesture system, properly negotiated).
  const tap = Gesture.Tap()
    .maxDistance(DRAG_THRESHOLD_PX)
    .onEnd(() => {
      runOnJS(onTap)();
    });

  const gesture = Gesture.Race(tap, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    left: `${baseLeft.value}%`,
    top: `${baseTop.value}%`,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${displayName}${isGoalkeeper ? ', goalkeeper' : ''}`}
        accessibilityHint="Tap to make this player the goalkeeper. Drag to swap positions with another player."
        style={[
          {
            position: 'absolute',
            width: TOKEN_SIZE,
            height: TOKEN_SIZE,
            marginLeft: -TOKEN_SIZE / 2,
            marginTop: -TOKEN_SIZE / 2,
            zIndex: isGoalkeeper ? 2 : 1,
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
            borderColor: isGoalkeeper ? goalkeeper.border : borderColor,
          }}
        >
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
    </GestureDetector>
  );
}
