import { useMutation, useQueryClient } from '@tanstack/react-query';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Shield from 'lucide-react-native/icons/shield';
import UserCheck from 'lucide-react-native/icons/user-check';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { apiClient } from '../../api/client';
import { useMe } from '../../hooks/useMe';
import { PlayerSummary } from '../../hooks/usePlayers';
import { TeamSummary } from '../../hooks/useTeams';
import { teamA, teamB } from '../../theme/tokens';
import { MemberLookup } from '../team/MemberLookup';
import { ScalePressable } from '../ui/ScalePressable';
import { SlidingSegmentedControl } from '../ui/SlidingSegmentedControl';

type CaptainMode = 'appUser' | 'guest';

const CAPTAIN_MODE_OPTIONS: { value: CaptainMode; label: string; accessibilityHint: string }[] = [
  {
    value: 'appUser',
    label: 'App User',
    accessibilityHint: 'Search for an existing SoccerAid user',
  },
  { value: 'guest', label: 'Guest', accessibilityHint: 'Create a name-only guest captain' },
];

interface TeamPickerAddFormProps {
  teamSlot?: 'home' | 'away' | 'club';
  submitLabel?: string;
  showBackPill?: boolean;
  onBack: () => void;
  onCreated: (team: TeamSummary) => void;
}

/**
 * Dark glassmorphic card form for creating a new team (shared by TeamPicker and teams/new.tsx):
 * live club crest preview, one-tap "Me (Use my profile)" shortcut, and collapsible optional fields.
 */
