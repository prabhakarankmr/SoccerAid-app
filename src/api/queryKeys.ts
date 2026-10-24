export const meKeys = {
  me: ['me'] as const,
};

export const teamKeys = {
  owned: (query: string) => ['teams', 'owned', query] as const,
  opponents: (query: string) => ['teams', 'opponents', query] as const,
  detail: (id: string) => ['teams', 'detail', id] as const,
};
