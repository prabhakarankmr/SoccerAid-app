import { useMutation, useQueryClient } from '@tanstack/react-query';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import SearchIcon from 'lucide-react-native/icons/search';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { apiClient } from '../../api/client';
import { teamKeys } from '../../api/queryKeys';
import { TeamDetail, TeamRosterPlayer, TeamSummary } from '../../hooks/useTeams';
import { AddPlayerPanel } from '../team/AddPlayerPanel';
import { ScalePressable } from '../ui/ScalePressable';

import { RosterPlayerRow } from './RosterPlayerRow';

interface TeamPickerRosterProps {
  team: TeamSummary;
  teamSlot: 'home' | 'away';
  isOwner: boolean;
  players: TeamRosterPlayer[];
  isLoading: boolean;
  rosterQuery: string;
  onChangeRosterQuery: (value: string) => void;
  isAddingPlayer: boolean;
  onSetIsAddingPlayer: (value: boolean) => void;
  deselectedPlayerIds: Set<string>;
  disabledPlayerIds: string[];
  disabledReason?: string;
  onTogglePlayer: (playerId: string) => void;
  onBackToTeams: () => void;
  onConfirm: () => void;
}

/**
 * Players / Roster step inside TeamPicker: unified elevated roster card,
 * bottom-sheet AddPlayerPanel overlay, and pinned emerald "Use This Team (N)" CTA.
 */
export function TeamPickerRoster({
  team,
  teamSlot,
  isOwner,
  players,
  isLoading,
  rosterQuery,
  onChangeRosterQuery,
  isAddingPlayer,
  onSetIsAddingPlayer,
  deselectedPlayerIds,
  disabledPlayerIds,
  disabledReason,
  onTogglePlayer,
  onBackToTeams,
  onConfirm,
}: TeamPickerRosterProps) {
  const queryClient = useQueryClient();

  const setCaptainMutation = useMutation({
    mutationFn: (playerId: string) =>
      apiClient.put<TeamDetail>(`/teams/${team.id}/captain`, { playerId }),
    onSuccess: (updated) => {
      queryClient.setQueryData(teamKeys.detail(team.id), updated);
      void queryClient.invalidateQueries({ queryKey: ['teams', 'owned'] });
    },
    onError: (error) => {
      console.error('PUT /teams/:id/captain failed:', error);
    },
  });

  const pendingCaptainId = setCaptainMutation.isPending ? setCaptainMutation.variables : undefined;
  const selectedCount = players.filter(
    (p) => !deselectedPlayerIds.has(p.id) && !disabledPlayerIds.includes(p.id),
  ).length;

  const filtered = rosterQuery.trim()
    ? players.filter((player) =>
        player.displayName.toLowerCase().includes(rosterQuery.trim().toLowerCase()),
      )
    : players;

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="pb-24 pt-3">
        <Pressable
          onPress={onBackToTeams}
          accessibilityRole="button"
          accessibilityLabel="Back to teams"
          accessibilityHint="Returns to the team list without changing your selection"
          className="flex-row items-center self-start rounded-full bg-white/20 px-3.5 py-2 active:bg-white/30"
        >
          <ArrowLeft color="#ffffff" size={15} />
          <Text className="ml-1.5 text-xs font-bold text-white">Back to teams</Text>
        </Pressable>

        <View className="mt-3 flex-row items-baseline justify-between">
          <Text className="text-base font-bold text-white" numberOfLines={1}>
            Players
          </Text>
          <Text className="text-xs font-medium text-emerald-100/90">{selectedCount} selected</Text>
        </View>

        <View className="mt-3 flex-row items-center rounded-xl border border-white/30 bg-white/95 px-3.5 shadow-sm">
          <SearchIcon color="#64748b" size={18} />
          <TextInput
            value={rosterQuery}
            onChangeText={onChangeRosterQuery}
            placeholder="Search players"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            accessibilityLabel="Search players"
            accessibilityHint="Filters this team's player list by name"
            className="ml-2.5 flex-1 py-3 text-base text-slate-900"
          />
        </View>

        {setCaptainMutation.isError ? (
          <View className="mt-2 rounded-lg bg-red-950/80 px-3 py-2">
            <Text className="text-xs font-medium text-red-200">
              Could not update captain — try again
            </Text>
          </View>
        ) : null}

        {isLoading ? <ActivityIndicator className="mt-8" color="#ffffff" /> : null}

        {!isLoading && filtered.length === 0 ? (
          <View className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-5">
            <Text className="text-center text-sm font-medium text-white/90">
              {rosterQuery.trim() ? 'No players match that search.' : 'No players added yet.'}
            </Text>
          </View>
        ) : null}

        {!isLoading && filtered.length > 0 ? (
          <View className="mt-3 overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-sm">
            {filtered.map((player, index) => {
              const isDisabled = disabledPlayerIds.includes(player.id);
              const isSelected = !isDisabled && !deselectedPlayerIds.has(player.id);

              return (
                <RosterPlayerRow
                  key={player.id}
                  player={player}
                  teamSlot={teamSlot}
                  isSelected={isSelected}
                  isDisabled={isDisabled}
                  isLast={index === filtered.length - 1}
                  disabledReason={disabledReason}
                  canMakeCaptain={isOwner}
                  isSettingCaptain={pendingCaptainId === player.id}
                  onMakeCaptain={() => setCaptainMutation.mutate(player.id)}
                  onPress={() => onTogglePlayer(player.id)}
                />
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <View className="pb-6 pt-2">
        <ScalePressable
          onPress={onConfirm}
          disabled={selectedCount === 0}
          activeScale={0.97}
          hapticFeedback="medium"
          accessibilityRole="button"
          accessibilityLabel={`Use ${team.name}`}
          accessibilityHint="Confirms this team and its selected players for the match"
          className={`items-center justify-center rounded-2xl py-4 ${
            selectedCount > 0 ? 'bg-emerald-500 active:bg-emerald-600' : 'bg-white/20'
          }`}
        >
          <Text
            className={`text-base font-bold ${selectedCount > 0 ? 'text-white' : 'text-white/40'}`}
          >
            Use This Team{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Text>
        </ScalePressable>
      </View>

      {isAddingPlayer ? (
        <View className="absolute inset-0 -mx-4 justify-end bg-black/60">
          <Pressable
            onPress={() => onSetIsAddingPlayer(false)}
            accessibilityLabel="Dismiss add player sheet"
            accessibilityHint="Closes the add-player sheet without adding a player"
            className="flex-1"
          />
          <View className="rounded-t-3xl border-t border-white/15 bg-slate-900/95 px-5 pb-8 pt-3">
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-white/25" />
            <AddPlayerPanel
              teamId={team.id}
              onAdded={() => onSetIsAddingPlayer(false)}
              onCancel={() => onSetIsAddingPlayer(false)}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
