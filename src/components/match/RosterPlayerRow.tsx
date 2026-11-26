import Check from 'lucide-react-native/icons/check';
import Crown from 'lucide-react-native/icons/crown';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { TeamRosterPlayer } from '../../hooks/useTeams';

interface RosterPlayerRowProps {
  player: TeamRosterPlayer;
  teamSlot: 'home' | 'away';
  isSelected: boolean;
  isDisabled: boolean;
  isLast: boolean;
  disabledReason?: string;
  canMakeCaptain?: boolean;
  isSettingCaptain?: boolean;
  onMakeCaptain?: () => void;
  onPress: () => void;
}

/**
 * Single player row inside TeamPickerRoster's unified elevated roster card.
 */
export function RosterPlayerRow({
  player,
  teamSlot,
  isSelected,
  isDisabled,
  isLast,
  disabledReason,
  canMakeCaptain = false,
  isSettingCaptain = false,
  onMakeCaptain,
  onPress,
}: RosterPlayerRowProps) {
  const initial = player.displayName.trim().charAt(0).toUpperCase() || '?';
  const avatarBg = isDisabled
    ? 'bg-slate-100'
    : isSelected
      ? teamSlot === 'away'
        ? 'bg-blue-100'
        : 'bg-orange-100'
      : 'bg-slate-100';
  const avatarText = isDisabled
    ? 'text-slate-400'
    : isSelected
      ? teamSlot === 'away'
        ? 'text-blue-700'
        : 'text-orange-700'
      : 'text-slate-500';
  const checkBg = teamSlot === 'away' ? 'bg-blue-600' : 'bg-orange-500';

  return (
    <View
      className={`flex-row items-center px-4 py-3 ${
        !isLast ? 'border-b border-slate-100' : ''
      } ${isDisabled ? 'opacity-55' : ''}`}
    >
      <Pressable
        onPress={() => !isDisabled && onPress()}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={`${player.displayName}${
          isDisabled
            ? `, disabled, ${disabledReason ?? 'already selected on opposing team'}`
            : isSelected
              ? ', playing'
              : ', not playing'
        }`}
        accessibilityHint={
          isDisabled
            ? (disabledReason ?? 'Cannot select player already chosen for opposing team')
            : 'Toggles whether this player is playing in the match'
        }
        className="flex-1 flex-row items-center active:opacity-75"
      >
        <View className={`h-10 w-10 items-center justify-center rounded-full ${avatarBg}`}>
          <Text className={`text-sm font-bold ${avatarText}`}>{initial}</Text>
        </View>

        <View className="ml-3 flex-1 flex-row items-center gap-2">
          <Text
            className={`shrink text-base ${
              isDisabled
                ? 'font-normal text-slate-400'
                : isSelected
                  ? 'font-semibold text-slate-900'
                  : 'font-medium text-slate-500'
            }`}
            numberOfLines={1}
          >
            {player.displayName}
          </Text>

          {isDisabled ? (
            <View className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-amber-800" numberOfLines={1}>
                {disabledReason ?? 'Playing for opposing team'}
              </Text>
            </View>
          ) : (
            <>
              {player.isCaptain ? (
                <View className="rounded-full bg-slate-900 px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-white">Captain</Text>
                </View>
              ) : null}
              {player.isGuest ? (
                <View className="rounded-full bg-slate-100 px-2 py-0.5">
                  <Text className="text-[10px] font-semibold text-slate-600">Guest</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </Pressable>

      {canMakeCaptain && !player.isCaptain ? (
        <Pressable
          onPress={onMakeCaptain}
          disabled={isSettingCaptain}
          accessibilityRole="button"
          accessibilityLabel={`Make ${player.displayName} captain`}
          accessibilityHint="Promotes this player to team captain"
          className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-slate-100 active:bg-amber-100"
        >
          {isSettingCaptain ? (
            <ActivityIndicator color="#64748b" size="small" />
          ) : (
            <Crown color="#64748b" size={15} />
          )}
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => !isDisabled && onPress()}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${player.displayName}`}
        accessibilityHint="Toggles whether this player is playing in the match"
        className="ml-2.5 py-1 pl-1"
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded-full ${
            isDisabled
              ? 'bg-slate-200'
              : isSelected
                ? checkBg
                : 'border-2 border-slate-300 bg-white'
          }`}
        >
          {isSelected ? <Check color="#ffffff" size={14} strokeWidth={3} /> : null}
        </View>
      </Pressable>
    </View>
  );
}
