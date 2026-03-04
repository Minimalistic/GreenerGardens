import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface SearchResult {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
  match_field: string;
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.search.query(query),
    queryFn: () => api.get<{ data: SearchResult[] }>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 2,
  });
}
