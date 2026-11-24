import * as Haptics from 'expo-haptics';
import { ElementRef, useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;
const PADDING_VERTICAL = ITEM_HEIGHT; // 44px, centers selected item in 3-row window

interface WheelItem<T> {
  value: T;
  label: string;
}

export const FORMAT_OPTIONS: WheelItem<number>[] = [
  { value: 3, label: '3v3' },
  { value: 4, label: '4v4' },
  { value: 5, label: '5v5' },
  { value: 6, label: '6v6' },
  { value: 7, label: '7v7' },
  { value: 8, label: '8v8' },
  { value: 9, label: '9v9' },
  { value: 10, label: '10v10' },
  { value: 11, label: '11v11' },
];

export const DURATION_OPTIONS: WheelItem<number>[] = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 25, label: '25 min' },
  { value: 30, label: '30 min' },
  { value: 35, label: '35 min' },
  { value: 40, label: '40 min' },
  { value: 45, label: '45 min' },
];

interface WheelColumnProps<T> {
  items: WheelItem<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  columnTitle: string;
}

function WheelColumn<T>({ items, selectedValue, onSelect, columnTitle }: WheelColumnProps<T>) {
  const scrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIndex = items.findIndex((i) => i.value === selectedValue);
  const [scrollIndex, setScrollIndex] = useState<number | null>(null);

  const activeIndex = scrollIndex ?? (selectedIndex >= 0 ? selectedIndex : 0);

  useEffect(() => {
    if (selectedIndex >= 0 && scrollIndex === null) {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
    }
  }, [selectedIndex, scrollIndex]);

  useEffect(() => {
    return () => {
      if (scrollEndTimer.current) {
        clearTimeout(scrollEndTimer.current);
      }
    };
  }, []);

  const commitSelection = (index: number) => {
    setScrollIndex(null);
    const item = items[index];
    if (item && item.value !== selectedValue) {
      onSelect(item.value);
      void Haptics.selectionAsync().catch(() => {});
    }
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    setScrollIndex(clamped);

    // Debounced settling for web mousewheel & trackpad gestures
    if (scrollEndTimer.current) {
      clearTimeout(scrollEndTimer.current);
    }
    scrollEndTimer.current = setTimeout(() => {
      commitSelection(clamped);
    }, 100);
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (scrollEndTimer.current) {
      clearTimeout(scrollEndTimer.current);
    }
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    commitSelection(clamped);
  };

  const onScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (scrollEndTimer.current) {
      clearTimeout(scrollEndTimer.current);
    }
    scrollEndTimer.current = setTimeout(() => {
      commitSelection(clamped);
    }, 80);
  };

  const handlePress = (index: number) => {
    if (scrollEndTimer.current) {
      clearTimeout(scrollEndTimer.current);
    }
    commitSelection(index);
  };

  return (
    <View className="flex-1 items-center">
      <View
        style={{
          height: ITEM_HEIGHT * VISIBLE_ITEMS,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Centered selection highlight band with subtle divider lines */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: PADDING_VERTICAL,
            left: 6,
            right: 6,
            height: ITEM_HEIGHT,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: '#cbd5e1',
            backgroundColor: 'rgba(15, 23, 42, 0.03)',
            borderRadius: 8,
          }}
        />
        <ScrollView
          ref={scrollRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment="start"
          decelerationRate="normal"
          disableIntervalMomentum={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScrollEndDrag={onScrollEndDrag}
          contentOffset={{
            x: 0,
            y: Math.max(0, selectedIndex) * ITEM_HEIGHT,
          }}
          contentContainerStyle={{
            paddingTop: PADDING_VERTICAL,
            paddingBottom: PADDING_VERTICAL,
          }}
          style={{
            ...(Platform.OS === 'web'
              ? ({ overscrollBehavior: 'contain' } as Record<string, unknown>)
              : {}),
          }}
        >
          {items.map((item, idx) => {
            const isSelected = idx === activeIndex;
            const distance = Math.abs(idx - activeIndex);
            return (
              <Pressable
                key={String(item.value)}
                onPress={() => handlePress(idx)}
                accessibilityRole="button"
                accessibilityLabel={`${columnTitle}: ${item.label}`}
                accessibilityHint={`Selects ${item.label} for ${columnTitle}`}
                accessibilityState={{ selected: isSelected }}
                style={{
                  height: ITEM_HEIGHT,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  className={`text-center transition-all ${
                    isSelected
                      ? 'text-base font-bold text-slate-900'
                      : distance === 1
                        ? 'text-sm font-medium text-slate-400'
                        : 'text-xs font-normal text-slate-300'
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

interface DualWheelPickerProps {
  playersPerSide: number;
  onSelectPlayersPerSide: (value: number) => void;
  halfDurationMin: number;
  onSelectHalfDurationMin: (value: number) => void;
}

export function DualWheelPicker({
  playersPerSide,
  onSelectPlayersPerSide,
  halfDurationMin,
  onSelectHalfDurationMin,
}: DualWheelPickerProps) {
  return (
    <View
      style={{
        shadowColor: '#0f172a',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
      }}
      className="mt-4 rounded-2xl border border-white/20 bg-white/95 p-5"
    >
      <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
        <View className="flex-1 items-center">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Team Size
          </Text>
        </View>
        <View style={{ width: 1 }} />
        <View className="flex-1 items-center">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Half Duration
          </Text>
        </View>
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <WheelColumn
          items={FORMAT_OPTIONS}
          selectedValue={playersPerSide}
          onSelect={onSelectPlayersPerSide}
          columnTitle="Team Size"
        />
        <View className="mx-2 h-24 w-[1px] bg-slate-200" />
        <WheelColumn
          items={DURATION_OPTIONS}
          selectedValue={halfDurationMin}
          onSelect={onSelectHalfDurationMin}
          columnTitle="Half Duration"
        />
      </View>
    </View>
  );
}
