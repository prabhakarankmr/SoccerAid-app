import { router } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { TeamPickerAddForm } from '../../src/components/match/TeamPickerAddForm';
import { StadiumBackdrop } from '../../src/components/ui/StadiumBackdrop';

export default function NewTeam() {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#0b140e', position: 'relative' }}
    >
      <StadiumBackdrop />

      <View className="w-full max-w-xl flex-1 self-center px-4 pt-12">
        <View className="flex-row items-center justify-between py-2">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to Teams"
            accessibilityHint="Returns to the teams list without saving"
            className="h-10 w-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
          >
            <ArrowLeft color="#ffffff" size={20} />
          </Pressable>

          <Text className="mx-3 flex-1 text-center text-xl font-bold text-white" numberOfLines={1}>
            Add Team
          </Text>

          <View className="h-10 w-10" />
        </View>

        <TeamPickerAddForm
          teamSlot="club"
          submitLabel="Save Team"
          showBackPill={false}
          onBack={() => router.back()}
          onCreated={(team) => router.replace({ pathname: '/teams/[id]', params: { id: team.id } })}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
