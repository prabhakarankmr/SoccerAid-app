import { useMutation } from '@tanstack/react-query';
import { useCameraPermissions } from 'expo-camera';
import CameraIcon from 'lucide-react-native/icons/camera';
import X from 'lucide-react-native/icons/x';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';

import { apiClient } from '../../api/client';
import { useMe } from '../../hooks/useMe';
import { TeamSummary, useOpponentTeams, useOwnedTeams, useTeam } from '../../hooks/useTeams';
import { SegmentOption, SlidingSegmentedControl } from '../ui/SlidingSegmentedControl';
import { StadiumBackdrop } from '../ui/StadiumBackdrop';

import { TeamPickerAddForm } from './TeamPickerAddForm';
import { TeamPickerFab } from './TeamPickerFab';
import { TeamPickerList } from './TeamPickerList';
import { TeamPickerRoster } from './TeamPickerRoster';
import { TeamPickerScannerModal } from './TeamPickerScannerModal';

type PickerTab = 'mine' | 'opponents';

const TAB_OPTIONS: SegmentOption<PickerTab>[] = [
  { value: 'mine', label: 'Your Teams', accessibilityHint: 'Shows teams you own' },
  { value: 'opponents', label: 'Opponents', accessibilityHint: 'Shows opponent teams' },
];

interface TeamPickerProps {
  visible: boolean;
  title: string;
  teamSlot?: 'home' | 'away';
  disabledPlayerIds?: string[];
  disabledReason?: string;
  onClose: () => void;
  onSelect: (team: TeamSummary, playerIds: string[]) => void;
}

/**
 * Shared "Select Team A/B" picker for match setup — stadium-pitch themed modal with
 * Your Teams / Opponents tabs, QR scanner (`GET /teams/by-code`), unified floating "+"
 * add button (adds a team on list view, or a player on roster view), and roster step.
 */
