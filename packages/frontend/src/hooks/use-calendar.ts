import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useGardenContext } from '@/contexts/garden-context';
import type { ApiResponse } from '@gardenvault/shared';

export interface CalendarEvent {
  id: string;
  date: string;
  type: 'indoor_start' | 'direct_sow' | 'transplant' | 'harvest' | 'task' | 'frost' | 'planted' | 'germinated' | 'transplanted' | 'harvested' | 'finished';
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  plant_name: string | null;
  priority: string | null;
}

export interface PlantingSuggestion {
  plant_catalog_id: string;
  common_name: string;
  plant_type: string;
  action: 'indoor_start' | 'direct_sow' | 'transplant';
  suggested_date: string;
  reason: string;
}

export function useCalendarEvents(month: number, year: number) {
  const { currentGardenId } = useGardenContext();
  return useQuery({
    queryKey: ['calendar', currentGardenId, year, month],
    queryFn: () =>
      api.get<ApiResponse<CalendarEvent[]>>(
        `/calendar?garden_id=${currentGardenId}&month=${month}&year=${year}`,
      ),
    enabled: !!currentGardenId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCalendarWeek() {
  const { currentGardenId } = useGardenContext();
  return useQuery({
    queryKey: ['calendar', 'week', currentGardenId],
    queryFn: () =>
      api.get<ApiResponse<CalendarEvent[]>>(
        `/calendar/week?garden_id=${currentGardenId}`,
      ),
    enabled: !!currentGardenId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlantingSuggestions() {
  const { currentGardenId } = useGardenContext();
  return useQuery({
    queryKey: ['calendar', 'suggestions', currentGardenId],
    queryFn: () =>
      api.get<ApiResponse<PlantingSuggestion[]>>(
        `/calendar/suggestions?garden_id=${currentGardenId}`,
      ),
    enabled: !!currentGardenId,
    staleTime: 30 * 60 * 1000,
  });
}
