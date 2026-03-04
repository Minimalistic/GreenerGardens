import type { HistoryLogRepository, HistoryLogRow } from '../db/repositories/history-log.repository.js';

export class HistoryLogService {
  constructor(private historyRepo: HistoryLogRepository) {}

  getRecent(limit: number = 20, offset: number = 0) {
    const data = this.historyRepo.findRecent(limit, offset);
    const total = this.historyRepo.count();
    return {
      data: data.map(row => this.deserialize(row)),
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  getByEntity(entityType: string, entityId: string) {
    return this.historyRepo.findByEntity(entityType, entityId)
      .map(row => this.deserialize(row));
  }

  getByDateRange(startDate: string, endDate: string) {
    return this.historyRepo.findByDateRange(startDate, endDate)
      .map(row => this.deserialize(row));
  }

  getFiltered(
    filters: { entity_type?: string; action?: string; start_date?: string; end_date?: string },
    limit: number = 50,
    offset: number = 0
  ) {
    const data = this.historyRepo.findFiltered(filters, limit, offset);
    const total = this.historyRepo.countFiltered(filters);
    return {
      data: data.map(row => this.deserialize(row)),
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  private deserialize(row: HistoryLogRow) {
    return {
      ...row,
      field_changes: row.field_changes_json ? JSON.parse(row.field_changes_json) : null,
      snapshot: row.snapshot_json ? JSON.parse(row.snapshot_json) : null,
    };
  }
}
