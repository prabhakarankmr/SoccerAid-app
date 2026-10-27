// Mirrors tailwind.config.js / the default Tailwind palette — used wherever a
// literal color or coordinate is required instead of a `className` (react-native-svg
// fills, expo-linear-gradient stops, dynamic pitch positions). See FRONTEND_INSTRUCTIONS.md §4.

export const radius = 8; // px — shadcn --radius: 0.5rem

export const screenGradient = {
  from: '#f0fdf4', // green-50
  to: '#d1fae5', // emerald-100
} as const;

export const pitchGradient = {
  from: '#4ade80', // green-400
  mid: '#22c55e', // green-500
  to: '#4ade80', // green-400
} as const;

// Team A = home (right half of the pitch), Team B = away (left half). Colors per the
// authoritative reference screenshots (2026-10-27, superseding an earlier single mockup that
// had Team A blue/Team B green) — Team A orange, Team B blue; nothing used these before this
// pitch component, so no migration concern either time.
export const teamA = {
  fill: '#f97316', // orange-500
  border: '#ea580c', // orange-600
  chipBg: '#ffedd5', // orange-100
  chipText: '#9a3412', // orange-800
  emptySlotBorder: '#fb923c', // orange-400
  emptySlotBg: '#ffedd5', // orange-100
} as const;

export const teamB = {
  fill: '#2563eb', // blue-600
  border: '#1d4ed8', // blue-700
  chipBg: '#dbeafe', // blue-100
  chipText: '#1e40af', // blue-800
  emptySlotBorder: '#60a5fa', // blue-400
  emptySlotBg: '#dbeafe', // blue-100
} as const;

// Neutral, not team-colored — orange is now Team A's color, so the GK marker needs to read as
// "goalkeeper" regardless of which side it's on, not clash with Team A's own tokens.
export const goalkeeper = {
  fill: '#4b5563', // gray-600
  border: '#374151', // gray-700
} as const;

export const possession = {
  ring: '#facc15', // yellow-400
  pillBg: '#facc15', // yellow-400
  pillText: '#000000',
} as const;
