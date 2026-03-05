import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Garden } from '@gardenvault/shared';

interface GardenContextValue {
  currentGardenId: string | null;
  garden: Garden | null;
  isLoading: boolean;
}

const GardenContext = createContext<GardenContextValue | null>(null);

export function GardenProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Fetch all gardens — we expect exactly one
  const { data: gardensData, isLoading: gardensLoading } = useQuery({
    queryKey: ['gardens'],
    queryFn: () => api.get<ApiResponse<Garden[]>>('/gardens'),
  });

  const gardens = gardensData?.data ?? [];
  const garden = gardens[0] ?? null;
  const currentGardenId = garden?.id ?? null;

  // Auto-create a garden if none exists
  const createGarden = useMutation({
    mutationFn: () => api.post<ApiResponse<Garden>>('/gardens', { name: 'My Garden' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gardens'] });
    },
  });

  useEffect(() => {
    if (!gardensLoading && gardens.length === 0 && !createGarden.isPending) {
      createGarden.mutate();
    }
  }, [gardensLoading, gardens.length, createGarden]);

  return (
    <GardenContext.Provider
      value={{
        currentGardenId,
        garden,
        isLoading: gardensLoading || createGarden.isPending,
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
