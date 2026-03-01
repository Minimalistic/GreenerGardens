import type Database from 'better-sqlite3';
import type { PlantCatalogRepository } from '../db/repositories/plant-catalog.repository.js';
import { NotFoundError } from '../utils/errors.js';

interface CompanionCheck {
  plant: string;
  companion: string;
  relationship: 'good' | 'bad';
}

interface CompatibilityReport {
  plant_id: string;
  plant_name: string;
  companions: CompanionCheck[];
  warnings: CompanionCheck[];
  score: number; // 0-100
}

export class CompanionService {
  constructor(
    private db: Database.Database,
    private catalogRepo: PlantCatalogRepository,
  ) {}

  getCompanions(plantCatalogId: string) {
    const plant = this.catalogRepo.findById(plantCatalogId);
    if (!plant) throw new NotFoundError('PlantCatalog', plantCatalogId);

    const companions: string[] = plant.companions_json ? JSON.parse(plant.companions_json) : [];
    const antagonists: string[] = plant.antagonists_json ? JSON.parse(plant.antagonists_json) : [];

    return {
      plant_id: plant.id,
      plant_name: plant.common_name,
      good_companions: companions,
      bad_companions: antagonists,
    };
  }

  checkCompatibility(plantCatalogId: string, neighborPlantCatalogIds: string[]): CompatibilityReport {
    const plant = this.catalogRepo.findById(plantCatalogId);
    if (!plant) throw new NotFoundError('PlantCatalog', plantCatalogId);

    const companions: string[] = plant.companions_json ? JSON.parse(plant.companions_json) : [];
    const antagonists: string[] = plant.antagonists_json ? JSON.parse(plant.antagonists_json) : [];

    const checks: CompanionCheck[] = [];
    const warnings: CompanionCheck[] = [];

    for (const neighborId of neighborPlantCatalogIds) {
      const neighbor = this.catalogRepo.findById(neighborId);
      if (!neighbor) continue;

      const isGood = companions.some(c => c.toLowerCase() === neighbor.common_name.toLowerCase());
      const isBad = antagonists.some(a => a.toLowerCase() === neighbor.common_name.toLowerCase());

      if (isGood) {
        checks.push({ plant: plant.common_name, companion: neighbor.common_name, relationship: 'good' });
      }
      if (isBad) {
        const warning = { plant: plant.common_name, companion: neighbor.common_name, relationship: 'bad' as const };
        checks.push(warning);
        warnings.push(warning);
      }
    }

    // Score: start at 100, deduct 25 per bad companion, add 5 per good (capped at 100)
    const goodCount = checks.filter(c => c.relationship === 'good').length;
    const badCount = warnings.length;
    const score = Math.max(0, Math.min(100, 100 - (badCount * 25) + (goodCount * 5)));

    return {
      plant_id: plant.id,
      plant_name: plant.common_name,
      companions: checks,
      warnings,
      score,
    };
  }

  suggestCompanions(plantCatalogId: string, plotId: string) {
    const plant = this.catalogRepo.findById(plantCatalogId);
    if (!plant) throw new NotFoundError('PlantCatalog', plantCatalogId);

    const companions: string[] = plant.companions_json ? JSON.parse(plant.companions_json) : [];
    const antagonists: string[] = plant.antagonists_json ? JSON.parse(plant.antagonists_json) : [];

    // Find what's already planted in this plot
    const existingPlants = this.db.prepare(`
      SELECT DISTINCT pc.common_name, pc.id
      FROM plant_instances pi
      JOIN sub_plots sp ON pi.sub_plot_id = sp.id
      JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
      WHERE sp.plot_id = ?
      AND pi.status NOT IN ('finished', 'failed', 'removed')
    `).all(plotId) as { common_name: string; id: string }[];

    const existingNames = existingPlants.map(p => p.common_name.toLowerCase());

    // Filter companion suggestions to only those not already planted
    const suggestions = companions.filter(c => !existingNames.includes(c.toLowerCase()));
    const conflicts = antagonists.filter(a => existingNames.includes(a.toLowerCase()));

    return {
      plant_id: plant.id,
      plant_name: plant.common_name,
      suggested_companions: suggestions,
      existing_conflicts: conflicts,
      existing_good: companions.filter(c => existingNames.includes(c.toLowerCase())),
    };
  }
}
