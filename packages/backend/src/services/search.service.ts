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

  search(query: string, userId: string, limit = 50): SearchResult[] {
    const results: SearchResult[] = [];
    const pattern = `%${query}%`;

    // Search plant catalog (shared data — no user filter needed)
    const plants = this.db.prepare(
      `SELECT id, common_name, scientific_name, family, emoji, plant_type FROM plant_catalog
       WHERE common_name LIKE ? OR scientific_name LIKE ? OR family LIKE ?
       LIMIT ?`
    ).all(pattern, pattern, pattern, limit) as { id: string; common_name: string; scientific_name: string | null; family: string | null; emoji: string | null; plant_type: string }[];

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

    // Search plots (scoped through garden ownership)
    const plots = this.db.prepare(
      `SELECT p.id, p.name, p.notes FROM plots p
       JOIN gardens g ON p.garden_id = g.id
       WHERE g.user_id = ? AND (p.name LIKE ? OR p.notes LIKE ?) LIMIT ?`
    ).all(userId, pattern, pattern, limit) as { id: string; name: string; notes: string | null }[];

    for (const p of plots) {
      results.push({
        entity_type: 'plot',
        entity_id: p.id,
        title: p.name,
        subtitle: p.notes,
        match_field: 'name',
      });
    }

    // Search notes (direct user_id)
    const notes = this.db.prepare(
      `SELECT id, content FROM notes WHERE user_id = ? AND content LIKE ? LIMIT ?`
    ).all(userId, pattern, limit) as { id: string; content: string }[];

    for (const n of notes) {
      results.push({
        entity_type: 'note',
        entity_id: n.id,
        title: n.content.substring(0, 100),
        subtitle: null,
        match_field: 'content',
      });
    }

    // Search tasks (scoped through garden chain)
    const tasks = this.db.prepare(
      `SELECT t.id, t.title, t.description FROM tasks t
       WHERE (t.entity_type = 'garden' AND t.entity_id IN (SELECT id FROM gardens WHERE user_id = ?))
          OR (t.entity_type = 'plot' AND t.entity_id IN (SELECT id FROM plots WHERE garden_id IN (SELECT id FROM gardens WHERE user_id = ?)))
          OR (t.entity_type = 'plant_instance' AND t.entity_id IN (SELECT id FROM plant_instances WHERE plot_id IN (SELECT id FROM plots WHERE garden_id IN (SELECT id FROM gardens WHERE user_id = ?))))
       AND (t.title LIKE ? OR t.description LIKE ?)
       LIMIT ?`
    ).all(userId, userId, userId, pattern, pattern, limit) as { id: string; title: string; description: string | null }[];

    for (const t of tasks) {
      results.push({
        entity_type: 'task',
        entity_id: t.id,
        title: t.title,
        subtitle: t.description,
        match_field: 'title',
      });
    }

    // Search pest events (scoped through garden chain)
    const pests = this.db.prepare(
      `SELECT pe.id, pe.pest_name, pe.notes FROM pest_events pe
       WHERE (pe.entity_type = 'garden' AND pe.entity_id IN (SELECT id FROM gardens WHERE user_id = ?))
          OR (pe.entity_type = 'plot' AND pe.entity_id IN (SELECT id FROM plots WHERE garden_id IN (SELECT id FROM gardens WHERE user_id = ?)))
          OR (pe.entity_type = 'plant_instance' AND pe.entity_id IN (SELECT id FROM plant_instances WHERE plot_id IN (SELECT id FROM plots WHERE garden_id IN (SELECT id FROM gardens WHERE user_id = ?))))
       AND (pe.pest_name LIKE ? OR pe.notes LIKE ?)
       LIMIT ?`
    ).all(userId, userId, userId, pattern, pattern, limit) as { id: string; pest_name: string; notes: string | null }[];

    for (const pe of pests) {
      results.push({
        entity_type: 'pest_event',
        entity_id: pe.id,
        title: pe.pest_name,
        subtitle: pe.notes?.substring(0, 100) || null,
        match_field: 'pest_name',
      });
    }

    // Search tags (direct user_id)
    const tags = this.db.prepare(
      `SELECT id, name FROM tags WHERE user_id = ? AND name LIKE ? LIMIT ?`
    ).all(userId, pattern, limit) as { id: string; name: string }[];

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
