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

export const teamA = {
  fill: '#059669', // emerald-600
  border: '#047857', // emerald-700
  chipBg: '#d1fae5', // emerald-100
  chipText: '#065f46', // emerald-800
  emptySlotBorder: '#34d399', // emerald-400
  emptySlotBg: '#d1fae5', // emerald-100
} as const;

export const teamB = {
  fill: '#2563eb', // blue-600
  border: '#1d4ed8', // blue-700
  chipBg: '#dbeafe', // blue-100
  chipText: '#1e40af', // blue-800
  emptySlotBorder: '#60a5fa', // blue-400
  emptySlotBg: '#dbeafe', // blue-100
} as const;

export const goalkeeper = {
  fill: '#f97316', // orange-500
  border: '#ea580c', // orange-600
} as const;

export const possession = {
  ring: '#facc15', // yellow-400
  pillBg: '#facc15', // yellow-400
  pillText: '#000000',
} as const;
