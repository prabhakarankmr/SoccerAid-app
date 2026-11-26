import ArrowDownUp from 'lucide-react-native/icons/arrow-down-up';
import Clock from 'lucide-react-native/icons/clock';
import Flag from 'lucide-react-native/icons/flag';
import GoalIcon from 'lucide-react-native/icons/goal';
import MessageSquare from 'lucide-react-native/icons/message-square';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import Radio from 'lucide-react-native/icons/radio';
import Send from 'lucide-react-native/icons/send';
import Shield from 'lucide-react-native/icons/shield';
import Trophy from 'lucide-react-native/icons/trophy';
import { useMemo, useState } from 'react';
import { Keyboard, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';

import { MatchEvent, Side } from '../../hooks/useMatches';
import { ScalePressable } from '../ui/ScalePressable';

export interface UserComment {
  id: string;
  author: string;
  text: string;
  time: string;
  minute: string | null;
  timestamp: number;
  afterEventId: string | null;
}

export interface EventsTimelineProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
  nameOf: (id: string | null) => string;
  isMatchLive?: boolean;
  isFullHeight?: boolean;
  currentUserName?: string;
  currentMinute?: number;
}

function formatMinute(e: MatchEvent): string {
  if (e.type === 'HALF_TIME') return 'HT';
  if (e.type === 'FULL_TIME') return 'FT';
  if (e.type === 'ADD_TIME') return `+${Math.round((e.addedSeconds ?? 0) / 60)}'`;
  const m = Math.max(1, Math.ceil(e.matchClockSec / 60));
  if (e.period === 'FIRST_HALF' && m > 45) return `45+${m - 45}'`;
  if (e.period === 'SECOND_HALF' && m > 90) return `90+${m - 90}'`;
  return `${m}'`;
}

function eventConfig(type: MatchEvent['type'], side: Side | null) {
  switch (type) {
    case 'GOAL':
      return {
        label: 'Goal',
        icon: GoalIcon,
        iconColor: side === 'HOME' ? '#fb923c' : '#60a5fa',
        tagColor: 'text-emerald-400',
      };
    case 'SHOT_SAVED':
      return { label: 'Save', icon: Shield, iconColor: '#38bdf8', tagColor: 'text-sky-400' };
    case 'FOUL':
      return { label: 'Foul', icon: Flag, iconColor: '#f59e0b', tagColor: 'text-amber-400' };
    case 'KICK_OFF':
    case 'SECOND_HALF_START':
      return { label: 'Kickoff', icon: Play, iconColor: '#34d399', tagColor: 'text-emerald-400' };
    case 'HALF_TIME':
      return { label: 'Half Time', icon: Clock, iconColor: '#94a3b8', tagColor: 'text-slate-300' };
    case 'FULL_TIME':
      return { label: 'Full Time', icon: Trophy, iconColor: '#fbbf24', tagColor: 'text-amber-300' };
    case 'ADD_TIME':
      return { label: 'Stoppage', icon: Clock, iconColor: '#818cf8', tagColor: 'text-indigo-300' };
    case 'PAUSE':
    case 'RESUME':
      return {
        label: type === 'PAUSE' ? 'Paused' : 'Resumed',
        icon: type === 'PAUSE' ? Pause : Play,
        iconColor: '#94a3b8',
        tagColor: 'text-slate-300',
      };
  }
}

type FeedItem = { kind: 'event'; data: MatchEvent } | { kind: 'comment'; data: UserComment };

