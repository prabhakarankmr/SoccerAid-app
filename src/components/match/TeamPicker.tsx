import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import CameraIcon from 'lucide-react-native/icons/camera';
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
import { PlayerSummary } from '../../hooks/usePlayers';
import { TeamSummary, useOpponentTeams, useOwnedTeams } from '../../hooks/useTeams';
import { MemberLookup } from '../team/MemberLookup';

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
  onSelect: (team: TeamSummary) => void;
}

function TeamRow({ team, onPress }: { team: TeamSummary; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Select ${team.name}`}
      accessibilityHint="Chooses this team"
      className="mt-2 flex-row items-center rounded-lg border border-emerald-200 bg-white p-3"
    >
      <View
        className="items-center justify-center rounded-full bg-emerald-100"
        style={{ width: 40, height: 40 }}
      >
        <Text className="font-bold text-emerald-700">
          {team.name.trim().charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-bold text-emerald-900">{team.name}</Text>
        <Text className="text-xs text-emerald-600">
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
  const [tab, setTab] = useState<PickerTab>('mine');
  const [query, setQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [place, setPlace] = useState('');
  const [selectedCaptain, setSelectedCaptain] = useState<PlayerSummary | null>(null);

  const ownedQuery = useOwnedTeams(tab === 'mine' ? query : '');
  const opponentsQuery = useOpponentTeams(tab === 'opponents' ? query : '');

  const byCodeMutation = useMutation({
    mutationFn: (code: string) =>
      apiClient.get<TeamSummary | null>(`/teams/by-code?code=${encodeURIComponent(code)}`),
    onSuccess: (team) => {
      if (team) {
        handleSelect(team);
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
      handleSelect(team);
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

  function handleSelect(team: TeamSummary) {
    onSelect(team);
    handleClose();
  }

  function handleClose() {
    setQuery('');
    setTab('mine');
    setIsScanning(false);
    resetAddForm();
    byCodeMutation.reset();
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

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-white"
        >
          <View className="flex-row items-center justify-between border-b border-emerald-100 px-4 pb-3 pt-14">
            <Pressable
              onPress={handleClose}
              accessibilityLabel="Close"
              accessibilityHint="Closes team selection without picking a team"
            >
              <X color="#047857" size={22} />
            </Pressable>
            <Text className="text-lg font-bold text-emerald-800">{title}</Text>
            <Pressable
              onPress={() => void handleOpenScanner()}
              accessibilityLabel="Scan QR code"
              accessibilityHint="Opens the camera to scan a team's QR code"
            >
              <CameraIcon color="#047857" size={22} />
            </Pressable>
          </View>

          <View className="flex-row border-b border-emerald-100 px-4 pt-2">
            {(Object.keys(TAB_LABELS) as PickerTab[]).map((value) => (
              <Pressable
                key={value}
                onPress={() => setTab(value)}
                accessibilityLabel={TAB_LABELS[value]}
                accessibilityHint="Switches the team-picker tab"
                className={`flex-1 items-center border-b-2 pb-3 ${
                  tab === value ? 'border-emerald-600' : 'border-transparent'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${tab === value ? 'text-emerald-700' : 'text-gray-400'}`}
                >
                  {TAB_LABELS[value]}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab !== 'add' ? (
            <View className="px-4 pt-4">
              <View className="flex-row items-center rounded-lg border border-emerald-300 bg-white px-3">
                <SearchIcon color="#047857" size={16} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Name, code, captain's phone or username"
                  autoCapitalize="none"
                  accessibilityLabel="Search teams"
                  accessibilityHint="Matches by team name, code, or the team's captain's phone or username"
                  className="ml-2 flex-1 py-3 text-base text-emerald-900"
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
              {listQuery.isLoading ? <ActivityIndicator className="mt-6" color="#059669" /> : null}
              {!listQuery.isLoading && listQuery.data?.length === 0 ? (
                <Text className="mt-6 text-center text-emerald-500">
                  {tab === 'mine'
                    ? 'No teams found.'
                    : 'No opponents found yet — they show up here once you play a match against them, or find them with the scanner.'}
                </Text>
              ) : null}
              {listQuery.data?.map((team) => (
                <TeamRow key={team.id} team={team} onPress={() => handleSelect(team)} />
              ))}
            </ScrollView>
          ) : (
            <ScrollView
              className="flex-1 px-4"
              contentContainerClassName="pb-10 pt-4"
              keyboardShouldPersistTaps="handled"
            >
              <Text className="text-sm text-emerald-700">Team name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Riverside FC"
                accessibilityLabel="Team name"
                accessibilityHint="The name for the new team"
                className="mt-1 rounded-lg border border-emerald-300 bg-white px-3 py-3 text-base text-emerald-900"
              />

              {selectedCaptain ? (
                <>
                  <Text className="mt-4 text-sm text-emerald-700">Captain</Text>
                  <View className="mt-1 flex-row items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-3">
                    <Text className="text-base text-emerald-900">
                      {selectedCaptain.displayName}
                    </Text>
                    <Pressable
                      onPress={() => setSelectedCaptain(null)}
                      accessibilityLabel="Change captain"
                      accessibilityHint="Clears the selected captain so you can search again"
                    >
                      <Text className="font-bold text-emerald-700">Change</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View className="mt-4">
                  <MemberLookup label="Captain" onSelect={setSelectedCaptain} />
                </View>
              )}

              <Text className="mt-4 text-sm text-emerald-700">Contact number</Text>
              <TextInput
                value={contactNumber}
                onChangeText={setContactNumber}
                placeholder="e.g. 98765 43210"
                keyboardType="phone-pad"
                accessibilityLabel="Contact number"
                accessibilityHint="Optional — a phone number for this team"
                className="mt-1 rounded-lg border border-emerald-300 bg-white px-3 py-3 text-base text-emerald-900"
              />

              <Text className="mt-4 text-sm text-emerald-700">Place</Text>
              <TextInput
                value={place}
                onChangeText={setPlace}
                placeholder="e.g. Riverside Ground, Chennai"
                accessibilityLabel="Place"
                accessibilityHint="Optional — where this team is based or usually plays"
                className="mt-1 rounded-lg border border-emerald-300 bg-white px-3 py-3 text-base text-emerald-900"
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
                  isAddValid && !createTeamMutation.isPending ? 'bg-emerald-600' : 'bg-emerald-300'
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
