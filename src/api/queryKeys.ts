export const meKeys = {
  me: ['me'] as const,
};

export const teamKeys = {
  owned: (query: string) => ['teams', 'owned', query] as const,
  opponents: (query: string) => ['teams', 'opponents', query] as const,
  detail: (id: string) => ['teams', 'detail', id] as const,
};

export const metaKeys = {
  formats: ['meta', 'formats'] as const,
  formations: (playersPerSide: number) => ['meta', 'formations', playersPerSide] as const,
};

export const matchKeys = {
  detail: (id: string) => ['matches', 'detail', id] as const,
};
