import type Database from 'better-sqlite3';

interface SearchResult {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
  match_field: string;
  emoji?: string | null;
  plant_type?: string | null;
}

export class SearchService {
  constructor(private db: Database.Database) {}

  search(query: string, limit = 50): SearchResult[] {
    const results: SearchResult[] = [];
    const pattern = `%${query}%`;

    // Search plant catalog
    const plants = this.db.prepare(
      `SELECT id, common_name, scientific_name, family, emoji, plant_type FROM plant_catalog
       WHERE common_name LIKE ? OR scientific_name LIKE ? OR family LIKE ?
       LIMIT ?`
    ).all(pattern, pattern, pattern, limit) as { id: string; common_name: string; scientific_name: string | null; family: string | null; emoji: string | null; plant_type: string | null }[];

    for (const p of plants) {
      results.push({
        entity_type: 'plant_catalog',
        entity_id: p.id,
        title: p.common_name,
        subtitle: p.scientific_name || p.family,
        match_field: 'name',
        emoji: p.emoji,
        plant_type: p.plant_type,
      });
    }

    // Search plots
    const plots = this.db.prepare(
      `SELECT id, name, notes FROM plots WHERE name LIKE ? OR notes LIKE ? LIMIT ?`
    ).all(pattern, pattern, limit) as { id: string; name: string; notes: string | null }[];

    for (const p of plots) {
      results.push({
        entity_type: 'plot',
        entity_id: p.id,
        title: p.name,
        subtitle: p.notes,
        match_field: 'name',
      });
    }

    // Search notes
    const notes = this.db.prepare(
      `SELECT id, content FROM notes WHERE content LIKE ? LIMIT ?`
    ).all(pattern, limit) as { id: string; content: string }[];

    for (const n of notes) {
      results.push({
        entity_type: 'note',
        entity_id: n.id,
        title: n.content.substring(0, 100),
        subtitle: null,
        match_field: 'content',
      });
    }

    // Search tasks
    const tasks = this.db.prepare(
      `SELECT id, title, description FROM tasks WHERE title LIKE ? OR description LIKE ? LIMIT ?`
    ).all(pattern, pattern, limit) as { id: string; title: string; description: string | null }[];

    for (const t of tasks) {
      results.push({
        entity_type: 'task',
        entity_id: t.id,
        title: t.title,
        subtitle: t.description,
        match_field: 'title',
      });
    }

    // Search pest events
    const pests = this.db.prepare(
      `SELECT id, pest_name, notes FROM pest_events WHERE pest_name LIKE ? OR notes LIKE ? LIMIT ?`
    ).all(pattern, pattern, limit) as { id: string; pest_name: string; notes: string | null }[];

    for (const pe of pests) {
      results.push({
        entity_type: 'pest_event',
        entity_id: pe.id,
        title: pe.pest_name,
        subtitle: pe.notes?.substring(0, 100) || null,
        match_field: 'pest_name',
      });
    }

    // Search tags
    const tags = this.db.prepare(
      `SELECT id, name FROM tags WHERE name LIKE ? LIMIT ?`
    ).all(pattern, limit) as { id: string; name: string }[];

    for (const tag of tags) {
      results.push({
        entity_type: 'tag',
        entity_id: tag.id,
        title: tag.name,
        subtitle: null,
        match_field: 'name',
      });
    }

    return results.slice(0, limit);
  }
}
