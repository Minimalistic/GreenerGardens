import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface WikipediaSummary {
  id: string;
  plant_catalog_id: string;
  extract: string | null;
  extract_html: string | null;
  thumbnail_url: string | null;
  description: string | null;
  fetched_at: string;
}

interface WikipediaResponse {
  success: boolean;
  data: WikipediaSummary | null;
  cached: boolean;
}

export function useWikipediaSummary(plantId: string | null) {
  return useQuery({
    queryKey: ['plant-catalog', plantId, 'wikipedia'],
    queryFn: () => api.get<WikipediaResponse>(`/plant-catalog/${plantId}/wikipedia`),
    enabled: !!plantId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