export function EventsTimeline({
  events,
  homeTeamName: _homeTeamName,
  awayTeamName: _awayTeamName,
  nameOf,
  isFullHeight = false,
  currentUserName = 'Player',
  currentMinute,
}: EventsTimelineProps) {
  const [isAscending, setIsAscending] = useState(true);
  const [comments, setComments] = useState<UserComment[]>([]);
  const [inputText, setInputText] = useState('');

  const handleSendComment = () => {
    const text = inputText.trim();
    if (!text) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const minute = currentMinute ? `${currentMinute}'` : null;

    // Anchor the comment to the currently latest event in chronological order
    const latestEventId = events.length > 0 ? events[events.length - 1].id : null;

    const newComment: UserComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: currentUserName,
      text,
      time,
      minute,
      timestamp: Date.now(),
      afterEventId: latestEventId,
    };

    setComments((prev) => [...prev, newComment]);
    setInputText('');
    Keyboard.dismiss();
  };

  /**
   * Causal event-linked chronological interleaving:
   * Match events form the chronological backbone. Each comment is anchored to the event
   * that was present when the comment was written (afterEventId).
   */
  const chronologicalFeed = useMemo(() => {
    const items: FeedItem[] = [];

    // Pre-match comments (before any events occurred)
    for (const c of comments) {
      if (!c.afterEventId) {
        items.push({ kind: 'comment', data: c });
      }
    }

    // Interleave events with their causal comments
    for (const e of events) {
      items.push({ kind: 'event', data: e });
      const anchoredComments = comments.filter((c) => c.afterEventId === e.id);
      for (const c of anchoredComments) {
        items.push({ kind: 'comment', data: c });
      }
    }

    return items;
  }, [events, comments]);

  const feedItems = useMemo(() => {
    if (isAscending) {
      return chronologicalFeed;
    }
    return [...chronologicalFeed].reverse();
  }, [chronologicalFeed, isAscending]);

  return (
    <View
      className={`rounded-2xl border border-white/10 bg-slate-900/60 p-3.5 backdrop-blur-md shadow-lg ${
        isFullHeight ? 'flex-1' : 'h-72'
      }`}
    >
      {/* Header Bar */}
      <View className="flex-row items-center justify-between border-b border-white/10 pb-2.5">
        <View className="flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-emerald-400" />
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Timeline & Chat
          </Text>
          {feedItems.length > 0 ? (
            <View className="rounded-full bg-white/10 px-2 py-0.5">
              <Text className="font-mono text-[10px] font-bold text-slate-300">
                {feedItems.length}
              </Text>
            </View>
          ) : null}
        </View>

        {feedItems.length > 1 ? (
          <ScalePressable
            onPress={() => setIsAscending((p) => !p)}
            activeScale={0.92}
            hapticFeedback="selection"
            accessibilityRole="button"
            accessibilityLabel={`Sort feed: currently ${isAscending ? "1' to 90'" : 'Latest First'}`}
            accessibilityHint="Toggles feed sort order"
          >
            <View className="flex-row items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 active:bg-white/10">
              <ArrowDownUp color="#94a3b8" size={11} />
              <Text className="text-[10px] font-bold text-slate-300">
                {isAscending ? "1' → 90'" : 'Latest First'}
              </Text>
            </View>
          </ScalePressable>
        ) : null}
      </View>

      {/* Internal Scrollable Message Feed */}
      {feedItems.length === 0 ? (
        <View className="flex-1 items-center justify-center p-4">
          <View className="h-10 w-10 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-950/50">
            <Radio color="#34d399" size={18} />
          </View>
          <Text className="mt-2 text-xs font-bold text-white">Live Feed Ready</Text>
          <Text className="mt-0.5 text-center text-[11px] text-slate-400">
            Goals, saves, and player comments will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 pt-2"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-2 pb-2"
        >
          {feedItems.map((item) => {
            if (item.kind === 'event') {
              const e = item.data;
              const cfg = eventConfig(e.type, e.side);
              const Icon = cfg.icon;
              const player = e.playerId ? nameOf(e.playerId) : null;
              const assist = e.assistPlayerId ? nameOf(e.assistPlayerId) : null;
              const sideStripeClass =
                e.side === 'HOME'
                  ? 'border-l-4 border-l-orange-500'
                  : e.side === 'AWAY'
                    ? 'border-l-4 border-l-blue-500'
                    : '';

              return (
                <Animated.View
                  key={e.id}
                  entering={FadeInUp.duration(220)}
                  layout={LinearTransition.duration(200)}
                  className={`flex-row items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 ${sideStripeClass}`}
                >
                  <View className="flex-1 flex-row items-center gap-2 pr-2">
                    <View className="rounded bg-white/10 px-1.5 py-0.5">
                      <Text className="font-mono text-[10px] font-bold text-slate-200">
                        {formatMinute(e)}
                      </Text>
                    </View>
                    <Icon color={cfg.iconColor} size={14} />
                    <Text className="flex-1 text-xs text-white" numberOfLines={1}>
                      {player ? (
                        <>
                          <Text className="font-bold text-white">{player}</Text>
                          <Text className={`font-semibold ${cfg.tagColor}`}> ({cfg.label})</Text>
                        </>
                      ) : (
                        <Text className="font-bold text-white">{cfg.label}</Text>
                      )}
                      {assist ? (
                        <Text className="text-[11px] text-slate-400"> · Ast: {assist}</Text>
                      ) : null}
                    </Text>
                  </View>
                </Animated.View>
              );
            }

            // User / Player Comment Row
            const c = item.data;
            return (
              <Animated.View
                key={c.id}
                entering={FadeInUp.duration(220)}
                layout={LinearTransition.duration(200)}
                className="flex-row items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2"
              >
                <View className="flex-1 flex-row items-center gap-2 pr-2">
                  <View className="rounded bg-white/5 px-1.5 py-0.5">
                    <Text className="font-mono text-[10px] text-slate-400">{c.minute ?? '·'}</Text>
                  </View>
                  <MessageSquare color="#94a3b8" size={13} />
                  <Text className="flex-1 text-xs text-slate-300" numberOfLines={1}>
                    <Text className="font-semibold text-slate-100">{c.author}: </Text>
                    {c.text}
                  </Text>
                </View>
                <Text className="font-mono text-[9px] text-slate-400">{c.time}</Text>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      {/* Message Comment Input */}
      <View className="flex-row items-center gap-2 border-t border-white/10 pt-2">
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Add a match note or comment..."
          placeholderTextColor="#64748b"
          accessibilityLabel="Match comment input"
          accessibilityHint="Types a comment to add to the match feed"
          className="flex-1 rounded-xl border border-white/15 bg-slate-900/90 px-3 py-1.5 text-xs text-white"
          onSubmitEditing={handleSendComment}
          returnKeyType="send"
        />
        <ScalePressable
          onPress={handleSendComment}
          disabled={!inputText.trim()}
          activeScale={0.92}
          hapticFeedback="light"
          accessibilityRole="button"
          accessibilityLabel="Send comment"
          accessibilityHint="Posts your comment to the match feed"
        >
          <View
            className={`h-8 w-8 items-center justify-center rounded-xl ${
              inputText.trim() ? 'bg-emerald-500 active:bg-emerald-600' : 'bg-slate-800 opacity-50'
            }`}
          >
            <Send color="#ffffff" size={14} />
          </View>
        </ScalePressable>
      </View>
    </View>
  );
}
