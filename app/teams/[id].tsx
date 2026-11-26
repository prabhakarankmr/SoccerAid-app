import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Crown from 'lucide-react-native/icons/crown';
import QrCode from 'lucide-react-native/icons/qr-code';
import Shield from 'lucide-react-native/icons/shield';
import X from 'lucide-react-native/icons/x';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { apiClient, ApiError } from '../../src/api/client';
import { teamKeys } from '../../src/api/queryKeys';
import { TeamPickerFab } from '../../src/components/match/TeamPickerFab';
import { AddPlayerPanel } from '../../src/components/team/AddPlayerPanel';
import { TeamDetailsModal } from '../../src/components/team/TeamDetailsModal';
import { StadiumBackdrop } from '../../src/components/ui/StadiumBackdrop';
import { useMe } from '../../src/hooks/useMe';
import { TeamDetail, useTeam } from '../../src/hooks/useTeams';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: team, isLoading, error, refetch } = useTeam(id);
  const { data: me } = useMe();
  const queryClient = useQueryClient();

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditingCaptain, setIsEditingCaptain] = useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  function updateCache(updated: TeamDetail) {
    queryClient.setQueryData(teamKeys.detail(id ?? ''), updated);
    void queryClient.invalidateQueries({ queryKey: ['teams', 'owned'] });
  }

  const setCaptainMutation = useMutation({
    mutationFn: (playerId: string) =>
      apiClient.put<TeamDetail>(`/teams/${id ?? ''}/captain`, { playerId }),
    onSuccess: (updated) => {
      updateCache(updated);
      setIsEditingCaptain(false);
    },
    onError: (err) => console.error('PUT /teams/:id/captain failed:', err),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (playerId: string) =>
      apiClient.delete<TeamDetail>(`/teams/${id ?? ''}/members/${playerId}`),
    onSuccess: updateCache,
    onError: (err) => console.error('DELETE /teams/:id/members/:playerId failed:', err),
  });

  function closeDetails() {
    setIsDetailsOpen(false);
    setIsEditingCaptain(false);
  }

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: '#0b140e', position: 'relative' }}
        className="items-center justify-center"
      >
        <StadiumBackdrop />
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (!team) {
    const notFound = error instanceof ApiError && error.code === 'NOT_FOUND';

    return (
      <View
        style={{ flex: 1, backgroundColor: '#0b140e', position: 'relative' }}
        className="items-center justify-center px-6"
      >
        <StadiumBackdrop />
        <Text className="text-center text-base font-semibold text-white">
          {notFound ? 'Team not found.' : 'Could not load this team — try again.'}
        </Text>
        {!notFound ? (
          <Pressable
            onPress={() => void refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            accessibilityHint="Tries loading this team again"
            className="mt-4 rounded-xl bg-emerald-500 px-5 py-2.5"
          >
            <Text className="font-bold text-white">Retry</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
          accessibilityHint="Returns to the home screen"
          className="mt-3 rounded-xl bg-white/20 px-5 py-2.5"
        >
          <Text className="font-bold text-white">Go to Home</Text>
        </Pressable>
      </View>
    );
  }

  const isOwner = me?.id === team.ownerId;
  const pendingCaptainId = setCaptainMutation.isPending ? setCaptainMutation.variables : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: '#0b140e', position: 'relative' }}>
      <StadiumBackdrop />

      <View className="w-full max-w-xl flex-1 self-center">
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-28 pt-14">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back to Teams"
              accessibilityHint="Returns to the teams list"
              className="h-10 w-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
            >
              <ArrowLeft color="#ffffff" size={20} />
            </Pressable>

            <Pressable
              onPress={() => setIsDetailsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="View QR and team details"
              accessibilityHint="Opens the QR code, code, captain, contact number and place for this team"
              className="h-10 w-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
            >
              <QrCode color="#ffffff" size={18} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setIsDetailsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${team.name} team details`}
            accessibilityHint="Opens the QR code, code, captain, contact number and place for this team"
            className="mt-4 items-center"
          >
            <View className="h-20 w-20 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/20">
              <Shield color="#10b981" fill="#d1fae5" size={38} />
            </View>
            <Text className="mt-3 text-2xl font-bold text-white">{team.name}</Text>
            <View className="mt-1.5 rounded-full bg-white/15 px-3 py-1">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                View details &amp; QR
              </Text>
            </View>
          </Pressable>

          <View className="mt-7 flex-row items-baseline justify-between">
            <Text className="text-base font-bold text-white">Players</Text>
            <Text className="text-xs font-medium text-emerald-100/90">
              {team.players.length} {team.players.length === 1 ? 'player' : 'players'}
            </Text>
          </View>

          {removeMemberMutation.isError ? (
            <View className="mt-2 rounded-lg bg-red-950/80 px-3 py-2">
              <Text className="text-xs font-medium text-red-200">
                Could not remove player — try again
              </Text>
            </View>
          ) : null}

          {setCaptainMutation.isError ? (
            <View className="mt-2 rounded-lg bg-red-950/80 px-3 py-2">
              <Text className="text-xs font-medium text-red-200">
                Could not update captain — try again
              </Text>
            </View>
          ) : null}

          {team.players.length === 0 ? (
            <View className="mt-3 rounded-2xl border border-white/15 bg-white/10 p-5">
              <Text className="text-center text-sm font-medium text-white/90">
                {isOwner ? 'No players yet — tap + to add one.' : 'No players added yet.'}
              </Text>
            </View>
          ) : (
            <View className="mt-3 overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-sm">
              {team.players.map((player, index) => {
                const initial = player.displayName.trim().charAt(0).toUpperCase() || '?';
                const isLast = index === team.players.length - 1;

                return (
                  <View
                    key={player.id}
                    className={`flex-row items-center px-4 py-3 ${
                      !isLast ? 'border-b border-slate-100' : ''
                    }`}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <Text className="text-sm font-bold text-emerald-700">{initial}</Text>
                    </View>

                    <View className="ml-3 flex-1 flex-row items-center gap-2">
                      <Text
                        className="shrink text-base font-semibold text-slate-900"
                        numberOfLines={1}
                      >
                        {player.displayName}
                      </Text>
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
                    </View>

                    {isOwner && !player.isCaptain ? (
                      <View className="ml-2 flex-row items-center gap-1.5">
                        <Pressable
                          onPress={() => setCaptainMutation.mutate(player.id)}
                          disabled={pendingCaptainId === player.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Make ${player.displayName} captain`}
                          accessibilityHint="Promotes this player to team captain"
                          className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 active:bg-amber-100"
                        >
                          {pendingCaptainId === player.id ? (
                            <ActivityIndicator color="#64748b" size="small" />
                          ) : (
                            <Crown color="#64748b" size={15} />
                          )}
                        </Pressable>

                        <Pressable
                          onPress={() => removeMemberMutation.mutate(player.id)}
                          disabled={removeMemberMutation.isPending}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${player.displayName}`}
                          accessibilityHint="Removes this player from the team"
                          className="h-8 w-8 items-center justify-center rounded-full bg-red-50 active:bg-red-100"
                        >
                          <X color="#dc2626" size={15} />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {isOwner && !isAddingPlayer ? (
          <TeamPickerFab
            bottom={28}
            accessibilityLabel="Add player"
            accessibilityHint="Opens options to add a player to this team"
            onPress={() => setIsAddingPlayer(true)}
          />
        ) : null}

        {isAddingPlayer ? (
          <View className="absolute inset-0 justify-end bg-black/60">
            <Pressable
              onPress={() => setIsAddingPlayer(false)}
              accessibilityLabel="Dismiss add player sheet"
              accessibilityHint="Closes the add-player sheet without adding a player"
              className="flex-1"
            />
            <View className="rounded-t-3xl border-t border-white/15 bg-slate-900/95 px-5 pb-8 pt-3">
              <View className="mb-4 h-1 w-10 self-center rounded-full bg-white/25" />
              <AddPlayerPanel
                teamId={team.id}
                onAdded={() => setIsAddingPlayer(false)}
                onCancel={() => setIsAddingPlayer(false)}
              />
            </View>
          </View>
        ) : null}
      </View>

      <TeamDetailsModal
        visible={isDetailsOpen}
        team={team}
        isOwner={isOwner}
        isEditingCaptain={isEditingCaptain}
        setCaptainPending={setCaptainMutation.isPending}
        setCaptainError={setCaptainMutation.isError ? setCaptainMutation.error : null}
        onSetIsEditingCaptain={setIsEditingCaptain}
        onSelectCaptain={(playerId) => setCaptainMutation.mutate(playerId)}
        onClose={closeDetails}
      />
    </View>
  );
}
