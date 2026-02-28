import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Garden } from '@gardenvault/shared';

interface GardenContextValue {
  currentGardenId: string | null;
  setCurrentGardenId: (id: string) => void;
  garden: Garden | null;
  isLoading: boolean;
}

const GardenContext = createContext<GardenContextValue | null>(null);

function getStoredGardenId(): string | null {
  try {
    return localStorage.getItem('gardenvault_current_garden');
  } catch {
    return null;
  }
}

export function GardenProvider({ children }: { children: ReactNode }) {
  const [currentGardenId, setGardenId] = useState<string | null>(getStoredGardenId);

  const setCurrentGardenId = useCallback((id: string) => {
    setGardenId(id);
    localStorage.setItem('gardenvault_current_garden', id);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['garden', currentGardenId],
    queryFn: () => api.get<ApiResponse<Garden>>(`/gardens/${currentGardenId}`),
    enabled: !!currentGardenId,
  });

  return (
    <GardenContext.Provider
      value={{
        currentGardenId,
        setCurrentGardenId,
        garden: data?.data ?? null,
        isLoading,
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
