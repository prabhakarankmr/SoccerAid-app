import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { ScalePressable } from '../ui/ScalePressable';

interface ProfileEditCardProps {
  displayName: string;
  onChangeDisplayName: (value: string) => void;
  username: string;
  onChangeUsername: (value: string) => void;
  bio: string;
  onChangeBio: (value: string) => void;
  preferredPosition: string;
  onChangePreferredPosition: (value: string) => void;
  isUsernameValid: boolean;
  usernameTaken: boolean;
  isValid: boolean;
  isPending: boolean;
  error: unknown;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * Dark glassmorphic Edit Profile card for app/(tabs)/profile.tsx.
 */
export function ProfileEditCard({
  displayName,
  onChangeDisplayName,
  username,
  onChangeUsername,
  bio,
  onChangeBio,
  preferredPosition,
  onChangePreferredPosition,
  isUsernameValid,
  usernameTaken,
  isValid,
  isPending,
  error,
  onCancel,
  onSave,
}: ProfileEditCardProps) {
  const canSave = isValid && !isPending;

  return (
    <View className="mt-6 rounded-2xl border border-white/15 bg-slate-900/85 p-5 shadow-sm">
      <Text className="text-xs font-bold uppercase tracking-wide text-slate-300">Display Name</Text>
      <TextInput
        value={displayName}
        onChangeText={onChangeDisplayName}
        placeholder="e.g. Virat K"
        placeholderTextColor="#94a3b8"
        accessibilityLabel="Display name"
        accessibilityHint="The name other players will see"
        className="mt-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-base text-white"
      />

      <Text className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-300">
        Username
      </Text>
      <View className="mt-1.5 flex-row items-center rounded-xl border border-white/15 bg-white/10 px-3.5">
        <Text className="text-base font-bold text-slate-400">@</Text>
        <TextInput
          value={username}
          onChangeText={(text) =>
            onChangeUsername(
              text
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '')
                .slice(0, 20),
            )
          }
          placeholder="yourname"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          accessibilityLabel="Username"
          accessibilityHint="3 to 20 characters: lowercase letters, numbers, underscores"
          className="ml-1.5 flex-1 py-3 text-base text-white"
        />
      </View>
      {username.length > 0 && !isUsernameValid ? (
        <Text className="mt-1 text-xs text-red-300">
          3-20 characters: lowercase letters, numbers, underscores only
        </Text>
      ) : null}
      {usernameTaken ? (
        <Text className="mt-1 text-xs text-red-300">That username is already taken</Text>
      ) : null}

      <Text className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-300">Bio</Text>
      <TextInput
        value={bio}
        onChangeText={(text) => onChangeBio(text.slice(0, 160))}
        placeholder="Tell other players a bit about yourself"
        placeholderTextColor="#94a3b8"
        multiline
        numberOfLines={3}
        maxLength={160}
        accessibilityLabel="Bio"
        accessibilityHint="Optional — a short description shown on your profile"
        className="mt-1.5 h-20 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-base text-white"
        style={{ textAlignVertical: 'top' }}
      />

      <Text className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-300">
        Preferred Position
      </Text>
      <TextInput
        value={preferredPosition}
        onChangeText={onChangePreferredPosition}
        placeholder="e.g. Striker"
        placeholderTextColor="#94a3b8"
        accessibilityLabel="Preferred position"
        accessibilityHint="Optional — the position you usually play"
        className="mt-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-base text-white"
      />

      {error && !usernameTaken ? (
        <Text className="mt-3 text-sm text-red-300">
          Could not save — try again
          {__DEV__ && error instanceof Error ? ` (${error.message})` : ''}
        </Text>
      ) : null}

      <View className="mt-6 flex-row gap-3">
        <Pressable
          onPress={onCancel}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel="Cancel editing"
          accessibilityHint="Discards changes and returns to your profile"
          className="flex-1 items-center justify-center rounded-2xl bg-white/15 py-3.5 active:bg-white/25"
        >
          <Text className="font-bold text-white">Cancel</Text>
        </Pressable>
        <ScalePressable
          onPress={onSave}
          disabled={!canSave}
          activeScale={0.97}
          hapticFeedback="medium"
          accessibilityRole="button"
          accessibilityLabel="Save profile"
          accessibilityHint="Saves your changes"
          className={`flex-1 items-center justify-center rounded-2xl py-3.5 ${
            canSave ? 'bg-emerald-500 active:bg-emerald-600' : 'bg-white/15'
          }`}
        >
          {isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className={`font-bold ${canSave ? 'text-white' : 'text-white/40'}`}>Save</Text>
          )}
        </ScalePressable>
      </View>
    </View>
  );
}
