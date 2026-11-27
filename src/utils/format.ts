import type { MatchEvent } from '../hooks/useMatches';

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatEventMinute(e: MatchEvent, halfDurationSec: number): string {
  if (e.type === 'HALF_TIME') return 'HT';
  if (e.type === 'FULL_TIME') return 'FT';
  if (e.type === 'ADD_TIME') return `+${Math.round((e.addedSeconds ?? 0) / 60)}'`;
  const half = Math.max(1, Math.round(halfDurationSec / 60));
  const m = Math.max(1, Math.ceil(e.matchClockSec / 60));
  if (e.period === 'FIRST_HALF') return m > half ? `${half}+${m - half}'` : `${m}'`;
  if (e.period === 'SECOND_HALF') return m > half ? `${2 * half}+${m - half}'` : `${half + m}'`;
  return `${m}'`;
}

export function ordinal(date: Date): string {
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
          ? 'rd'
          : 'th';
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${day}${suffix} ${month} ${date.getFullYear()}`;
}
