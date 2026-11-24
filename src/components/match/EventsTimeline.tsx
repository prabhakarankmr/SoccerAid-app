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
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { MatchEvent, Side } from '../../hooks/useMatches';

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
  homeTeamName,
  awayTeamName,
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
    const latestEvent = events.length > 0 ? events[events.length - 1] : null;
    const afterEventId = latestEvent ? latestEvent.id : null;

    setComments((prev) => [
      ...prev,
      {
        id: `cmt-${Date.now()}-${prev.length}`,
        author: currentUserName,
        text,
        time,
        minute,
        timestamp: Date.now(),
        afterEventId,
      },
    ]);
    setInputText('');
    Keyboard.dismiss();
  };

  const feedItems = useMemo(() => {
    const merged: FeedItem[] = [];
    for (const c of comments) {
      if (!c.afterEventId) merged.push({ kind: 'comment', data: c });
    }
    for (const e of events) {
      merged.push({ kind: 'event', data: e });
      for (const c of comments) {
        if (c.afterEventId === e.id) merged.push({ kind: 'comment', data: c });
      }
    }
    const placedIds = new Set(merged.map((m) => m.data.id));
    for (const c of comments) {
      if (!placedIds.has(c.id)) merged.push({ kind: 'comment', data: c });
    }
    return isAscending ? merged : [...merged].reverse();
  }, [events, comments, isAscending]);

  return (
    <View
      style={{ shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 }}
      className={`rounded-3xl border border-white/15 bg-slate-950/85 p-3.5 backdrop-blur-md ${isFullHeight ? 'flex-1' : 'h-72'}`}
    >
      {/* Header Bar */}
      <View className="flex-row items-center justify-between border-b border-white/10 pb-2.5">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-black uppercase tracking-wider text-white">
            Match Commentary
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
          <Pressable
            onPress={() => setIsAscending((p) => !p)}
            accessibilityRole="button"
            accessibilityLabel={`Sort feed: currently ${isAscending ? "1' to 90'" : 'Latest First'}`}
            accessibilityHint="Toggles feed sort order"
            className="flex-row items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 active:bg-white/10"
          >
            <ArrowDownUp color="#94a3b8" size={11} />
            <Text className="text-[10px] font-bold text-slate-300">
              {isAscending ? "1' → 90'" : 'Latest First'}
            </Text>
          </Pressable>
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
              const team =
                e.side === 'HOME' ? homeTeamName : e.side === 'AWAY' ? awayTeamName : null;

              return (
                <View
                  key={e.id}
                  className="flex-row items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2"
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
                  {team ? (
                    <View
                      className={`rounded-full px-2 py-0.5 border ${e.side === 'HOME' ? 'border-orange-500/30 bg-orange-950/20' : 'border-blue-500/30 bg-blue-950/20'}`}
                    >
                      <Text
                        className={`text-[9px] font-bold uppercase ${e.side === 'HOME' ? 'text-orange-400' : 'text-blue-400'}`}
                        numberOfLines={1}
                      >
                        {team}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            }

            // User / Player Comment Row (Same harmonious card style, cleanly distinguishable by icon & content)
            const c = item.data;
            return (
              <View
                key={c.id}
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
              </View>
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
        <Pressable
          onPress={handleSendComment}
          disabled={!inputText.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send comment"
          accessibilityHint="Posts your comment to the match feed"
          className={`h-7 w-7 items-center justify-center rounded-lg ${inputText.trim() ? 'bg-emerald-500 active:bg-emerald-600' : 'bg-slate-800'}`}
        >
          <Send color={inputText.trim() ? '#ffffff' : '#64748b'} size={12} />
        </Pressable>
      </View>
    </View>
  );
}
