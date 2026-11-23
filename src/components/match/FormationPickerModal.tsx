import Check from 'lucide-react-native/icons/check';
import X from 'lucide-react-native/icons/x';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Formation } from '../../hooks/useMeta';
import { teamA, teamB } from '../../theme/tokens';

interface FormationPickerModalProps {
  visible: boolean;
  teamName: string;
  side: 'home' | 'away';
  currentFormation: string;
  formations: Formation[];
  onSelect: (formationName: string) => void;
  onClose: () => void;
}

export function FormationPickerModal({
  visible,
  teamName,
  side,
  currentFormation,
  formations,
  onSelect,
  onClose,
}: FormationPickerModalProps) {
  const accentColor = side === 'home' ? teamA.fill : teamB.fill;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Close formation selector"
        accessibilityHint="Dismisses the formation picker without changing the formation"
        className="flex-1 justify-end bg-black/50"
      >
        <Pressable
          onPress={() => {}}
          accessible={false}
          className="max-h-[75%] rounded-t-3xl bg-white px-5 pb-8 pt-5"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
            <View>
              <View className="flex-row items-center gap-2">
                <View
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                <Text className="text-base font-bold text-black" numberOfLines={1}>
                  {teamName} Formation
                </Text>
              </View>
              <Text className="mt-0.5 text-xs text-gray-500">
                Choose a tactical lineup to rearrange pitch coordinates
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              accessibilityHint="Closes this dialog"
              className="h-8 w-8 items-center justify-center rounded-full bg-gray-100"
            >
              <X color="#000000" size={16} />
            </Pressable>
          </View>

          {/* Formations List */}
          <ScrollView className="mt-3">
            {formations.map((formation) => {
              const isSelected = formation.name === currentFormation;
              const outfieldSlots = formation.slots.filter((s) => !s.isGoalkeeper).length;

              return (
                <Pressable
                  key={formation.name}
                  onPress={() => {
                    onSelect(formation.name);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select formation ${formation.name}`}
                  accessibilityHint={`Changes ${teamName} to ${formation.name}`}
                  className={`mt-2 flex-row items-center justify-between rounded-xl border p-3.5 ${
                    isSelected
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 bg-white active:bg-gray-50'
                  }`}
                >
                  <View>
                    <Text className="text-base font-bold text-black">{formation.name}</Text>
                    <Text className="text-xs text-gray-500">
                      1 Goalkeeper + {outfieldSlots} Outfield
                    </Text>
                  </View>

                  {isSelected ? (
                    <View
                      className="h-6 w-6 items-center justify-center rounded-full"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Check color="#ffffff" size={14} />
                    </View>
                  ) : (
                    <View className="h-6 w-6 rounded-full border border-gray-300" />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
