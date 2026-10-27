import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import X from 'lucide-react-native/icons/x';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { apiClient, ApiError } from '../../src/api/client';
import { teamKeys } from '../../src/api/queryKeys';
import { MemberLookup } from '../../src/components/team/MemberLookup';
import { useMe } from '../../src/hooks/useMe';
import { PlayerSummary } from '../../src/hooks/usePlayers';
import { TeamDetail, useTeam } from '../../src/hooks/useTeams';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: team, isLoading, error, refetch } = useTeam(id);
  const { data: me } = useMe();
  const queryClient = useQueryClient();

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditingCaptain, setIsEditingCaptain] = useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [guestName, setGuestName] = useState('');

  function updateCache(updated: TeamDetail) {
    queryClient.setQueryData(teamKeys.detail(id ?? ''), updated);
    // The owned-teams list also shows captain — keep it in sync too rather than waiting for
    // a refetch (TanStack Query matches by key prefix, see FRONTEND_INSTRUCTIONS.md §6.2).
    void queryClient.invalidateQueries({ queryKey: ['teams', 'owned'] });
  }

  const setCaptainMutation = useMutation({
    mutationFn: (playerId: string) =>
      apiClient.put<TeamDetail>(`/teams/${id ?? ''}/captain`, { playerId }),
    onSuccess: (updated) => {
      updateCache(updated);
      setIsEditingCaptain(false);
    },
    onError: (error) => {
      console.error('PUT /teams/:id/captain failed:', error);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (playerId: string) =>
      apiClient.post<TeamDetail>(`/teams/${id ?? ''}/members`, { playerId }),
    onSuccess: (updated) => {
      updateCache(updated);
      setIsAddingPlayer(false);
    },
    onError: (error) => {
      console.error('POST /teams/:id/members failed:', error);
    },
  });

  const addGuestMutation = useMutation({
    // Two calls, not one endpoint: create the name-only Player (no account, same mechanism
    // as the old pre-MemberLookup captain flow — BACKEND_INSTRUCTIONS.md §7.2), then add them
    // to this team's roster like any other player.
    mutationFn: async (displayName: string) => {
      const player = await apiClient.post<PlayerSummary>('/players', { displayName });
      return apiClient.post<TeamDetail>(`/teams/${id ?? ''}/members`, { playerId: player.id });
    },
    onSuccess: (updated) => {
      updateCache(updated);
      setGuestName('');
      setIsAddingPlayer(false);
    },
    onError: (error) => {
      console.error('Add guest player failed:', error);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (playerId: string) =>
      apiClient.delete<TeamDetail>(`/teams/${id ?? ''}/members/${playerId}`),
    onSuccess: updateCache,
    onError: (error) => {
      console.error('DELETE /teams/:id/members/:playerId failed:', error);
    },
  });

  function closeDetails() {
    setIsDetailsOpen(false);
    setIsEditingCaptain(false);
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#000000" />
      </View>
    );
  }

  if (!team) {
    // A real 404 (team deleted, or a bad id) vs. anything else (network blip, server
    // restarting, 5xx) — "Team not found" is only true for the former, and claiming it for a
    // transient failure would send someone hunting for a team that's actually still there.
    const notFound = error instanceof ApiError && error.code === 'NOT_FOUND';

    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-black">
          {notFound ? 'Team not found.' : 'Could not load this team — try again.'}
        </Text>
        {!notFound ? (
          <Pressable
            onPress={() => void refetch()}
            accessibilityLabel="Retry"
            accessibilityHint="Tries loading this team again"
            className="mt-4 rounded-lg bg-black px-4 py-2"
          >
            <Text className="font-bold text-white">Retry</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          accessibilityLabel="Go to Home"
          accessibilityHint="Returns to the home screen"
          className="mt-3 rounded-lg border border-gray-300 px-4 py-2"
        >
          <Text className="font-bold text-black">Go to Home</Text>
        </Pressable>
      </View>
    );
  }

  const isOwner = me?.id === team.ownerId;

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="items-center px-6 pb-16 pt-20"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back to Teams"
          accessibilityHint="Returns to the teams list"
          className="self-start rounded-lg border border-gray-300 px-4 py-2"
        >
          <Text className="font-bold text-black">← Back</Text>
        </Pressable>

        <Pressable
          onPress={() => setIsDetailsOpen(true)}
          accessibilityLabel={`${team.name} team details`}
          accessibilityHint="Opens the QR code, code, captain, contact number and place for this team"
          className="mt-6 items-center"
        >
          <View
            className="items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100"
            style={{ width: 96, height: 96 }}
          >
            <Text className="text-4xl font-bold text-black">
              {team.name.trim().charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text className="mt-3 text-2xl font-bold text-black">{team.name}</Text>
          <Text className="mt-1 text-xs font-bold uppercase tracking-wide text-black">
            View details &amp; QR
          </Text>
        </Pressable>

        <View className="mt-8 w-full max-w-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-black">Players</Text>
            {isOwner && !isAddingPlayer ? (
              <Pressable
                onPress={() => setIsAddingPlayer(true)}
                accessibilityLabel="Add player"
                accessibilityHint="Opens a search to add a player to this team"
                className="flex-row items-center rounded-lg bg-black px-3 py-2"
              >
                <Plus color="#ffffff" size={16} />
                <Text className="ml-1 text-sm font-bold text-white">Add</Text>
              </Pressable>
            ) : null}
          </View>

          {isAddingPlayer ? (
            <View className="mt-2">
              <MemberLookup
                label="New player"
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
                <Text className="text-xs font-bold text-black">OR</Text>
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
                  onSubmitEditing={() =>
                    guestName.trim() && addGuestMutation.mutate(guestName.trim())
                  }
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
                onPress={() => {
                  setIsAddingPlayer(false);
                  setGuestName('');
                  addGuestMutation.reset();
                }}
                accessibilityLabel="Cancel adding player"
                accessibilityHint="Closes the player search"
                className="mt-3 self-start"
              >
                <Text className="text-sm text-black">Cancel</Text>
              </Pressable>
            </View>
          ) : null}

          {removeMemberMutation.isError ? (
            <Text className="mt-2 text-sm text-red-700">
              Could not remove player — try again
              {__DEV__ && removeMemberMutation.error instanceof Error
                ? ` (${removeMemberMutation.error.message})`
                : ''}
            </Text>
          ) : null}

          {team.players.length === 0 ? (
            <Text className="mt-3 text-black">No players added yet.</Text>
          ) : (
            team.players.map((player) => (
              <View
                key={player.id}
                className="mt-2 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-3"
              >
                <View className="flex-row items-center gap-2">
                  <Text className="text-black">{player.displayName}</Text>
                  {player.isCaptain ? (
                    <View className="rounded-full bg-gray-100 px-2 py-0.5">
                      <Text className="text-xs font-bold text-black">Captain</Text>
                    </View>
                  ) : null}
                  {player.isGuest ? (
                    <View className="rounded-full bg-gray-100 px-2 py-0.5">
                      <Text className="text-xs font-bold text-gray-500">Guest</Text>
                    </View>
                  ) : null}
                </View>
                {isOwner && !player.isCaptain ? (
                  <Pressable
                    onPress={() => removeMemberMutation.mutate(player.id)}
                    disabled={removeMemberMutation.isPending}
                    accessibilityLabel={`Remove ${player.displayName}`}
                    accessibilityHint="Removes this player from the team"
                  >
                    <X color="#b91c1c" size={18} />
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isDetailsOpen}
        animationType="slide"
        transparent
        onRequestClose={closeDetails}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={closeDetails}
          accessibilityLabel="Close team details"
          accessibilityHint="Dismisses the team details panel"
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            accessibilityRole="none"
            className="max-h-[85%] rounded-t-3xl bg-white px-6 pb-10 pt-3"
          >
            <View className="items-center">
              <View className="h-1.5 w-12 rounded-full bg-gray-300" />
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-black">Team details</Text>
              <Pressable
                onPress={closeDetails}
                accessibilityLabel="Close"
                accessibilityHint="Closes team details"
              >
                <X color="#000000" size={22} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mt-4 items-center">
                <View className="rounded-lg border border-gray-300 bg-white p-4">
                  <QRCode value={team.code} size={160} color="#000000" backgroundColor="#ffffff" />
                </View>
                <Text className="mt-2 text-lg font-bold tracking-widest text-black">
                  {team.code}
                </Text>
                <Text className="text-sm text-black">
                  Share this code or QR for opponents to find you
                </Text>
              </View>

              <View className="mt-6">
                {isEditingCaptain ? (
                  <View>
                    <MemberLookup
                      label="New captain"
                      onSelect={(player) => setCaptainMutation.mutate(player.id)}
                    />
                    {setCaptainMutation.isError ? (
                      <Text className="mt-2 text-sm text-red-700">
                        Could not update captain — try again
                        {__DEV__ && setCaptainMutation.error instanceof Error
                          ? ` (${setCaptainMutation.error.message})`
                          : ''}
                      </Text>
                    ) : null}
                    <Pressable
                      onPress={() => setIsEditingCaptain(false)}
                      accessibilityLabel="Cancel editing captain"
                      accessibilityHint="Closes the captain search without changing it"
                      className="mt-2 self-start"
                    >
                      <Text className="text-sm text-black">Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-sm text-black">Captain</Text>
                      <Text className="mt-1 text-black">
                        {team.captain?.displayName ?? 'Not set'}
                      </Text>
                    </View>
                    {isOwner ? (
                      <Pressable
                        onPress={() => setIsEditingCaptain(true)}
                        accessibilityLabel="Edit captain"
                        accessibilityHint="Opens a search to change the team captain"
                      >
                        <Pencil color="#000000" size={18} />
                      </Pressable>
                    ) : null}
                  </View>
                )}

                {team.contactNumber ? (
                  <>
                    <Text className="mt-4 text-sm text-black">Contact number</Text>
                    <Text className="mt-1 text-black">{team.contactNumber}</Text>
                  </>
                ) : null}

                {team.place ? (
                  <>
                    <Text className="mt-4 text-sm text-black">Place</Text>
                    <Text className="mt-1 text-black">{team.place}</Text>
                  </>
                ) : null}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
