import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Shield from 'lucide-react-native/icons/shield';
import { Pressable, Text, View } from 'react-native';

import { TeamSummary } from '../../hooks/useTeams';

interface TeamClubCardProps {
  team: TeamSummary;
  accentColor: string;
  accentBgColor: string;
  badgeClassName: string;
  accessibilityHint: string;
  onPress: () => void;
}

/**
 * Elevated Sports Club Card shared by the Teams tab and match-setup TeamPicker.
 */
export function TeamClubCard({
  team,
  accentColor,
  accentBgColor,
  badgeClassName,
  accessibilityHint,
  onPress,
}: TeamClubCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${team.name}, code ${team.code}`}
      accessibilityHint={accessibilityHint}
      className="mt-2.5 flex-row items-center rounded-xl border border-white/20 bg-white/95 p-3.5 shadow-sm active:opacity-85"
    >
      <View className={`h-11 w-11 items-center justify-center rounded-xl border ${badgeClassName}`}>
        <Shield color={accentColor} fill={accentBgColor} size={22} />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
          {team.name}
        </Text>
        <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
          <View className="rounded-full bg-slate-100 px-2 py-0.5">
            <Text className="text-[11px] font-semibold text-slate-700" numberOfLines={1}>
              {team.code}
            </Text>
          </View>
          {team.captain ? (
            <View className="rounded-full bg-slate-100 px-2 py-0.5">
              <Text className="text-[11px] font-medium text-slate-600" numberOfLines={1}>
                Capt: {team.captain.displayName}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-slate-100">
        <ArrowRight color="#475569" size={16} />
      </View>
    </Pressable>
  );
}
