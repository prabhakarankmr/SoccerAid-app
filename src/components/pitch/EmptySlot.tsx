import Plus from 'lucide-react-native/icons/plus';
import { Pressable, View } from 'react-native';

const SLOT_SIZE = 40;

interface EmptySlotProps {
  left: number;
  top: number;
  borderColor: string;
  backgroundColor: string;
  onPress: () => void;
  label: string;
}

/** An unfilled formation position — dashed outline, tap to assign the next available player. */
export function EmptySlot({
  left,
  top,
  borderColor,
  backgroundColor,
  onPress,
  label,
}: EmptySlotProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityHint="Assigns the next available player to this position"
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: `${top}%`,
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        marginLeft: -SLOT_SIZE / 2,
        marginTop: -SLOT_SIZE / 2,
      }}
    >
      <View
        className="items-center justify-center rounded-full border-2 border-dashed"
        style={{ width: SLOT_SIZE, height: SLOT_SIZE, borderColor, backgroundColor }}
      >
        <Plus color={borderColor} size={18} />
      </View>
    </Pressable>
  );
}
