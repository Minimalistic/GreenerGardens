import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { ApiResponse, Garden } from '@gardenvault/shared';

interface GardenContextValue {
  currentGardenId: string | null;
  setCurrentGardenId: (id: string) => void;
  clearCurrentGardenId: () => void;
  garden: Garden | null;
  isLoading: boolean;
}

const GardenContext = createContext<GardenContextValue | null>(null);

function getStoredGardenId(): string | null {
  try {
    const id = localStorage.getItem('gardenvault_current_garden');
    // Validate stored value is a non-empty string
    return id && id.trim().length > 0 ? id : null;
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

  const clearCurrentGardenId = useCallback(() => {
    setGardenId(null);
    localStorage.removeItem('gardenvault_current_garden');
  }, []);

  // Fetch gardens list for fallback
  const { data: gardensData } = useQuery({
    queryKey: ['gardens'],
    queryFn: () => api.get<ApiResponse<Garden[]>>('/gardens'),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['garden', currentGardenId],
    queryFn: () => api.get<ApiResponse<Garden>>(`/gardens/${currentGardenId}`),
    enabled: !!currentGardenId,
    retry: (failureCount, err) => {
      // Don't retry 404s — the garden was deleted
      if (err instanceof ApiError && err.status === 404) return false;
      return failureCount < 3;
    },
  });

  // If stored garden 404s, clear and fall back to first available garden
  useEffect(() => {
    if (error instanceof ApiError && error.status === 404 && currentGardenId) {
      clearCurrentGardenId();
      const gardens = gardensData?.data ?? [];
      if (gardens.length > 0) {
        setCurrentGardenId(gardens[0].id);
      }
    }
  }, [error, currentGardenId, gardensData, clearCurrentGardenId, setCurrentGardenId]);

  const garden = data?.data ?? null;

  const value = useMemo(() => ({
    currentGardenId,
    setCurrentGardenId,
    clearCurrentGardenId,
    garden,
    isLoading,
  }), [currentGardenId, setCurrentGardenId, clearCurrentGardenId, garden, isLoading]);

  return (
    <GardenContext.Provider value={value}>
      {children}
    </GardenContext.Provider>
  );
}

export function useGardenContext() {
  const ctx = useContext(GardenContext);
  if (!ctx) throw new Error('useGardenContext must be used within GardenProvider');
  return ctx;
}
