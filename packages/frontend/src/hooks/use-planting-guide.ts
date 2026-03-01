import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface PlantingGuideEntry {
  plant_id: string;
  common_name: string;
  action: string;
  days_remaining: number;
  window_start: string;
  window_end: string;
}

interface PlantingGuide {
  date: string;
  garden_id: string;
  last_frost_date: string | null;
  first_frost_date: string | null;
  start_indoors: PlantingGuideEntry[];
  direct_sow: PlantingGuideEntry[];
  transplant: PlantingGuideEntry[];
  coming_up: PlantingGuideEntry[];
}

export function usePlantingGuide(gardenId: string | null, date?: string) {
  const params = new URLSearchParams();
  if (gardenId) params.set('garden_id', gardenId);
  if (date) params.set('date', date);
  return useQuery({
    queryKey: ['planting-guide', gardenId, date],
    queryFn: () => api.get<{ data: PlantingGuide }>(`/planting-guide?${params.toString()}`),
    enabled: !!gardenId,
  });
}
