import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import X from 'lucide-react-native/icons/x';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

export interface EndMatchConfirmSheetProps {
  visible: boolean;
  disabled?: boolean;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EndMatchConfirmSheet({
  visible,
  disabled = false,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  onConfirm,
  onCancel,
}: EndMatchConfirmSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        accessibilityLabel="Close confirmation sheet"
        accessibilityHint="Dismisses the confirmation without ending match"
        className="flex-1 justify-end bg-black/60"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessible={false}
          className="rounded-t-3xl bg-white px-5 pb-8 pt-3 shadow-2xl"
        >
          {/* Drag Handle Indicator */}
          <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-gray-300" />

          {/* Close Header */}
          <View className="flex-row items-center justify-between pb-1">
            <View className="h-6 w-6" />
            <Pressable
              onPress={onCancel}
              accessibilityLabel="Cancel"
              accessibilityHint="Dismisses this sheet"
              className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            >
              <X color="#64748b" size={18} />
            </Pressable>
          </View>

          {/* Warning Icon & Title */}
          <View className="items-center px-4">
            <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <TriangleAlert color="#dc2626" size={28} />
            </View>
            <Text className="text-xl font-bold text-slate-900">End This Match?</Text>
            <Text className="mt-1 text-center text-sm text-slate-500">
              This will officially blow the final whistle, finalize the score, and close live
              scoring. This action cannot be reversed.
            </Text>

            {/* Current Score Recap */}
            <View className="my-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <Text className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Final Score Preview
              </Text>
              <View className="mt-2 flex-row items-center justify-around">
                <Text
                  className="flex-1 text-center text-sm font-bold text-slate-900"
                  numberOfLines={1}
                >
                  {homeTeamName}
                </Text>
                <View className="mx-2 flex-row items-center rounded-lg bg-slate-900 px-3 py-1">
                  <Text className="font-mono text-lg font-black text-white">{homeScore}</Text>
                  <Text className="mx-1.5 font-bold text-slate-400">-</Text>
                  <Text className="font-mono text-lg font-black text-white">{awayScore}</Text>
                </View>
                <Text
                  className="flex-1 text-center text-sm font-bold text-slate-900"
                  numberOfLines={1}
                >
                  {awayTeamName}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="mt-2 flex-row gap-3">
            <Pressable
              onPress={onCancel}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel="Cancel ending match"
              accessibilityHint="Returns to the match without ending it"
              className="flex-1 items-center justify-center rounded-xl border border-gray-300 bg-gray-100 py-3.5 active:bg-gray-200"
            >
              <Text className="text-base font-bold text-slate-800">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel="Confirm end match"
              accessibilityHint="Permanently ends match and submits final status"
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 active:bg-red-700 shadow-sm"
            >
              {disabled ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-base font-bold text-white">End Match</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
