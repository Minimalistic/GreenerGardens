import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse } from '@gardenvault/shared';

export interface SettingsData {
  garden_id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  usda_zone: string | null;
  timezone: string | null;
  last_frost_date: string | null;
  first_frost_date: string | null;
  total_area_sqft: number | null;
  settings: {
    temperature_unit: 'fahrenheit' | 'celsius';
    measurement_unit: 'imperial' | 'metric';
    date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  };
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<ApiResponse<SettingsData | null>>('/settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      api.patch<ApiResponse<any>>('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['gardens'] });
      queryClient.invalidateQueries({ queryKey: ['garden'] });
    },
  });
}
