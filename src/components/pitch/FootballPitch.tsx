import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';

import { pitchGradient, teamA, teamB } from '../../theme/tokens';

import { EmptySlot } from './EmptySlot';
import { PitchMarkings } from './PitchMarkings';
import { PlayerToken } from './PlayerToken';

export type PitchSide = 'home' | 'away';

export interface PitchSlot {
  slotIndex: number;
  isGoalkeeper: boolean;
  posX: number;
  posY: number;
  player: { id: string; displayName: string } | null;
}

interface FootballPitchProps {
  homeLabel: string;
  awayLabel: string;
  homeSlots: PitchSlot[];
  awaySlots: PitchSlot[];
  onSwap: (side: PitchSide, fromSlotIndex: number, toSlotIndex: number) => void;
  onSetGoalkeeper: (side: PitchSide, slotIndex: number) => void;
  onAssignNext: (side: PitchSide, slotIndex: number) => void;
}

// Home = Team A (right half), away = Team B (left half) — one continuous pitch, not two side
// by side (FRONTEND_INSTRUCTIONS.md §5.2). `posY` from the formation data is "depth": 100 = a
// team's own goal line, 0 = the opponent's — mirrored here per side rather than stored twice.
function toScreenPosition(side: PitchSide, posX: number, posY: number) {
  const top = posX;
  const left = side === 'away' ? (100 - posY) / 2 : 50 + posY / 2;
  return { left, top };
}

function nearestSlot(side: PitchSide, slots: PitchSlot[], dropLeft: number, dropTop: number) {
  let nearest = slots[0];
  let nearestDist = Infinity;

  for (const slot of slots) {
    const pos = toScreenPosition(side, slot.posX, slot.posY);
    const dist = (pos.left - dropLeft) ** 2 + (pos.top - dropTop) ** 2;

    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = slot;
    }
  }

  return nearest;
}

export function FootballPitch({
  homeLabel,
  awayLabel,
  homeSlots,
  awaySlots,
  onSwap,
  onSetGoalkeeper,
  onAssignNext,
}: FootballPitchProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  }

  function handleDragEnd(side: PitchSide, slot: PitchSlot, deltaLeft: number, deltaTop: number) {
    const base = toScreenPosition(side, slot.posX, slot.posY);
    const target = nearestSlot(
      side,
      side === 'home' ? homeSlots : awaySlots,
      base.left + deltaLeft,
      base.top + deltaTop,
    );

    if (target.slotIndex !== slot.slotIndex) {
      onSwap(side, slot.slotIndex, target.slotIndex);
    }
  }

  function renderSlot(side: PitchSide, slot: PitchSlot) {
    const { left, top } = toScreenPosition(side, slot.posX, slot.posY);
    const colors = side === 'home' ? teamA : teamB;

    if (!slot.player) {
      return (
        <EmptySlot
          key={`${side}-${slot.slotIndex}`}
          left={left}
          top={top}
          borderColor={colors.emptySlotBorder}
          backgroundColor={colors.emptySlotBg}
          onPress={() => onAssignNext(side, slot.slotIndex)}
          label={slot.isGoalkeeper ? 'Empty goalkeeper slot' : 'Empty position'}
        />
      );
    }

    return (
      <PlayerToken
        key={`${side}-${slot.slotIndex}`}
        left={left}
        top={top}
        displayName={slot.player.displayName}
        fill={colors.fill}
        borderColor={colors.border}
        isGoalkeeper={slot.isGoalkeeper}
        containerWidth={containerSize.width}
        containerHeight={containerSize.height}
        onDragEnd={(dl, dt) => handleDragEnd(side, slot, dl, dt)}
        onTap={() => onSetGoalkeeper(side, slot.slotIndex)}
      />
    );
  }

  return (
    <View
      onLayout={handleLayout}
      className="overflow-hidden rounded-lg"
      style={{ width: '100%', aspectRatio: 16 / 10 }}
    >
      <LinearGradient
        colors={[pitchGradient.from, pitchGradient.mid, pitchGradient.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />
      <PitchMarkings />

      <View
        className="absolute left-2 top-2 rounded-full px-3 py-1"
        style={{ backgroundColor: teamB.fill }}
      >
        <Text className="text-xs font-bold text-white">{awayLabel}</Text>
      </View>
      <View
        className="absolute right-2 top-2 rounded-full px-3 py-1"
        style={{ backgroundColor: teamA.fill }}
      >
        <Text className="text-xs font-bold text-white">{homeLabel}</Text>
      </View>

      {homeSlots.map((slot) => renderSlot('home', slot))}
      {awaySlots.map((slot) => renderSlot('away', slot))}
    </View>
  );
}
