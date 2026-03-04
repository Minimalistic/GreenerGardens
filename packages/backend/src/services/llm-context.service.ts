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
        sections.push(`- ${p.name} (${p.plot_type?.replaceAll('_', ' ')}${p.sun_exposure ? ', ' + p.sun_exposure.replaceAll('_', ' ') : ''})`);
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
        let line = `- ${pl.common_name} in ${pl.plot_name}: ${pl.status.replaceAll('_', ' ')}`;
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

    // Pending tasks (scoped to this garden's entities)
    const tasks = this.db.prepare(`
      SELECT t.title, t.task_type, t.due_date, t.priority
      FROM tasks t
      WHERE t.status IN ('pending', 'in_progress')
        AND (
          (t.entity_type = 'garden' AND t.entity_id = ?)
          OR (t.entity_type = 'plot' AND t.entity_id IN (SELECT id FROM plots WHERE garden_id = ?))
          OR (t.entity_type = 'plant_instance' AND t.entity_id IN (SELECT pi.id FROM plant_instances pi JOIN plots p ON pi.plot_id = p.id WHERE p.garden_id = ?))
        )
      ORDER BY t.due_date ASC
      LIMIT 10
    `).all(gardenId, gardenId, gardenId) as any[];
    if (tasks.length > 0) {
      sections.push(`\n## Pending Tasks`);
      for (const t of tasks) {
        sections.push(`- [${t.priority}] ${t.title}${t.due_date ? ' (due ' + t.due_date + ')' : ''}`);
      }
    }

    // Recent weather
    try {
      const weather = this.db.prepare(`
        SELECT date, high_f, low_f, precipitation_total_inches
        FROM weather_daily_summaries
        WHERE garden_id = ?
        ORDER BY date DESC
        LIMIT 5
      `).all(gardenId) as any[];
      if (weather.length > 0) {
        sections.push(`\n## Recent Weather`);
        for (const w of weather) {
          sections.push(`- ${w.date}: ${w.low_f}°F - ${w.high_f}°F${w.precipitation_total_inches ? ', ' + w.precipitation_total_inches + '" rain' : ''}`);
        }
      }
    } catch (err) {
      // Weather tables may not exist yet — only ignore missing table errors
      if (err instanceof Error && !err.message.includes('no such table')) {
        throw err;
      }
    }

    return sections.join('\n');
  }
}
