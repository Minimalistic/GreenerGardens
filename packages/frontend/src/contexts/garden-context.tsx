import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Garden } from '@gardenvault/shared';

interface GardenContextValue {
  currentGardenId: string | null;
  garden: Garden | null;
  isLoading: boolean;
}

const GardenContext = createContext<GardenContextValue | null>(null);

export function GardenProvider({ children }: { children: ReactNode }) {
  // Fetch all gardens — we expect exactly one (created by setup wizard)
  const { data: gardensData, isLoading: gardensLoading } = useQuery({
    queryKey: ['gardens'],
    queryFn: () => api.get<ApiResponse<Garden[]>>('/gardens'),
  });

  const gardens = gardensData?.data ?? [];
  // Prefer the most recently created garden (last in the array by created_at)
  // to handle cases where multiple gardens exist
  const garden = gardens.length > 0
    ? gardens.reduce((best, g) => (g.created_at > best.created_at ? g : best), gardens[0])
    : null;
  const currentGardenId = garden?.id ?? null;

  return (
    <GardenContext.Provider
      value={{
        currentGardenId,
        garden,
        isLoading: gardensLoading,
      }}
    >
      {children}
    </GardenContext.Provider>
  );
}

export function useGardenContext() {
  const ctx = useContext(GardenContext);
  if (!ctx) throw new Error('useGardenContext must be used within GardenProvider');
  return ctx;
}