export function TeamPickerAddForm({
  teamSlot = 'home',
  submitLabel = 'Save & Select',
  showBackPill = true,
  onBack,
  onCreated,
}: TeamPickerAddFormProps) {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [place, setPlace] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [selectedCaptain, setSelectedCaptain] = useState<PlayerSummary | null>(null);
  const [captainMode, setCaptainMode] = useState<CaptainMode>('appUser');
  const [guestName, setGuestName] = useState('');

  const accent =
    teamSlot === 'away'
      ? teamB
      : teamSlot === 'club'
        ? { fill: '#10b981', chipBg: '#d1fae5' }
        : teamA;
  const badgeBg =
    teamSlot === 'away'
      ? 'border-blue-400/40 bg-blue-500/20'
      : teamSlot === 'club'
        ? 'border-emerald-400/40 bg-emerald-500/20'
        : 'border-orange-400/40 bg-orange-500/20';
  const slotLabel = teamSlot === 'away' ? 'Team B' : teamSlot === 'club' ? 'SoccerAid' : 'Team A';
  const slotBadgeText =
    teamSlot === 'away'
      ? 'text-blue-300'
      : teamSlot === 'club'
        ? 'text-emerald-300'
        : 'text-orange-300';

  const createGuestMutation = useMutation({
    mutationFn: (displayName: string) => apiClient.post<PlayerSummary>('/players', { displayName }),
    onSuccess: (player) => {
      setGuestName('');
      setSelectedCaptain(player);
    },
    onError: (err) => console.error('POST /players failed (guest captain):', err),
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
      onCreated(team);
    },
    onError: (err) => console.error('POST /teams failed (team picker):', err),
  });

  function selectSelfAsCaptain() {
    if (!me?.player) return;
    setSelectedCaptain({
      id: me.player.id,
      displayName: me.player.displayName,
      phone: me.phone,
      preferredPosition: me.player.preferredPosition,
    });
  }

  const canSubmit =
    name.trim().length > 0 && Boolean(selectedCaptain) && !createTeamMutation.isPending;

  return (
    <View className="flex-1 pt-2">
      {showBackPill ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to teams"
          accessibilityHint="Returns to the team list"
          className="mb-2 flex-row items-center self-start rounded-full bg-white/20 px-3.5 py-2 active:bg-white/30"
        >
          <ArrowLeft color="#ffffff" size={15} />
          <Text className="ml-1.5 text-xs font-bold text-white">Back to teams</Text>
        </Pressable>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-12 pt-1"
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl border border-white/15 bg-slate-900/85 p-5 shadow-sm">
          <View className="mb-4 flex-row items-center border-b border-white/10 pb-4">
            <View className={`h-12 w-12 items-center justify-center rounded-xl border ${badgeBg}`}>
              {name.trim() ? (
                <Text className={`text-lg font-black ${slotBadgeText}`}>
                  {name.trim().charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Shield color={accent.fill} fill={accent.chipBg} size={22} />
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className={`text-xs font-semibold ${slotBadgeText}`}>New {slotLabel} team</Text>
              <Text className="text-base font-bold text-white" numberOfLines={1}>
                {name.trim() || 'Team profile'}
              </Text>
            </View>
          </View>

          <Text className="text-xs font-semibold text-slate-300">Team name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Riverside FC"
            placeholderTextColor="#94a3b8"
            accessibilityLabel="Team name"
            accessibilityHint="The name for the new team"
            className="mt-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-base text-white"
          />

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wide text-slate-300">
              Captain
            </Text>
            {me?.player && !selectedCaptain ? (
              <Pressable
                onPress={selectSelfAsCaptain}
                accessibilityRole="button"
                accessibilityLabel="Use my profile as captain"
                accessibilityHint="Selects your own profile as the team captain"
                className="flex-row items-center rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 active:bg-emerald-500/30"
              >
                <UserCheck color="#6ee7b7" size={12} />
                <Text className="ml-1 text-[11px] font-bold text-emerald-300">
                  Me ({me.player.displayName})
                </Text>
              </Pressable>
            ) : null}
          </View>

          {selectedCaptain ? (
            <View className="mt-1.5 flex-row items-center justify-between rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-3">
              <Text className="flex-1 text-base font-semibold text-white" numberOfLines={1}>
                {selectedCaptain.displayName}
              </Text>
              <Pressable
                onPress={() => setSelectedCaptain(null)}
                accessibilityRole="button"
                accessibilityLabel="Change captain"
                accessibilityHint="Clears the selected captain so you can pick another"
                className="ml-2 rounded-lg bg-white/15 px-2.5 py-1"
              >
                <Text className="text-xs font-bold text-white">Change</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-2">
              <SlidingSegmentedControl
                options={CAPTAIN_MODE_OPTIONS}
                selectedValue={captainMode}
                onSelect={setCaptainMode}
                className="mb-3 rounded-xl border-white/15 bg-white/10"
                inactiveTextClassName="text-white/80"
              />
              {captainMode === 'appUser' ? (
                <MemberLookup label="" variant="dark" onSelect={setSelectedCaptain} />
              ) : (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={guestName}
                    onChangeText={setGuestName}
                    placeholder="Guest captain's name"
                    placeholderTextColor="#94a3b8"
                    accessibilityLabel="Guest captain name"
                    accessibilityHint="Creates a team captain without a SoccerAid account"
                    onSubmitEditing={() =>
                      guestName.trim() && createGuestMutation.mutate(guestName.trim())
                    }
                    returnKeyType="done"
                    className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-base text-white"
                  />
                  <Pressable
                    onPress={() => createGuestMutation.mutate(guestName.trim())}
                    disabled={!guestName.trim() || createGuestMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Add guest captain"
                    accessibilityHint="Creates and selects this guest captain"
                    className={`items-center justify-center rounded-xl px-4 py-3 ${
                      guestName.trim() && !createGuestMutation.isPending
                        ? 'bg-emerald-500 active:bg-emerald-600'
                        : 'bg-white/15'
                    }`}
                  >
                    {createGuestMutation.isPending ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text
                        className={`font-bold ${guestName.trim() ? 'text-white' : 'text-white/40'}`}
                      >
                        Add
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {showOptional ? (
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wide text-slate-300">
                  Contact
                </Text>
                <TextInput
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  placeholder="Optional phone"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  accessibilityLabel="Contact number"
                  accessibilityHint="Optional phone number for this team"
                  className="mt-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm text-white"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wide text-slate-300">
                  Ground
                </Text>
                <TextInput
                  value={place}
                  onChangeText={setPlace}
                  placeholder="Optional place"
                  placeholderTextColor="#94a3b8"
                  accessibilityLabel="Place"
                  accessibilityHint="Optional ground or city where this team plays"
                  className="mt-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm text-white"
                />
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowOptional(true)}
              accessibilityRole="button"
              accessibilityLabel="Add contact and ground"
              accessibilityHint="Expands optional contact phone and ground fields"
              className="mt-4 self-start"
            >
              <Text className="text-xs font-semibold text-emerald-300">
                + Add contact &amp; ground (optional)
              </Text>
            </Pressable>
          )}

          {createTeamMutation.isError ? (
            <Text className="mt-3 text-sm font-medium text-red-300">
              Could not save — try again
              {__DEV__ && createTeamMutation.error instanceof Error
                ? ` (${createTeamMutation.error.message})`
                : ''}
            </Text>
          ) : null}

          <ScalePressable
            onPress={() => createTeamMutation.mutate()}
            disabled={!canSubmit}
            activeScale={0.97}
            hapticFeedback="medium"
            accessibilityRole="button"
            accessibilityLabel="Save and select team"
            accessibilityHint="Creates this team and selects it for the match"
            className={`mt-5 items-center justify-center rounded-2xl py-4 ${
              canSubmit ? 'bg-emerald-500 active:bg-emerald-600' : 'bg-white/15'
            }`}
          >
            {createTeamMutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className={`text-base font-bold ${canSubmit ? 'text-white' : 'text-white/40'}`}>
                {submitLabel}
              </Text>
            )}
          </ScalePressable>
        </View>
      </ScrollView>
    </View>
  );
}
