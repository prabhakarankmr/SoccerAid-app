import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Check from 'lucide-react-native/icons/check';
import GoalIcon from 'lucide-react-native/icons/goal';
import Shield from 'lucide-react-native/icons/shield';
import User from 'lucide-react-native/icons/user';
import X from 'lucide-react-native/icons/x';
import Zap from 'lucide-react-native/icons/zap';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Side } from '../../hooks/useMatches';

export interface StarterOption {
  side: Side;
  playerId: string;
  displayName: string;
  isGoalkeeper: boolean;
}

export interface GoalFlowSheetProps {
  visible: boolean;
  disabled?: boolean;
  homeTeamName: string;
  awayTeamName: string;
  starters: StarterOption[];
  onConfirmGoal: (side: Side, scorerId: string, assistPlayerId?: string) => void;
  onCancel: () => void;
}

export function GoalFlowSheet({
  visible,
  disabled = false,
  homeTeamName,
  awayTeamName,
  starters,
  onConfirmGoal,
  onCancel,
}: GoalFlowSheetProps) {
  const [step, setStep] = useState<'scorer' | 'assist'>('scorer');
  const [activeSide, setActiveSide] = useState<Side>('HOME');
  const [selectedScorer, setSelectedScorer] = useState<StarterOption | null>(null);

  function handleClose() {
    setStep('scorer');
    setSelectedScorer(null);
    setActiveSide('HOME');
    onCancel();
  }

  function handleSelectScorer(player: StarterOption) {
    setSelectedScorer(player);
    setActiveSide(player.side);
    setStep('assist');
  }

  function handleSelectAssist(teammate: StarterOption) {
    if (!selectedScorer) return;
    const scorer = selectedScorer;
    setStep('scorer');
    setSelectedScorer(null);
    onConfirmGoal(scorer.side, scorer.playerId, teammate.playerId);
  }

  function handleSoloGoal() {
    if (!selectedScorer) return;
    const scorer = selectedScorer;
    setStep('scorer');
    setSelectedScorer(null);
    onConfirmGoal(scorer.side, scorer.playerId, undefined);
  }

  const teamStarters = starters.filter((s) => s.side === activeSide);
  const eligibleAssisters = starters.filter(
    (s) =>
      selectedScorer && s.side === selectedScorer.side && s.playerId !== selectedScorer.playerId,
  );

  const isHome = activeSide === 'HOME';
  const activeTeamName = isHome ? homeTeamName : awayTeamName;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable
        onPress={handleClose}
        accessibilityLabel="Close goal sheet"
        accessibilityHint="Dismisses the goal recording bottom sheet"
        className="flex-1 justify-end bg-black/60"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessible={false}
          className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-3 shadow-2xl"
        >
          {/* Drag Handle Indicator */}
          <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-gray-300" />

          {/* Header Bar */}
          <View className="flex-row items-center justify-between pb-2">
            <View className="flex-row items-center gap-2">
              {step === 'assist' ? (
                <Pressable
                  onPress={() => setStep('scorer')}
                  accessibilityLabel="Back to scorer selection"
                  accessibilityHint="Returns to who scored"
                  className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
                >
                  <ArrowLeft color="#0f172a" size={18} />
                </Pressable>
              ) : null}
              <Text className="text-xl font-bold text-slate-900">
                {step === 'scorer' ? 'Who Scored?' : 'Who Assisted?'}
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              accessibilityLabel="Close"
              accessibilityHint="Closes without recording a goal"
              className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            >
              <X color="#64748b" size={18} />
            </Pressable>
          </View>

          {/* Step 1: Scorer Selection */}
          {step === 'scorer' ? (
            <>
              {/* Team Pill Selector Tabs */}
              <View className="my-2.5 flex-row gap-2">
                <Pressable
                  onPress={() => setActiveSide('HOME')}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${homeTeamName}`}
                  accessibilityHint="Shows starting players for home team"
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 py-2.5 ${
                    activeSide === 'HOME'
                      ? 'border-orange-500 bg-orange-50 shadow-sm'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className="h-3 w-3 rounded-full bg-orange-500" />
                  <Text
                    numberOfLines={1}
                    className={`text-sm font-bold ${
                      activeSide === 'HOME' ? 'text-orange-900' : 'text-gray-600'
                    }`}
                  >
                    {homeTeamName}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setActiveSide('AWAY')}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${awayTeamName}`}
                  accessibilityHint="Shows starting players for away team"
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 py-2.5 ${
                    activeSide === 'AWAY'
                      ? 'border-blue-600 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className="h-3 w-3 rounded-full bg-blue-600" />
                  <Text
                    numberOfLines={1}
                    className={`text-sm font-bold ${
                      activeSide === 'AWAY' ? 'text-blue-900' : 'text-gray-600'
                    }`}
                  >
                    {awayTeamName}
                  </Text>
                </Pressable>
              </View>

              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Select Goal Scorer ({activeTeamName})
              </Text>

              {/* Player Tap Cards List */}
              <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
                {teamStarters.map((player) => (
                  <Pressable
                    key={player.playerId}
                    onPress={() => handleSelectScorer(player)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Scorer: ${player.displayName}`}
                    accessibilityHint="Selects this player and proceeds to assist selection"
                    className="mb-2.5 flex-row items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm active:bg-gray-50"
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-full border ${
                          isHome
                            ? 'border-orange-400 bg-orange-50 text-orange-700'
                            : 'border-blue-400 bg-blue-50 text-blue-700'
                        }`}
                      >
                        {player.isGoalkeeper ? (
                          <Shield color={isHome ? '#ea580c' : '#2563eb'} size={18} />
                        ) : (
                          <User color={isHome ? '#ea580c' : '#2563eb'} size={18} />
                        )}
                      </View>
                      <View>
                        <Text className="text-base font-bold text-slate-900">
                          {player.displayName}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {player.isGoalkeeper ? 'Goalkeeper (GK)' : 'Outfield Player'}
                        </Text>
                      </View>
                    </View>
                    <View className="h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                      <Check color="#94a3b8" size={14} />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : (
            /* Step 2: Assist Selection */
            <>
              {/* Scorer Summary Card */}
              <View className="my-2.5 flex-row items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
                <View className="flex-row items-center gap-2.5">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-emerald-600">
                    <GoalIcon color="#ffffff" size={16} />
                  </View>
                  <View>
                    <Text className="text-xs font-semibold text-emerald-800">Goal Scored By</Text>
                    <Text className="text-sm font-bold text-emerald-950">
                      {selectedScorer?.displayName} ({activeTeamName})
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setStep('scorer')}
                  accessibilityRole="button"
                  accessibilityLabel="Change goal scorer"
                  accessibilityHint="Returns to scorer selection"
                  className="rounded-lg bg-emerald-100 px-2.5 py-1 active:bg-emerald-200"
                >
                  <Text className="text-xs font-bold text-emerald-800">Change</Text>
                </Pressable>
              </View>

              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Select Who Assisted Or Choose Solo Goal
              </Text>

              <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
                {/* Solo Goal Option */}
                <Pressable
                  onPress={handleSoloGoal}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel="Solo Goal, unassisted effort"
                  accessibilityHint="Records the goal as a solo goal without an assist"
                  className="mb-3 flex-row items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3.5 active:bg-slate-100"
                >
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-800">
                    <Zap color="#ffffff" size={18} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
                      Solo Goal{' '}
                    </Text>
                  </View>
                </Pressable>

                {/* Teammate Assisters */}
                {eligibleAssisters.map((player) => (
                  <Pressable
                    key={player.playerId}
                    onPress={() => handleSelectAssist(player)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Assisted by ${player.displayName}`}
                    accessibilityHint="Records goal with this assist"
                    className="mb-2.5 flex-row items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm active:bg-gray-50"
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-full border ${
                          isHome
                            ? 'border-orange-400 bg-orange-50 text-orange-700'
                            : 'border-blue-400 bg-blue-50 text-blue-700'
                        }`}
                      >
                        <User color={isHome ? '#ea580c' : '#2563eb'} size={18} />
                      </View>
                      <View>
                        <Text className="text-base font-bold text-slate-900">
                          {player.displayName}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {player.isGoalkeeper ? 'Goalkeeper (GK)' : 'Outfield Teammate'}
                        </Text>
                      </View>
                    </View>
                    <View className="h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                      <Check color="#94a3b8" size={14} />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
