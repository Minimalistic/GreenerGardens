import { v4 as uuid } from 'uuid';
import type { WikipediaCacheRepository } from '../db/repositories/wikipedia-cache.repository.js';
import type { PlantCatalogRepository } from '../db/repositories/plant-catalog.repository.js';

const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface WikipediaSummaryResponse {
  extract: string;
  extract_html: string;
  thumbnail?: { source: string };
  description?: string;
}

export class WikipediaService {
  constructor(
    private cacheRepo: WikipediaCacheRepository,
    private catalogRepo: PlantCatalogRepository,
  ) {}

  async getSummary(plantCatalogId: string) {
    // Check cache
    const cached = this.cacheRepo.findByPlantCatalogId(plantCatalogId);
    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < CACHE_MAX_AGE_MS) {
        return { data: cached, cached: true };
      }
    }

    // Get plant to derive Wikipedia title
    const plant = this.catalogRepo.findById(plantCatalogId);
    if (!plant) {
      return { data: null, cached: false };
    }

    const title = this.deriveTitle(plant.wikipedia_url, plant.common_name);
    if (!title) {
      return { data: null, cached: false };
    }

    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'GreenerGardens/1.0 (garden planning app)',
        },
      });

      if (!res.ok) throw new Error(`Wikipedia API returned ${res.status}`);

      const raw: WikipediaSummaryResponse = await res.json();

      const row = {
        id: cached?.id ?? uuid(),
        plant_catalog_id: plantCatalogId,
        extract: raw.extract ?? null,
        extract_html: raw.extract_html ?? null,
        thumbnail_url: raw.thumbnail?.source ?? null,
        description: raw.description ?? null,
        fetched_at: new Date().toISOString(),
      };

      let saved;
      if (cached) {
        saved = this.cacheRepo.update(cached.id, row);
      } else {
        saved = this.cacheRepo.insert(row);
      }

      return { data: saved, cached: false };
    } catch {
      // On error, return stale cache if available
      if (cached) {
        return { data: cached, cached: true };
      }
      return { data: null, cached: false };
    }
  }

  private deriveTitle(wikipediaUrl: string | null, commonName: string): string | null {
    if (wikipediaUrl) {
      const match = wikipediaUrl.match(/\/wiki\/(.+)$/);
      if (match) return decodeURIComponent(match[1]);
    }
    return commonName.replace(/ /g, '_');
  }
}
