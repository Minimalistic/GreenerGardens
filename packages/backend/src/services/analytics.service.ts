import type Database from 'better-sqlite3';

export class AnalyticsService {
  constructor(private db: Database.Database) {}

  getYieldByPlant(year?: number) {
    const yearFilter = year ? `AND strftime('%Y', h.harvest_date) = ?` : '';
    const params = year ? [String(year)] : [];
    return this.db.prepare(`
      SELECT
        pc.common_name as plant_name,
        pi.variety as variety,
        COUNT(*) as harvest_count,
        SUM(h.quantity) as total_quantity,
        h.quantity_unit,
        AVG(h.quantity) as avg_quantity
      FROM harvests h
      JOIN plant_instances pi ON h.plant_instance_id = pi.id
      JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
      WHERE 1=1 ${yearFilter}
      GROUP BY pc.common_name, pi.variety, h.quantity_unit
      ORDER BY total_quantity DESC
    `).all(...params);
  }

  getYieldByPlot(year?: number) {
    const yearFilter = year ? `AND strftime('%Y', h.harvest_date) = ?` : '';
    const params = year ? [String(year)] : [];
    return this.db.prepare(`
      SELECT
        p.name as plot_name,
        COUNT(*) as harvest_count,
        SUM(h.quantity) as total_quantity,
        h.quantity_unit
      FROM harvests h
      JOIN plant_instances pi ON h.plant_instance_id = pi.id
      JOIN plots p ON pi.plot_id = p.id
      WHERE 1=1 ${yearFilter}
      GROUP BY p.name, h.quantity_unit
      ORDER BY total_quantity DESC
    `).all(...params);
  }

  getSeasonalTimeline(year?: number) {
    const yearFilter = year ? `WHERE strftime('%Y', h.harvest_date) = ?` : '';
    const params = year ? [String(year)] : [];
    return this.db.prepare(`
      SELECT
        strftime('%Y-%m', h.harvest_date) as month,
        COUNT(*) as harvest_count,
        SUM(h.quantity) as total_quantity,
        h.quantity_unit
      FROM harvests h
      ${yearFilter}
      GROUP BY month, h.quantity_unit
      ORDER BY month ASC
    `).all(...params);
  }

  getDestinationBreakdown(year?: number) {
    const yearFilter = year ? `WHERE strftime('%Y', h.harvest_date) = ?` : '';
    const params = year ? [String(year)] : [];
    return this.db.prepare(`
      SELECT
        COALESCE(h.destination, 'unspecified') as destination,
        COUNT(*) as harvest_count,
        SUM(h.quantity) as total_quantity
      FROM harvests h
      ${yearFilter}
      GROUP BY COALESCE(h.destination, 'unspecified')
      ORDER BY total_quantity DESC
    `).all(...params);
  }

  getYearOverYear() {
    return this.db.prepare(`
      SELECT
        strftime('%Y', h.harvest_date) as year,
        COUNT(*) as harvest_count,
        SUM(h.quantity) as total_quantity
      FROM harvests h
      GROUP BY year
      ORDER BY year ASC
    `).all();
  }
}
