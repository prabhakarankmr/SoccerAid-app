import Pencil from 'lucide-react-native/icons/pencil';
import X from 'lucide-react-native/icons/x';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { TeamDetail } from '../../hooks/useTeams';

import { MemberLookup } from './MemberLookup';

interface TeamDetailsModalProps {
  visible: boolean;
  team: TeamDetail;
  isOwner: boolean;
  isEditingCaptain: boolean;
  setCaptainPending: boolean;
  setCaptainError: unknown;
  onSetIsEditingCaptain: (value: boolean) => void;
  onSelectCaptain: (playerId: string) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet modal showing a team's QR code, short code, captain (with owner edit),
 * contact number, and ground/place.
 */
export function TeamDetailsModal({
  visible,
  team,
  isOwner,
  isEditingCaptain,
  setCaptainError,
  onSetIsEditingCaptain,
  onSelectCaptain,
  onClose,
}: TeamDetailsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end bg-black/60"
        onPress={onClose}
        accessibilityLabel="Close team details"
        accessibilityHint="Dismisses the team details panel"
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          accessibilityRole="none"
          className="max-h-[85%] rounded-t-3xl border-t border-white/15 bg-slate-900/95 px-6 pb-10 pt-3"
        >
          <View className="items-center">
            <View className="h-1.5 w-12 rounded-full bg-white/25" />
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-white">Team details</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              accessibilityHint="Closes team details"
              className="h-9 w-9 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
            >
              <X color="#ffffff" size={18} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="mt-4 items-center">
              <View className="rounded-2xl bg-white p-4 shadow-sm">
                <QRCode value={team.code} size={160} color="#0f172a" backgroundColor="#ffffff" />
              </View>
              <Text className="mt-3 text-lg font-bold tracking-widest text-white">{team.code}</Text>
              <Text className="mt-0.5 text-center text-xs text-slate-400">
                Share this code or QR for opponents to find you
              </Text>
            </View>

            <View className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              {isEditingCaptain ? (
                <View>
                  <MemberLookup
                    label="New captain"
                    variant="dark"
                    onSelect={(player) => onSelectCaptain(player.id)}
                  />
                  {setCaptainError ? (
                    <Text className="mt-2 text-sm text-red-300">
                      Could not update captain — try again
                      {__DEV__ && setCaptainError instanceof Error
                        ? ` (${setCaptainError.message})`
                        : ''}
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={() => onSetIsEditingCaptain(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel editing captain"
                    accessibilityHint="Closes the captain search without changing it"
                    className="mt-3 self-start rounded-full bg-white/15 px-3 py-1"
                  >
                    <Text className="text-xs font-bold text-white">Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs font-semibold text-slate-400">Captain</Text>
                    <Text className="mt-1 text-base font-semibold text-white">
                      {team.captain?.displayName ?? 'Not set'}
                    </Text>
                  </View>
                  {isOwner ? (
                    <Pressable
                      onPress={() => onSetIsEditingCaptain(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Edit captain"
                      accessibilityHint="Opens a search to change the team captain"
                      className="h-9 w-9 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
                    >
                      <Pencil color="#ffffff" size={16} />
                    </Pressable>
                  ) : null}
                </View>
              )}

              {team.contactNumber ? (
                <View className="mt-4 border-t border-white/10 pt-3">
                  <Text className="text-xs font-semibold text-slate-400">Contact number</Text>
                  <Text className="mt-1 text-sm font-medium text-white">{team.contactNumber}</Text>
                </View>
              ) : null}

              {team.place ? (
                <View className="mt-4 border-t border-white/10 pt-3">
                  <Text className="text-xs font-semibold text-slate-400">Ground</Text>
                  <Text className="mt-1 text-sm font-medium text-white">{team.place}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
