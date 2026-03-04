import { useMemo } from 'react';
import { usePlantCatalogSearch } from '@/hooks/use-plant-catalog';
import type { PaginatedResponse, PlantCatalog } from '@gardenvault/shared';

/**
 * Shared hook that builds a plant name → catalog ID lookup function.
 * Used by plant-detail and pest-catalog-detail pages for cross-linking.
 *
 * @param fuzzy - If true, falls back to substring matching. Defaults to false (exact match only).
 */
export function usePlantNameToId(fuzzy = false) {
  const { data: catalogData } = usePlantCatalogSearch({ limit: 500 });
  const catalogEntries = catalogData?.data ?? [];

  return useMemo(() => {
    const exact = new Map<string, string>();
    for (const entry of catalogEntries) {
      exact.set(entry.common_name.toLowerCase(), entry.id);
    }
    return (name: string): string | undefined => {
      const lower = name.toLowerCase();
      if (exact.has(lower)) return exact.get(lower);
      if (fuzzy) {
        for (const entry of catalogEntries) {
          const entryName = entry.common_name.toLowerCase();
          if (entryName.includes(lower) || lower.includes(entryName)) {
            return entry.id;
          }
        }
      }
      return undefined;
    };
  }, [catalogEntries, fuzzy]);
}
