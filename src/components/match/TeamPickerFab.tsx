import Plus from 'lucide-react-native/icons/plus';
import { View } from 'react-native';

import { ScalePressable } from '../ui/ScalePressable';

interface TeamPickerFabProps {
  bottom: number;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
}

/**
 * Unified floating "+" button for TeamPicker (adds a team on list view, or a player on roster view).
 */
export function TeamPickerFab({
  bottom,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}: TeamPickerFabProps) {
  return (
    <View style={{ position: 'absolute', right: 20, bottom }}>
      <ScalePressable
        onPress={onPress}
        activeScale={0.93}
        hapticFeedback="light"
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={{
          shadowColor: '#059669',
          shadowOpacity: 0.4,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
        className="h-14 w-14 items-center justify-center rounded-full bg-emerald-500 active:bg-emerald-600"
      >
        <Plus color="#ffffff" size={26} strokeWidth={2.5} />
      </ScalePressable>
    </View>
  );
}
