import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { apiClient } from '../../api/client';
import { teamKeys } from '../../api/queryKeys';
import { PlayerSummary } from '../../hooks/usePlayers';
import { TeamDetail } from '../../hooks/useTeams';

import { MemberLookup } from './MemberLookup';

interface AddPlayerPanelProps {
  teamId: string;
  // Second arg is the id of the player that was just added — lets a caller that tracks a
  // per-player selection (the match-setup roster step, §5.1) select the new arrival without
  // having to diff the roster before/after itself.
  onAdded: (team: TeamDetail, addedPlayerId: string) => void;
  onCancel: () => void;
}

/**
 * Add-a-player flow for a team's roster: an exact phone/username lookup for a real app user
 * (MemberLookup), or a name-only guest with no account to maintain. Mirrors the inline panel on
 * teams/[id].tsx (§5.9) as a standalone component so the match-setup team picker (§5.1) can
 * reuse the same two-path flow without duplicating the mutation logic.
 */
export function AddPlayerPanel({ teamId, onAdded, onCancel }: AddPlayerPanelProps) {
  const queryClient = useQueryClient();
  const [guestName, setGuestName] = useState('');

  function updateCache(updated: TeamDetail) {
    queryClient.setQueryData(teamKeys.detail(teamId), updated);
    void queryClient.invalidateQueries({ queryKey: ['teams', 'owned'] });
  }

  const addMemberMutation = useMutation({
    mutationFn: (playerId: string) =>
      apiClient.post<TeamDetail>(`/teams/${teamId}/members`, { playerId }),
    onSuccess: (updated, playerId) => {
      updateCache(updated);
      onAdded(updated, playerId);
    },
    onError: (error) => {
      console.error('POST /teams/:id/members failed:', error);
    },
  });

  const addGuestMutation = useMutation({
    mutationFn: async (displayName: string) => {
      const player = await apiClient.post<PlayerSummary>('/players', { displayName });
      const team = await apiClient.post<TeamDetail>(`/teams/${teamId}/members`, {
        playerId: player.id,
      });
      return { team, playerId: player.id };
    },
    onSuccess: ({ team, playerId }) => {
      updateCache(team);
      setGuestName('');
      onAdded(team, playerId);
    },
    onError: (error) => {
      console.error('Add guest player failed:', error);
    },
  });

  return (
    <View className="mt-2">
      <MemberLookup
        label="Existing player"
        onSelect={(player) => addMemberMutation.mutate(player.id)}
      />
      {addMemberMutation.isError ? (
        <Text className="mt-2 text-sm text-red-700">
          Could not add player — try again
          {__DEV__ && addMemberMutation.error instanceof Error
            ? ` (${addMemberMutation.error.message})`
            : ''}
        </Text>
      ) : null}

      <View className="mt-4 flex-row items-center gap-2">
        <View className="h-px flex-1 bg-gray-300" />
        <Text className="text-xs font-bold text-gray-400">OR</Text>
        <View className="h-px flex-1 bg-gray-300" />
      </View>

      <Text className="mt-4 text-sm text-black">Add a guest player</Text>
      <Text className="mt-0.5 text-xs text-black">
        For someone without a SoccerAid account — just a name, no profile to maintain.
      </Text>
      <View className="mt-1 flex-row items-center gap-2">
        <TextInput
          value={guestName}
          onChangeText={setGuestName}
          placeholder="Player name"
          accessibilityLabel="Guest player name"
          accessibilityHint="Adds a player who doesn't have a SoccerAid account"
          onSubmitEditing={() => guestName.trim() && addGuestMutation.mutate(guestName.trim())}
          returnKeyType="done"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-black"
        />
        <Pressable
          onPress={() => addGuestMutation.mutate(guestName.trim())}
          disabled={!guestName.trim() || addGuestMutation.isPending}
          accessibilityLabel="Add guest player"
          accessibilityHint="Adds this guest player to the team"
          className={`items-center justify-center rounded-lg px-4 py-3 ${
            guestName.trim() && !addGuestMutation.isPending ? 'bg-black' : 'bg-gray-300'
          }`}
        >
          {addGuestMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-bold text-white">Add</Text>
          )}
        </Pressable>
      </View>
      {addGuestMutation.isError ? (
        <Text className="mt-2 text-sm text-red-700">
          Could not add guest player — try again
          {__DEV__ && addGuestMutation.error instanceof Error
            ? ` (${addGuestMutation.error.message})`
            : ''}
        </Text>
      ) : null}

      <Pressable
        onPress={onCancel}
        accessibilityLabel="Cancel adding player"
        accessibilityHint="Closes the add-player panel"
        className="mt-3 self-start"
      >
        <Text className="text-sm text-black">Cancel</Text>
      </Pressable>
    </View>
  );
}
