import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { apiClient } from '../../api/client';
import { teamKeys } from '../../api/queryKeys';
import { PlayerSummary } from '../../hooks/usePlayers';
import { TeamDetail } from '../../hooks/useTeams';
import { SlidingSegmentedControl } from '../ui/SlidingSegmentedControl';

import { MemberLookup } from './MemberLookup';

type PlayerMode = 'appUser' | 'guest';

const PLAYER_MODE_OPTIONS: { value: PlayerMode; label: string; accessibilityHint: string }[] = [
  {
    value: 'appUser',
    label: 'App User',
    accessibilityHint: 'Search for an existing SoccerAid user',
  },
  {
    value: 'guest',
    label: 'Guest',
    accessibilityHint: 'Add a name-only guest player without an account',
  },
];

interface AddPlayerPanelProps {
  teamId: string;
  onAdded: (team: TeamDetail, addedPlayerId: string) => void;
  onCancel: () => void;
}

/**
 * Dark glassmorphic add-a-player sheet content: 2-option toggle between an existing app user
 * (MemberLookup) and a name-only guest (POST /players + POST /teams/:id/members).
 */
export function AddPlayerPanel({ teamId, onAdded, onCancel }: AddPlayerPanelProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<PlayerMode>('appUser');
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
    onError: (error) => console.error('POST /teams/:id/members failed:', error),
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
    onError: (error) => console.error('Add guest player failed:', error),
  });

  return (
    <View>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-white">Add Player</Text>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          accessibilityHint="Closes the add-player sheet"
          className="rounded-full bg-white/15 px-3.5 py-1.5 active:bg-white/25"
        >
          <Text className="text-xs font-bold text-white">Cancel</Text>
        </Pressable>
      </View>

      <SlidingSegmentedControl
        options={PLAYER_MODE_OPTIONS}
        selectedValue={mode}
        onSelect={setMode}
        className="mb-4 rounded-xl border-white/15 bg-white/10"
        inactiveTextClassName="text-white/80"
      />

      {mode === 'appUser' ? (
        <View>
          <MemberLookup
            label=""
            variant="dark"
            onSelect={(player) => addMemberMutation.mutate(player.id)}
          />
          {addMemberMutation.isError ? (
            <Text className="mt-2 text-sm text-red-300">
              Could not add player — try again
              {__DEV__ && addMemberMutation.error instanceof Error
                ? ` (${addMemberMutation.error.message})`
                : ''}
            </Text>
          ) : null}
        </View>
      ) : (
        <View>
          <Text className="text-xs text-slate-400">
            For someone without a SoccerAid account — just a name, no profile to maintain.
          </Text>
          <View className="mt-2.5 flex-row items-center gap-2">
            <TextInput
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Player name"
              placeholderTextColor="#94a3b8"
              accessibilityLabel="Guest player name"
              accessibilityHint="Adds a player who doesn't have a SoccerAid account"
              onSubmitEditing={() => guestName.trim() && addGuestMutation.mutate(guestName.trim())}
              returnKeyType="done"
              className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-base text-white"
            />
            <Pressable
              onPress={() => addGuestMutation.mutate(guestName.trim())}
              disabled={!guestName.trim() || addGuestMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Add guest player"
              accessibilityHint="Adds this guest player to the team"
              className={`items-center justify-center rounded-xl px-4 py-3 ${
                guestName.trim() && !addGuestMutation.isPending
                  ? 'bg-emerald-500 active:bg-emerald-600'
                  : 'bg-white/15'
              }`}
            >
              {addGuestMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className={`font-bold ${guestName.trim() ? 'text-white' : 'text-white/40'}`}>
                  Add
                </Text>
              )}
            </Pressable>
          </View>
          {addGuestMutation.isError ? (
            <Text className="mt-2 text-sm text-red-300">
              Could not add guest player — try again
              {__DEV__ && addGuestMutation.error instanceof Error
                ? ` (${addGuestMutation.error.message})`
                : ''}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