export function TeamPicker({
  visible,
  title,
  teamSlot,
  disabledPlayerIds = [],
  disabledReason,
  onClose,
  onSelect,
}: TeamPickerProps) {
  const { data: me } = useMe();
  const [tab, setTab] = useState<PickerTab>('mine');
  const [query, setQuery] = useState('');
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [rosterTeam, setRosterTeam] = useState<TeamSummary | null>(null);
  const [rosterQuery, setRosterQuery] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [deselectedPlayerIds, setDeselectedPlayerIds] = useState<Set<string>>(new Set());

  const resolvedSlot: 'home' | 'away' =
    teamSlot ?? (title.toLowerCase().includes('team b') ? 'away' : 'home');

  const ownedQuery = useOwnedTeams(tab === 'mine' && !isAddingTeam ? query : '');
  const opponentsQuery = useOpponentTeams(tab === 'opponents' && !isAddingTeam ? query : '');
  const rosterTeamDetail = useTeam(rosterTeam?.id);

  function togglePlayerSelected(playerId: string) {
    if (disabledPlayerIds.includes(playerId)) return;

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
      if (team) showRoster(team);
    },
    onError: (error) => console.error('GET /teams/by-code failed:', error),
  });

  function showRoster(team: TeamSummary) {
    setIsAddingTeam(false);
    setRosterTeam(team);
    setRosterQuery('');
    setIsAddingPlayer(false);
    setDeselectedPlayerIds(new Set(disabledPlayerIds));
  }

  function confirmSelection() {
    const playerIds = (rosterTeamDetail.data?.players ?? [])
      .filter(
        (player) => !deselectedPlayerIds.has(player.id) && !disabledPlayerIds.includes(player.id),
      )
      .map((player) => player.id);

    if (rosterTeam && playerIds.length > 0) {
      onSelect(rosterTeam, playerIds);
      handleClose();
    }
  }

  function handleClose() {
    setQuery('');
    setTab('mine');
    setIsAddingTeam(false);
    setIsScanning(false);
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
      if (!result.granted) return;
    }

    byCodeMutation.reset();
    setIsScanning(true);
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    setIsScanning(false);
    byCodeMutation.mutate(data.trim());
  }

  const listQuery = tab === 'mine' ? ownedQuery : opponentsQuery;
  const showFloatingAdd =
    (!rosterTeam && !isAddingTeam) ||
    Boolean(rosterTeam && me?.id === rosterTeam.ownerId && !isAddingPlayer);

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: '#0b140e', position: 'relative' }}
        >
          <StadiumBackdrop />

          <View className="w-full max-w-xl flex-1 self-center px-4 pt-12">
            <View className="flex-row items-center justify-between py-2">
              <Pressable
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                accessibilityHint="Closes team selection without picking a team"
                className="h-10 w-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
              >
                <X color="#ffffff" size={20} />
              </Pressable>

              <Text
                className="mx-3 flex-1 text-center text-xl font-bold text-white"
                numberOfLines={1}
              >
                {rosterTeam ? rosterTeam.name : isAddingTeam ? 'Add Team' : title}
              </Text>

              {rosterTeam || isAddingTeam ? (
                <View className="h-10 w-10" />
              ) : (
                <Pressable
                  onPress={() => void handleOpenScanner()}
                  accessibilityRole="button"
                  accessibilityLabel="Scan QR code"
                  accessibilityHint="Opens the camera to scan a team's QR code"
                  className="h-10 w-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
                >
                  <CameraIcon color="#ffffff" size={20} />
                </Pressable>
              )}
            </View>

            {rosterTeam ? (
              <TeamPickerRoster
                team={rosterTeam}
                teamSlot={resolvedSlot}
                isOwner={me?.id === rosterTeam.ownerId}
                players={rosterTeamDetail.data?.players ?? []}
                isLoading={rosterTeamDetail.isLoading}
                rosterQuery={rosterQuery}
                onChangeRosterQuery={setRosterQuery}
                isAddingPlayer={isAddingPlayer}
                onSetIsAddingPlayer={setIsAddingPlayer}
                deselectedPlayerIds={deselectedPlayerIds}
                disabledPlayerIds={disabledPlayerIds}
                disabledReason={disabledReason}
                onTogglePlayer={togglePlayerSelected}
                onBackToTeams={() => setRosterTeam(null)}
                onConfirm={confirmSelection}
              />
            ) : isAddingTeam ? (
              <TeamPickerAddForm
                teamSlot={resolvedSlot}
                onBack={() => setIsAddingTeam(false)}
                onCreated={showRoster}
              />
            ) : (
              <>
                <View className="mt-2">
                  <SlidingSegmentedControl
                    options={TAB_OPTIONS}
                    selectedValue={tab}
                    onSelect={setTab}
                    className="rounded-full border-white/20 bg-white/15"
                    inactiveTextClassName="text-white/90"
                  />
                </View>

                <TeamPickerList
                  tab={tab}
                  teamSlot={resolvedSlot}
                  query={query}
                  onChangeQuery={setQuery}
                  teams={listQuery.data}
                  isLoading={listQuery.isLoading}
                  byCodeError={byCodeMutation.isError}
                  byCodeNotFound={byCodeMutation.isSuccess && !byCodeMutation.data}
                  onSelectTeam={showRoster}
                />
              </>
            )}

            {showFloatingAdd ? (
              <TeamPickerFab
                bottom={rosterTeam ? 96 : 28}
                accessibilityLabel={rosterTeam ? 'Add player' : 'Add team'}
                accessibilityHint={
                  rosterTeam
                    ? 'Opens options to add a player to this team'
                    : 'Opens the form to create a new team'
                }
                onPress={() => (rosterTeam ? setIsAddingPlayer(true) : setIsAddingTeam(true))}
              />
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <TeamPickerScannerModal
        visible={isScanning}
        onClose={() => setIsScanning(false)}
        onScanned={handleBarcodeScanned}
      />
    </>
  );
}
