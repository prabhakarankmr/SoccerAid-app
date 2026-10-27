import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import CameraIcon from 'lucide-react-native/icons/camera';
import Plus from 'lucide-react-native/icons/plus';
import SearchIcon from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { apiClient } from '../../api/client';
import { useMe } from '../../hooks/useMe';
import { PlayerSummary } from '../../hooks/usePlayers';
import { TeamSummary, useOpponentTeams, useOwnedTeams, useTeam } from '../../hooks/useTeams';
import { AddPlayerPanel } from '../team/AddPlayerPanel';
import { CaptainPicker } from '../team/CaptainPicker';

type PickerTab = 'mine' | 'opponents' | 'add';

const TAB_LABELS: Record<PickerTab, string> = {
  mine: 'Your Teams',
  opponents: 'Opponents',
  add: 'Add',
};

interface TeamPickerProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  // playerIds: who from the roster is actually playing this match — not the full roster
  // necessarily, a team's books can list more people than show up to any one game.
  onSelect: (team: TeamSummary, playerIds: string[]) => void;
}

function TeamRow({ team, onPress }: { team: TeamSummary; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Select ${team.name}`}
      accessibilityHint="Chooses this team"
      className="mt-2 flex-row items-center rounded-lg border border-gray-300 bg-white p-3"
    >
      <View
        className="items-center justify-center rounded-full bg-gray-100"
        style={{ width: 40, height: 40 }}
      >
        <Text className="font-bold text-black">
          {team.name.trim().charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-bold text-black">{team.name}</Text>
        <Text className="text-xs text-black">
          Code: {team.code}
          {team.captain ? ` · Captain: ${team.captain.displayName}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Shared "Select Team A/B" picker for match setup — three tabs (Your Teams / Opponents / Add),
 * a search box matching name, code, or the team's captain's phone/username (same four-way
 * match as `GET /teams?q=`, BACKEND_INSTRUCTIONS.md §7.2), and a QR scanner that resolves
 * *any* team by code via `GET /teams/by-code` — not scoped to owned/opponent teams, since the
 * whole point of scanning is finding a team you have no prior relationship with yet.
 */
export function TeamPicker({ visible, title, onClose, onSelect }: TeamPickerProps) {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [tab, setTab] = useState<PickerTab>('mine');
  const [query, setQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [place, setPlace] = useState('');
  const [selectedCaptain, setSelectedCaptain] = useState<PlayerSummary | null>(null);

  // Picking a team doesn't finalize the selection right away — it opens this team's roster
  // first (search + add player + who's actually playing) so the team can be topped up before
  // it's used for the match, then a separate "Use This Team" confirms it (user call, 2026-10-27).
  const [rosterTeam, setRosterTeam] = useState<TeamSummary | null>(null);
  const [rosterQuery, setRosterQuery] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  // Tracks who's been explicitly excluded, not who's included — everyone on the roster
  // defaults to "playing" with zero setup, including a player added moments ago via
  // AddPlayerPanel, without needing an effect to sync this against the async roster fetch.
  const [deselectedPlayerIds, setDeselectedPlayerIds] = useState<Set<string>>(new Set());

  const ownedQuery = useOwnedTeams(tab === 'mine' ? query : '');
  const opponentsQuery = useOpponentTeams(tab === 'opponents' ? query : '');
  const rosterTeamDetail = useTeam(rosterTeam?.id);

  function togglePlayerSelected(playerId: string) {
    setDeselectedPlayerIds((prev) => {
      const next = new Set(prev);

      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }

      return next;
    });
  }

  const byCodeMutation = useMutation({
    mutationFn: (code: string) =>
      apiClient.get<TeamSummary | null>(`/teams/by-code?code=${encodeURIComponent(code)}`),
    onSuccess: (team) => {
      if (team) {
        showRoster(team);
      }
    },
    onError: (error) => {
      console.error('GET /teams/by-code failed:', error);
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: () =>
      apiClient.post<TeamSummary>('/teams', {
        name: name.trim(),
        captainPlayerId: selectedCaptain?.id,
        contactNumber: contactNumber.trim() || undefined,
        place: place.trim() || undefined,
      }),
    onSuccess: (team) => {
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
      resetAddForm();
      showRoster(team);
    },
    onError: (error) => {
      console.error('POST /teams failed (team picker):', error);
    },
  });

  function resetAddForm() {
    setName('');
    setContactNumber('');
    setPlace('');
    setSelectedCaptain(null);
    createTeamMutation.reset();
  }

  function showRoster(team: TeamSummary) {
    setRosterTeam(team);
    setRosterQuery('');
    setIsAddingPlayer(false);
    setDeselectedPlayerIds(new Set());
  }

  function confirmSelection() {
    const playerIds = (rosterTeamDetail.data?.players ?? [])
      .filter((player) => !deselectedPlayerIds.has(player.id))
      .map((player) => player.id);

    if (rosterTeam && playerIds.length > 0) {
      onSelect(rosterTeam, playerIds);
      handleClose();
    }
  }

  function handleClose() {
    setQuery('');
    setTab('mine');
    setIsScanning(false);
    resetAddForm();
    byCodeMutation.reset();
    setRosterTeam(null);
    setDeselectedPlayerIds(new Set());
    setRosterQuery('');
    setIsAddingPlayer(false);
    onClose();
  }

  async function handleOpenScanner() {
    if (!permission?.granted) {
      const result = await requestPermission();

      if (!result.granted) {
        return;
      }
    }

    byCodeMutation.reset();
    setIsScanning(true);
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    setIsScanning(false);
    byCodeMutation.mutate(data.trim());
  }

  const listQuery = tab === 'mine' ? ownedQuery : opponentsQuery;
  const isAddValid = name.trim().length > 0 && Boolean(selectedCaptain);
  const rosterPlayers = rosterTeamDetail.data?.players ?? [];
  const selectedCount = rosterPlayers.filter(
    (player) => !deselectedPlayerIds.has(player.id),
  ).length;

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-white"
        >
          <View className="flex-row items-center justify-between border-b border-gray-300 px-4 pb-3 pt-14">
            <Pressable
              onPress={handleClose}
              accessibilityLabel="Close"
              accessibilityHint="Closes team selection without picking a team"
            >
              <X color="#000000" size={22} />
            </Pressable>
            <Text className="text-lg font-bold text-black" numberOfLines={1}>
              {rosterTeam ? rosterTeam.name : title}
            </Text>
            {rosterTeam ? (
              <View style={{ width: 22, height: 22 }} />
            ) : (
              <Pressable
                onPress={() => void handleOpenScanner()}
                accessibilityLabel="Scan QR code"
                accessibilityHint="Opens the camera to scan a team's QR code"
              >
                <CameraIcon color="#000000" size={22} />
              </Pressable>
            )}
          </View>

          {rosterTeam ? (
            <ScrollView className="flex-1 px-4" contentContainerClassName="pb-10 pt-4">
              <Pressable
                onPress={() => setRosterTeam(null)}
                accessibilityLabel="Back to teams"
                accessibilityHint="Returns to the team list without changing your selection"
                className="self-start"
              >
                <Text className="text-sm font-bold text-black">← Back to teams</Text>
              </Pressable>

              <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-black">Players</Text>
                {me?.id === rosterTeam.ownerId && !isAddingPlayer ? (
                  <Pressable
                    onPress={() => setIsAddingPlayer(true)}
                    accessibilityLabel="Add player"
                    accessibilityHint="Opens options to add an existing player or a guest to this team"
                    className="flex-row items-center rounded-lg bg-black px-3 py-2"
                  >
                    <Plus color="#ffffff" size={16} />
                    <Text className="ml-1 text-sm font-bold text-white">Add</Text>
                  </Pressable>
                ) : null}
              </View>

              {isAddingPlayer ? (
                <AddPlayerPanel
                  teamId={rosterTeam.id}
                  onAdded={() => setIsAddingPlayer(false)}
                  onCancel={() => setIsAddingPlayer(false)}
                />
              ) : (
                <>
                  <Text className="mt-1 text-xs text-black">
                    Tap a player to mark them playing or not — {selectedCount} selected
                  </Text>

                  <View className="mt-2 flex-row items-center rounded-lg border border-gray-300 bg-white px-3">
                    <SearchIcon color="#000000" size={16} />
                    <TextInput
                      value={rosterQuery}
                      onChangeText={setRosterQuery}
                      placeholder="Search players"
                      autoCapitalize="none"
                      accessibilityLabel="Search players"
                      accessibilityHint="Filters this team's player list by name"
                      className="ml-2 flex-1 py-3 text-base text-black"
                    />
                  </View>

                  {rosterTeamDetail.isLoading ? (
                    <ActivityIndicator className="mt-6" color="#000000" />
                  ) : null}

                  {(() => {
                    const players = rosterTeamDetail.data?.players ?? [];
                    const filtered = rosterQuery.trim()
                      ? players.filter((player) =>
                          player.displayName
                            .toLowerCase()
                            .includes(rosterQuery.trim().toLowerCase()),
                        )
                      : players;

                    if (!rosterTeamDetail.isLoading && filtered.length === 0) {
                      return (
                        <Text className="mt-4 text-center text-black">
                          {rosterQuery.trim()
                            ? 'No players match that search.'
                            : 'No players added yet.'}
                        </Text>
                      );
                    }

                    return filtered.map((player) => {
                      const isSelected = !deselectedPlayerIds.has(player.id);

                      return (
                        <Pressable
                          key={player.id}
                          onPress={() => togglePlayerSelected(player.id)}
                          accessibilityLabel={`${player.displayName}, ${isSelected ? 'playing' : 'not playing'}`}
                          accessibilityHint="Toggles whether this player is playing in the match"
                          className={`mt-2 flex-row items-center rounded-lg border px-3 py-3 ${
                            isSelected ? 'border-black bg-gray-100' : 'border-gray-300 bg-white'
                          }`}
                        >
                          <View
                            className={`items-center justify-center rounded-full border ${
                              isSelected ? 'border-black bg-black' : 'border-gray-400 bg-white'
                            }`}
                            style={{ width: 18, height: 18 }}
                          >
                            {isSelected ? <Text className="text-xs text-white">✓</Text> : null}
                          </View>
                          <Text className="ml-2 flex-1 text-black">{player.displayName}</Text>
                          {player.isCaptain ? (
                            <View className="ml-2 rounded-full bg-gray-100 px-2 py-0.5">
                              <Text className="text-xs font-bold text-black">Captain</Text>
                            </View>
                          ) : null}
                          {player.isGuest ? (
                            <View className="ml-2 rounded-full bg-gray-100 px-2 py-0.5">
                              <Text className="text-xs font-bold text-gray-500">Guest</Text>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    });
                  })()}

                  <Pressable
                    onPress={confirmSelection}
                    disabled={selectedCount === 0}
                    accessibilityLabel={`Use ${rosterTeam.name}`}
                    accessibilityHint="Confirms this team and its selected players for the match"
                    className={`mt-6 items-center rounded-lg py-3 ${
                      selectedCount > 0 ? 'bg-black' : 'bg-gray-300'
                    }`}
                  >
                    <Text className="font-bold text-white">
                      Use This Team
                      {selectedCount > 0 ? ` (${selectedCount})` : ''}
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          ) : (
            <>
              <View className="flex-row border-b border-gray-300 px-4 pt-2">
                {(Object.keys(TAB_LABELS) as PickerTab[]).map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setTab(value)}
                    accessibilityLabel={TAB_LABELS[value]}
                    accessibilityHint="Switches the team-picker tab"
                    className={`flex-1 items-center border-b-2 pb-3 ${
                      tab === value ? 'border-gray-300' : 'border-transparent'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${tab === value ? 'text-black' : 'text-gray-400'}`}
                    >
                      {TAB_LABELS[value]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {tab !== 'add' ? (
                <View className="px-4 pt-4">
                  <View className="flex-row items-center rounded-lg border border-gray-300 bg-white px-3">
                    <SearchIcon color="#000000" size={16} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Name, code, captain's phone or username"
                      autoCapitalize="none"
                      accessibilityLabel="Search teams"
                      accessibilityHint="Matches by team name, code, or the team's captain's phone or username"
                      className="ml-2 flex-1 py-3 text-base text-black"
                    />
                  </View>
                  {byCodeMutation.isError ? (
                    <Text className="mt-2 text-sm text-red-700">
                      Could not look up that code — try again
                    </Text>
                  ) : null}
                  {byCodeMutation.isSuccess && !byCodeMutation.data ? (
                    <Text className="mt-2 text-sm text-red-700">No team found with that code.</Text>
                  ) : null}
                </View>
              ) : null}

              {tab === 'mine' || tab === 'opponents' ? (
                <ScrollView className="flex-1 px-4" contentContainerClassName="pb-10 pt-3">
                  {listQuery.isLoading ? (
                    <ActivityIndicator className="mt-6" color="#000000" />
                  ) : null}
                  {!listQuery.isLoading && listQuery.data?.length === 0 ? (
                    <Text className="mt-6 text-center text-black">
                      {tab === 'mine'
                        ? 'No teams found.'
                        : 'No opponents found yet — they show up here once you play a match against them, or find them with the scanner.'}
                    </Text>
                  ) : null}
                  {listQuery.data?.map((team) => (
                    <TeamRow key={team.id} team={team} onPress={() => showRoster(team)} />
                  ))}
                </ScrollView>
              ) : (
                <ScrollView
                  className="flex-1 px-4"
                  contentContainerClassName="pb-10 pt-4"
                  keyboardShouldPersistTaps="handled"
                >
                  <Text className="text-sm text-black">Team name</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Riverside FC"
                    accessibilityLabel="Team name"
                    accessibilityHint="The name for the new team"
                    className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-black"
                  />

                  {selectedCaptain ? (
                    <>
                      <Text className="mt-4 text-sm text-black">Captain</Text>
                      <View className="mt-1 flex-row items-center justify-between rounded-lg border border-gray-300 bg-gray-100 px-3 py-3">
                        <Text className="text-base text-black">{selectedCaptain.displayName}</Text>
                        <Pressable
                          onPress={() => setSelectedCaptain(null)}
                          accessibilityLabel="Change captain"
                          accessibilityHint="Clears the selected captain so you can search again"
                        >
                          <Text className="font-bold text-black">Change</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <View className="mt-4">
                      <CaptainPicker onSelect={setSelectedCaptain} />
                    </View>
                  )}

                  <Text className="mt-4 text-sm text-black">Contact number</Text>
                  <TextInput
                    value={contactNumber}
                    onChangeText={setContactNumber}
                    placeholder="e.g. 98765 43210"
                    keyboardType="phone-pad"
                    accessibilityLabel="Contact number"
                    accessibilityHint="Optional — a phone number for this team"
                    className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-black"
                  />

                  <Text className="mt-4 text-sm text-black">Place</Text>
                  <TextInput
                    value={place}
                    onChangeText={setPlace}
                    placeholder="e.g. Riverside Ground, Chennai"
                    accessibilityLabel="Place"
                    accessibilityHint="Optional — where this team is based or usually plays"
                    className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-black"
                  />

                  {createTeamMutation.isError ? (
                    <Text className="mt-2 text-sm text-red-700">
                      Could not save — try again
                      {__DEV__ && createTeamMutation.error instanceof Error
                        ? ` (${createTeamMutation.error.message})`
                        : ''}
                    </Text>
                  ) : null}

                  <Pressable
                    onPress={() => createTeamMutation.mutate()}
                    disabled={!isAddValid || createTeamMutation.isPending}
                    accessibilityLabel="Save and select team"
                    accessibilityHint="Creates this team and selects it for the match"
                    className={`mt-6 items-center rounded-lg py-3 ${
                      isAddValid && !createTeamMutation.isPending ? 'bg-black' : 'bg-gray-300'
                    }`}
                  >
                    {createTeamMutation.isPending ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text className="font-bold text-white">Save &amp; Select</Text>
                    )}
                  </Pressable>
                </ScrollView>
              )}
            </>
          )}
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={isScanning} animationType="slide" onRequestClose={() => setIsScanning(false)}>
        <View className="flex-1 bg-black">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
          />
          <Pressable
            onPress={() => setIsScanning(false)}
            accessibilityLabel="Cancel scanning"
            accessibilityHint="Closes the camera without scanning"
            className="absolute left-6 top-14 items-center justify-center rounded-full bg-black/50"
            style={{ width: 40, height: 40 }}
          >
            <X color="#ffffff" size={22} />
          </Pressable>
          <Text className="absolute bottom-16 w-full text-center text-sm font-bold text-white">
            Point the camera at a team&apos;s QR code
          </Text>
        </View>
      </Modal>
    </>
  );
}
