import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { metaKeys } from '../api/queryKeys';

export interface Format {
  playersPerSide: number;
  label: string;
}

export interface FormationSlot {
  slotIndex: number;
  isGoalkeeper: boolean;
  posX: number;
  posY: number;
}

export interface Formation {
  name: string;
  playersPerSide: number;
  slots: FormationSlot[];
}

// Static reference data generated server-side (not DB-backed) — safe to treat as permanently
// fresh, no reason to ever refetch within a session.
export function useFormats() {
  return useQuery({
    queryKey: metaKeys.formats,
    queryFn: () => apiClient.get<Format[]>('/meta/formats'),
    staleTime: Infinity,
  });
}

export function useFormations(playersPerSide: number | undefined) {
  return useQuery({
    queryKey: metaKeys.formations(playersPerSide ?? 0),
    queryFn: () =>
      apiClient.get<Formation[]>(`/meta/formations?playersPerSide=${String(playersPerSide)}`),
    enabled: Boolean(playersPerSide),
    staleTime: Infinity,
  });
}

// Shared by match/[id]/lineup.tsx (editable) and match/[id]/live.tsx (read-only) — both need
// the chosen formation's slot geometry, just sourced from different player-assignment state.
export function slotsFor(
  formations: Formation[] | undefined,
  formationName: string | undefined,
): FormationSlot[] {
  return formations?.find((formation) => formation.name === formationName)?.slots ?? [];
}
