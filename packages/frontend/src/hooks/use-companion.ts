import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface CompanionCheck {
  plant: string;
  companion: string;
  relationship: 'good' | 'bad';
}

interface CompatibilityReport {
  plant_id: string;
  plant_name: string;
  companions: CompanionCheck[];
  warnings: CompanionCheck[];
  score: number;
}

interface CompanionSuggestion {
  plant_id: string;
  plant_name: string;
  suggested_companions: string[];
  existing_conflicts: string[];
  existing_good: string[];
}

export function useCompanionCheck(plantId: string | null, neighborIds: string[]) {
  const neighbors = neighborIds.join(',');
  return useQuery({
    queryKey: queryKeys.companion.check(plantId!, neighbors),
    queryFn: () => api.get<{ data: CompatibilityReport }>(`/companion/check?plant=${plantId}&neighbors=${neighbors}`),
    enabled: !!plantId && neighborIds.length > 0,
  });
}

export function useCompanionSuggestions(plantId: string | null, plotId: string | null) {
  return useQuery({
    queryKey: queryKeys.companion.suggestions(plantId!, plotId!),
    queryFn: () => api.get<{ data: CompanionSuggestion }>(`/companion/suggestions?plant=${plantId}&plot=${plotId}`),
    enabled: !!plantId && !!plotId,
  });
}
