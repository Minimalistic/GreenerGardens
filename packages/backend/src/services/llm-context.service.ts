import type Database from 'better-sqlite3';
import type { GardenRepository } from '../db/repositories/garden.repository.js';

export class LlmContextService {
  constructor(
    private db: Database.Database,
    private gardenRepo: GardenRepository,
  ) {}

  buildContext(gardenId: string): string {
    const garden = this.gardenRepo.findById(gardenId);
    if (!garden) return 'No garden data available.';

    const sections: string[] = [];
    const today = new Date().toISOString().split('T')[0];
    const month = new Date().toLocaleString('en', { month: 'long' });

    // Garden overview
    sections.push(`## Garden: ${garden.name}`);
    sections.push(`Today: ${today} (${month})`);
    if (garden.usda_zone) sections.push(`USDA Zone: ${garden.usda_zone}`);
    if (garden.last_frost_date) sections.push(`Last frost date: ${garden.last_frost_date}`);
    if (garden.first_frost_date) sections.push(`First frost date: ${garden.first_frost_date}`);
    if (garden.address) sections.push(`Location: ${garden.address}`);

    // Plots
    const plots = this.db.prepare(
      'SELECT id, name, plot_type, sun_exposure FROM plots WHERE garden_id = ?'
    ).all(gardenId) as any[];
    if (plots.length > 0) {
      sections.push(`\n## Plots (${plots.length})`);
      for (const p of plots) {
        sections.push(`- ${p.name} (${p.plot_type?.replace('_', ' ')}${p.sun_exposure ? ', ' + p.sun_exposure.replace('_', ' ') : ''})`);
      }
    }

    // Active plants
    const plants = this.db.prepare(`
      SELECT pi.status, pi.date_planted, pi.health, pi.notes,
             pc.common_name, pc.plant_type, pc.days_to_maturity_min,
             p.name as plot_name
      FROM plant_instances pi
      JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
      JOIN plots p ON pi.plot_id = p.id
      WHERE p.garden_id = ?
        AND pi.status NOT IN ('finished', 'failed', 'removed')
      ORDER BY pc.common_name
    `).all(gardenId) as any[];
    if (plants.length > 0) {
      sections.push(`\n## Active Plants (${plants.length})`);
      for (const pl of plants.slice(0, 30)) {
        let line = `- ${pl.common_name} in ${pl.plot_name}: ${pl.status.replace('_', ' ')}`;
        if (pl.health && pl.health !== 'good') line += `, health: ${pl.health}`;
        if (pl.date_planted) line += `, planted ${pl.date_planted}`;
        sections.push(line);
      }
      if (plants.length > 30) sections.push(`  ...and ${plants.length - 30} more`);
    }

    // Recent harvests
    const harvests = this.db.prepare(`
      SELECT h.quantity, h.unit, h.date_harvested, h.quality,
             pc.common_name
      FROM harvests h
      JOIN plant_instances pi ON h.plant_instance_id = pi.id
      JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
      JOIN plots p ON pi.plot_id = p.id
      WHERE p.garden_id = ?
      ORDER BY h.date_harvested DESC
      LIMIT 10
    `).all(gardenId) as any[];
    if (harvests.length > 0) {
      sections.push(`\n## Recent Harvests`);
      for (const h of harvests) {
        sections.push(`- ${h.common_name}: ${h.quantity} ${h.unit} on ${h.date_harvested}${h.quality !== 'good' ? ' (' + h.quality + ')' : ''}`);
      }
    }

    // Pending tasks (scoped to this garden via entity relationships)
    const plotIds = plots.map((p: any) => p.id);
    const plantInstanceIds = plotIds.length > 0
      ? (this.db.prepare(
          `SELECT id FROM plant_instances WHERE plot_id IN (${plotIds.map(() => '?').join(',')})`
        ).all(...plotIds) as any[]).map((r: any) => r.id)
      : [];
    const entityIds = [gardenId, ...plotIds, ...plantInstanceIds];
    const tasks = entityIds.length > 0
      ? this.db.prepare(`
          SELECT title, task_type, due_date, priority
          FROM tasks
          WHERE status IN ('pending', 'in_progress')
            AND entity_id IN (${entityIds.map(() => '?').join(',')})
          ORDER BY due_date ASC
          LIMIT 10
        `).all(...entityIds) as any[]
      : [];
    if (tasks.length > 0) {
      sections.push(`\n## Pending Tasks`);
      for (const t of tasks) {
        sections.push(`- [${t.priority}] ${t.title}${t.due_date ? ' (due ' + t.due_date + ')' : ''}`);
      }
    }

    // Recent weather
    try {
      const weather = this.db.prepare(`
        SELECT date, temp_high_f, temp_low_f, conditions, precipitation_in
        FROM weather_daily_summaries
        WHERE garden_id = ?
        ORDER BY date DESC
        LIMIT 5
      `).all(gardenId) as any[];
      if (weather.length > 0) {
        sections.push(`\n## Recent Weather`);
        for (const w of weather) {
          sections.push(`- ${w.date}: ${w.temp_low_f}°F - ${w.temp_high_f}°F, ${w.conditions}${w.precipitation_in ? ', ' + w.precipitation_in + '" rain' : ''}`);
        }
      }
    } catch {
      // Weather tables may not exist yet
    }

    return sections.join('\n');
  }
}
