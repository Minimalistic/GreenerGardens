import type { PlantCatalogRepository, PlantCatalogRow } from '../db/repositories/plant-catalog.repository.js';

export class PlantCatalogService {
  constructor(private catalogRepo: PlantCatalogRepository) {}

  search(params: {
    search?: string;
    plant_type?: string;
    lifecycle?: string;
    sun_exposure?: string;
    water_needs?: string;
    min_zone?: number;
    max_zone?: number;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const { data, total } = this.catalogRepo.search({
      ...params,
      limit,
      offset,
    });

    return {
      data: data.map(row => this.deserialize(row)),
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  findById(id: string) {
    const row = this.catalogRepo.findById(id);
    if (!row) return null;
    return this.deserialize(row);
  }

  private deserialize(row: PlantCatalogRow) {
    return {
      ...row,
      companions: JSON.parse(row.companions_json || '[]'),
      antagonists: JSON.parse(row.antagonists_json || '[]'),
      growing_tips: JSON.parse(row.growing_tips_json || '[]'),
    };
  }
}
