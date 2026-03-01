import type Database from 'better-sqlite3';
import type { PlantCatalogRepository } from '../db/repositories/plant-catalog.repository.js';
import { NotFoundError } from '../utils/errors.js';

interface RotationCheck {
  status: 'ok' | 'warning' | 'violation';
  message: string;
  last_planted_year: number | null;
  years_since: number | null;
  rotation_family: string;
}

interface PlotRotationHistory {
  year: number;
  families: string[];
  plants: { name: string; family: string }[];
}

export class RotationService {
  constructor(
    private db: Database.Database,
    private catalogRepo: PlantCatalogRepository,
  ) {}

  checkRotation(plotId: string, plantCatalogId: string): RotationCheck {
    const plant = this.catalogRepo.findById(plantCatalogId);
    if (!plant) throw new NotFoundError('PlantCatalog', plantCatalogId);

    const rotationFamily = plant.rotation_family;
    if (!rotationFamily) {
      return {
        status: 'ok',
        message: 'No rotation family defined for this plant.',
        last_planted_year: null,
        years_since: null,
        rotation_family: 'unknown',
      };
    }

    const currentYear = new Date().getFullYear();

    // Find the most recent year this family was planted in this plot
    const row = this.db.prepare(`
      SELECT MAX(CAST(strftime('%Y', pi.date_planted) AS INTEGER)) as last_year
      FROM plant_instances pi
      JOIN sub_plots sp ON pi.sub_plot_id = sp.id
      JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
      WHERE sp.plot_id = ?
      AND pc.rotation_family = ?
      AND pi.date_planted IS NOT NULL
    `).get(plotId, rotationFamily) as { last_year: number | null } | undefined;

    const lastYear = row?.last_year;
    if (!lastYear) {
      return {
        status: 'ok',
        message: `No ${rotationFamily} plants have been grown in this plot before.`,
        last_planted_year: null,
        years_since: null,
        rotation_family: rotationFamily,
      };
    }

    const yearsSince = currentYear - lastYear;

    if (yearsSince >= 3) {
      return {
        status: 'ok',
        message: `${rotationFamily} was last planted here ${yearsSince} years ago. Safe to plant.`,
        last_planted_year: lastYear,
        years_since: yearsSince,
        rotation_family: rotationFamily,
      };
    } else if (yearsSince >= 2) {
      return {
        status: 'warning',
        message: `${rotationFamily} was planted here ${yearsSince} years ago. Consider waiting 1 more year.`,
        last_planted_year: lastYear,
        years_since: yearsSince,
        rotation_family: rotationFamily,
      };
    } else {
      return {
        status: 'violation',
        message: yearsSince === 0
          ? `${rotationFamily} is planted in this plot this year. Avoid planting the same family.`
          : `${rotationFamily} was planted here last year. Wait at least 2 more years.`,
        last_planted_year: lastYear,
        years_since: yearsSince,
        rotation_family: rotationFamily,
      };
    }
  }

  getPlotHistory(plotId: string, years = 5): PlotRotationHistory[] {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - years + 1;

    const rows = this.db.prepare(`
      SELECT
        CAST(strftime('%Y', pi.date_planted) AS INTEGER) as year,
        pc.common_name as name,
        pc.rotation_family as family
      FROM plant_instances pi
      JOIN sub_plots sp ON pi.sub_plot_id = sp.id
      JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
      WHERE sp.plot_id = ?
      AND pi.date_planted IS NOT NULL
      AND CAST(strftime('%Y', pi.date_planted) AS INTEGER) >= ?
      ORDER BY year DESC
    `).all(plotId, startYear) as { year: number; name: string; family: string | null }[];

    // Group by year
    const yearMap = new Map<number, { name: string; family: string }[]>();
    for (let y = startYear; y <= currentYear; y++) {
      yearMap.set(y, []);
    }

    for (const row of rows) {
      const plants = yearMap.get(row.year) || [];
      plants.push({ name: row.name, family: row.family || 'unknown' });
      yearMap.set(row.year, plants);
    }

    return Array.from(yearMap.entries())
      .map(([year, plants]) => ({
        year,
        families: [...new Set(plants.map(p => p.family))],
        plants,
      }))
      .sort((a, b) => b.year - a.year);
  }

  suggestPlots(plantCatalogId: string, gardenId: string) {
    const plant = this.catalogRepo.findById(plantCatalogId);
    if (!plant) throw new NotFoundError('PlantCatalog', plantCatalogId);

    const rotationFamily = plant.rotation_family;

    // Get all plots for this garden
    const plots = this.db.prepare(
      'SELECT id, name FROM plots WHERE garden_id = ?'
    ).all(gardenId) as { id: string; name: string }[];

    const results = plots.map(plot => {
      const check = rotationFamily ? this.checkRotation(plot.id, plantCatalogId) : {
        status: 'ok' as const,
        message: 'No rotation family defined.',
        last_planted_year: null,
        years_since: null,
        rotation_family: 'unknown',
      };

      return {
        plot_id: plot.id,
        plot_name: plot.name,
        ...check,
      };
    });

    // Sort: ok first, then warning, then violation
    const order = { ok: 0, warning: 1, violation: 2 };
    results.sort((a, b) => order[a.status] - order[b.status]);

    return results;
  }
}
