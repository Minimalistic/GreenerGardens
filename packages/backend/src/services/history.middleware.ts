import { v4 as uuid } from 'uuid';
import type { HistoryLogRepository } from '../db/repositories/history-log.repository.js';

export interface HistoryLogger {
  logCreate(entityType: string, entity: Record<string, any>): void;
  logUpdate(entityType: string, entityId: string, oldEntity: Record<string, any>, newEntity: Record<string, any>): void;
  logDelete(entityType: string, entity: Record<string, any>): void;
}

export function createHistoryLogger(historyRepo: HistoryLogRepository): HistoryLogger {
  return {
    logCreate(entityType: string, entity: Record<string, any>): void {
      historyRepo.insert({
        id: uuid(),
        entity_type: entityType,
        entity_id: entity.id,
        action: 'create',
        timestamp: new Date().toISOString(),
        field_changes_json: null,
        snapshot_json: JSON.stringify(entity),
        changed_by: 'system',
      });
    },

    logUpdate(entityType: string, entityId: string, oldEntity: Record<string, any>, newEntity: Record<string, any>): void {
      const changes: Record<string, { old: any; new: any }> = {};

      for (const key of Object.keys(newEntity)) {
        if (key === 'updated_at') continue;
        const oldVal = oldEntity[key];
        const newVal = newEntity[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes[key] = { old: oldVal, new: newVal };
        }
      }

      // Skip if nothing actually changed
      if (Object.keys(changes).length === 0) return;

      historyRepo.insert({
        id: uuid(),
        entity_type: entityType,
        entity_id: entityId,
        action: 'update',
        timestamp: new Date().toISOString(),
        field_changes_json: JSON.stringify(changes),
        snapshot_json: null,
        changed_by: 'system',
      });
    },

    logDelete(entityType: string, entity: Record<string, any>): void {
      historyRepo.insert({
        id: uuid(),
        entity_type: entityType,
        entity_id: entity.id,
        action: 'delete',
        timestamp: new Date().toISOString(),
        field_changes_json: null,
        snapshot_json: JSON.stringify(entity),
        changed_by: 'system',
      });
    },
  };
}
