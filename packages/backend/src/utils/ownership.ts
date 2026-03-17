import type Database from 'better-sqlite3';
import { NotFoundError } from './errors.js';

/**
 * Verify that a garden belongs to the given user.
 * Returns 404 (not 403) to avoid leaking existence of other users' data.
 */
export function assertGardenOwnership(db: Database.Database, gardenId: string, userId: string): void {
  const row = db.prepare('SELECT id FROM gardens WHERE id = ? AND user_id = ?').get(gardenId, userId) as { id: string } | undefined;
  if (!row) {
    throw new NotFoundError('Garden', gardenId);
  }
}

/**
 * Verify that a plot belongs to a garden owned by the given user.
 * Returns the garden_id for convenience.
 */
export function assertPlotOwnership(db: Database.Database, plotId: string, userId: string): string {
  const row = db.prepare(
    `SELECT p.id, p.garden_id FROM plots p
     JOIN gardens g ON p.garden_id = g.id
     WHERE p.id = ? AND g.user_id = ?`
  ).get(plotId, userId) as { id: string; garden_id: string } | undefined;
  if (!row) {
    throw new NotFoundError('Plot', plotId);
  }
  return row.garden_id;
}

/**
 * Verify that a plant instance belongs to a plot in a garden owned by the given user.
 */
export function assertPlantInstanceOwnership(db: Database.Database, instanceId: string, userId: string): void {
  const row = db.prepare(
    `SELECT pi.id FROM plant_instances pi
     JOIN plots p ON pi.plot_id = p.id
     JOIN gardens g ON p.garden_id = g.id
     WHERE pi.id = ? AND g.user_id = ?`
  ).get(instanceId, userId) as { id: string } | undefined;
  if (!row) {
    throw new NotFoundError('PlantInstance', instanceId);
  }
}

/**
 * Verify entity ownership through the garden chain.
 * Works for any entity linked via entity_type/entity_id polymorphic references.
 */
export function assertEntityOwnership(db: Database.Database, entityType: string, entityId: string, userId: string): void {
  switch (entityType) {
    case 'garden':
      assertGardenOwnership(db, entityId, userId);
      break;
    case 'plot':
      assertPlotOwnership(db, entityId, userId);
      break;
    case 'plant_instance':
      assertPlantInstanceOwnership(db, entityId, userId);
      break;
    default:
      // For other entity types, no ownership check possible at this level
      break;
  }
}
