import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  accessibilityHint?: string;
}

export interface SlidingSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  className?: string;
}

const CONTAINER_PADDING = 4;

export function SlidingSegmentedControl<T extends string>({
  options,
  selectedValue,
  onSelect,
  className,
}: SlidingSegmentedControlProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0);
  const reducedMotion = useReducedMotion();

  const selectedIndex = options.findIndex((o) => o.value === selectedValue);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const availableWidth = Math.max(0, containerWidth - CONTAINER_PADDING * 2);
  const itemWidth = options.length > 0 ? availableWidth / options.length : 0;

  const translateX = useSharedValue(0);

  useEffect(() => {
    if (itemWidth <= 0) return;
    const targetX = activeIndex * itemWidth;
    if (reducedMotion) {
      translateX.value = targetX;
    } else {
      translateX.value = withSpring(targetX, {
        duration: 280,
        dampingRatio: 0.85,
      });
    }
  }, [activeIndex, itemWidth, reducedMotion, translateX]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== containerWidth) {
      setContainerWidth(w);
    }
  };

  const handlePress = (option: SegmentOption<T>) => {
    if (option.value === selectedValue) return;
    try {
      void Haptics.selectionAsync();
    } catch {
      // Fallback on web or unsupported devices
    }
    onSelect(option.value);
  };

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: itemWidth > 0 ? itemWidth : 0,
  }));

  return (
    <View
      onLayout={handleLayout}
      className={`relative flex-row rounded-lg border border-gray-300 bg-gray-100 p-1 ${
        className ?? ''
      }`}
    >
      {/* ── Sliding Active Background Pill ── */}
      {containerWidth > 0 && itemWidth > 0 ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: CONTAINER_PADDING,
              bottom: CONTAINER_PADDING,
              left: CONTAINER_PADDING,
              borderRadius: 6,
              backgroundColor: '#ffffff',
              shadowColor: '#000000',
              shadowOpacity: 0.1,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            },
            animatedIndicatorStyle,
          ]}
          pointerEvents="none"
        />
      ) : null}

      {/* ── Interactive Segment Buttons ── */}
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <Pressable
            key={option.value}
            onPress={() => handlePress(option)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            accessibilityHint={option.accessibilityHint}
            className="flex-1 items-center justify-center rounded-md py-2"
          >
            <Text className={`font-bold ${isSelected ? 'text-black' : 'text-gray-600'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
