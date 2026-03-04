export const queryKeys = {
  alerts: {
    all: ['alerts'] as const,
    byGarden: (gardenId: string) => ['alerts', gardenId] as const,
  },
  analytics: {
    harvests: (groupBy: string, year?: number) => ['analytics', 'harvests', groupBy, year] as const,
    destinations: (year?: number) => ['analytics', 'destinations', year] as const,
    yearOverYear: ['analytics', 'year-over-year'] as const,
  },
  assistant: {
    status: ['assistant', 'status'] as const,
    conversations: ['assistant', 'conversations'] as const,
    messages: (conversationId: string) => ['assistant', 'messages', conversationId] as const,
  },
  backups: {
    all: ['backups'] as const,
  },
  calendar: {
    month: (gardenId: string, year: number, month: number) => ['calendar', gardenId, year, month] as const,
    week: (gardenId: string) => ['calendar', 'week', gardenId] as const,
    suggestions: (gardenId: string) => ['calendar', 'suggestions', gardenId] as const,
  },
  companion: {
    check: (plantId: string, neighbors: string) => ['companion', 'check', plantId, neighbors] as const,
    suggestions: (plantId: string, plotId: string) => ['companion', 'suggestions', plantId, plotId] as const,
  },
  costs: {
    all: ['costs'] as const,
    list: (options?: { category?: string }) => ['costs', options] as const,
    summary: (year?: number) => ['costs', 'summary', year] as const,
    yearly: ['costs', 'yearly'] as const,
  },
  gardens: {
    all: ['gardens'] as const,
    detail: (id: string) => ['garden', id] as const,
    deletionImpact: (id: string) => ['garden-deletion-impact', id] as const,
  },
  harvests: {
    all: ['harvests'] as const,
    byPlant: (plantInstanceId: string) => ['harvests', 'plant', plantInstanceId] as const,
    stats: ['harvest-stats'] as const,
  },
  history: {
    all: ['history'] as const,
    recent: (limit: number) => ['history', 'recent', limit] as const,
    filtered: (filters: object) => ['history', 'filtered', filters] as const,
    entity: (entityType: string, entityId: string) => ['history', entityType, entityId] as const,
  },
  notes: {
    all: ['notes'] as const,
    list: (filters?: { pinned?: boolean; limit?: number }) => ['notes', filters] as const,
    detail: (id: string) => ['note', id] as const,
    byEntity: (entityType: string, entityId: string) => ['notes', 'entity', entityType, entityId] as const,
    byDate: (date: string) => ['notes', 'date', date] as const,
  },
  pestCatalog: {
    all: ['pest-catalog'] as const,
    list: (params: object) => ['pest-catalog', params] as const,
    detail: (id: string) => ['pest-catalog', id] as const,
  },
  pestEvents: {
    all: ['pest-events'] as const,
    list: (filters?: object) => ['pest-events', filters] as const,
    detail: (id: string) => ['pest-event', id] as const,
  },
  plantCatalog: {
    all: ['plant-catalog'] as const,
    list: (params: object) => ['plant-catalog', params] as const,
    detail: (id: string) => ['plant-catalog', id] as const,
    activity: (id: string) => ['plant-catalog', id, 'activity'] as const,
    wikipedia: (id: string) => ['plant-catalog', id, 'wikipedia'] as const,
  },
  plantInstances: {
    all: ['plant-instances'] as const,
    detail: (id: string) => ['plant-instance', id] as const,
  },
  plantingGuide: {
    byGarden: (gardenId: string, date?: string) => ['planting-guide', gardenId, date] as const,
  },
  plots: {
    all: ['plots'] as const,
    byGarden: (gardenId: string) => ['plots', gardenId] as const,
    detail: (id: string) => ['plot', id] as const,
    deletionImpact: (id: string) => ['plot-deletion-impact', id] as const,
  },
  push: {
    vapidKey: ['push', 'vapid-key'] as const,
  },
  rotation: {
    check: (plotId: string, plantCatalogId: string) => ['rotation', 'check', plotId, plantCatalogId] as const,
    history: (plotId: string, years: number) => ['rotation', 'history', plotId, years] as const,
  },
  search: {
    query: (q: string) => ['search', q] as const,
  },
  seedInventory: {
    all: ['seed-inventory'] as const,
    list: (options?: { expiring_soon?: boolean; low_quantity?: boolean }) => ['seed-inventory', options] as const,
    detail: (id: string) => ['seed-inventory', id] as const,
  },
  settings: {
    all: ['settings'] as const,
  },
  setup: {
    status: ['setup-status'] as const,
  },
  soilTests: {
    all: ['soil-tests'] as const,
    byPlot: (plotId: string) => ['soil-tests', plotId] as const,
    trends: (plotId: string) => ['soil-tests', 'trends', plotId] as const,
  },
  subPlots: {
    all: ['sub-plots'] as const,
    byPlot: (plotId: string) => ['sub-plots', plotId] as const,
    withPlants: (plotId: string) => ['sub-plots-with-plants', plotId] as const,
    allWithPlants: ['sub-plots-with-plants'] as const,
    detail: (id: string) => ['sub-plot', id] as const,
  },
  tags: {
    all: ['tags'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (filters?: object) => ['tasks', filters] as const,
    overdue: ['tasks', 'overdue'] as const,
    today: ['tasks', 'today'] as const,
    week: ['tasks', 'week'] as const,
  },
  uploads: {
    all: ['uploads'] as const,
    byEntity: (entityType: string, entityId: string) => ['uploads', entityType, entityId] as const,
  },
  weather: {
    status: ['weather-status'] as const,
    current: (gardenId: string) => ['weather', 'current', gardenId] as const,
    forecast: (gardenId: string) => ['weather', 'forecast', gardenId] as const,
    dailySummary: (gardenId: string, start: string, end: string) => ['weather', 'daily-summary', gardenId, start, end] as const,
  },
};
