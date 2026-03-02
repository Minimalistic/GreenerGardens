# Phase 7 — Code Review: Optimization, Refactoring & Complexity Reduction

> A comprehensive code review with suggested plan for optimizing, refactoring, and reducing complexity across the GreenerGardens monorepo — without impacting current functionality.

## Code Review Summary

The codebase is well-structured with a clear **Repository → Service → Route** pattern on the backend and a **Page → Hook → API** pattern on the frontend. The shared package with Zod schemas is a strong foundation. That said, there are several recurring patterns of duplication and complexity that can be systematically addressed.

---

## Finding 1: Duplicated CRUD Route Boilerplate (High Impact)

**Files affected**: All 15+ route files in `packages/backend/src/routes/`

**Problem**: Every route file manually wires the same CRUD pattern — `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` — each with identical `{ success: true, data }` / `reply.status(201)` / `reply.status(204)` boilerplate. Examples:

- `garden.routes.ts` lines 6-35
- `plot.routes.ts` lines 6-35
- `harvest.routes.ts` lines 5-39
- `cost-entry.routes.ts` lines 5-52
- `soil-test.routes.ts` lines 4-44
- `note.routes.ts` lines 4-37
- `pest-event.routes.ts` lines 4-37
- `tag.routes.ts` lines 4-24
- `seed-inventory.routes.ts` lines 5-48

**Suggestion**: Create a `registerCrudRoutes` helper that generates standard CRUD endpoints from a service reference. Individual route files would only define non-standard endpoints (e.g., `POST /succession`, `GET /stats`, entity-specific filters).

```ts
// Example: routes/helpers/crud.ts
function registerCrudRoutes(fastify, prefix, service, options?) {
  fastify.get(`/api/v1/${prefix}`, async (req) => {
    const data = service.findAll(parsePagination(req.query));
    return { success: true, data };
  });
  fastify.post(`/api/v1/${prefix}`, async (req, reply) => {
    const data = service.create(req.body);
    reply.status(201);
    return { success: true, data };
  });
  // ... GET /:id, PATCH /:id, DELETE /:id
}
```

**Estimated reduction**: ~200-300 lines of repetitive route code eliminated.

---

## Finding 2: Duplicated Repository Instantiation Across Route Groups (Medium Impact)

**Files affected**:
- `routes/groups/core.routes.ts`
- `routes/groups/tracking.routes.ts`
- `routes/groups/knowledge.routes.ts`
- `routes/groups/data.routes.ts`
- `routes/groups/management.routes.ts`

**Problem**: `GardenRepository` is instantiated **3 times** (core, tracking, knowledge), `PlantCatalogRepository` **3 times** (core, tracking, knowledge), and `PlantInstanceRepository` **2 times** (core, tracking). Each route group file creates its own instances despite all sharing the same `db` handle.

**Suggestion**: Create a simple repository registry / factory that caches repository instances per `db` handle:

```ts
// db/repository-registry.ts
class RepositoryRegistry {
  private cache = new Map();
  constructor(private db: Database.Database) {}

  get gardens() { return this.cached(GardenRepository); }
  get plots() { return this.cached(PlotRepository); }
  // ...
  private cached<T>(Ctor: new (db: Database.Database) => T): T {
    if (!this.cache.has(Ctor)) this.cache.set(Ctor, new Ctor(this.db));
    return this.cache.get(Ctor)!;
  }
}
```

This eliminates duplicate instantiation and makes dependency wiring clearer in `routes/index.ts`.

**Estimated reduction**: ~30 lines of duplicated `new XRepository(db)` calls, plus cleaner dependency graph.

---

## Finding 3: Duplicated Alert Service Logic — Frost vs Heat (Medium Impact)

**File**: `packages/backend/src/services/alert.service.ts`

**Problem**: `checkFrostAlert()` (lines 15-78) and `checkHeatAlert()` (lines 80-137) are nearly identical — same structure of: check config → get garden → fetch forecast → group by date → find extremes → check for existing tasks → create tasks. The only differences are: threshold direction (min vs max), threshold value (36°F vs 95°F), task type string, and title/description text.

**Suggestion**: Extract a shared `checkWeatherAlert()` method parameterized by alert config:

```ts
interface AlertConfig {
  taskType: string;
  threshold: number;
  compare: 'below' | 'above';
  tempField: 'temp_min_f' | 'temp_max_f';
  titleFn: (temp: number, date: string) => string;
  descriptionFn: (temp: number) => string;
  priorityFn: (temp: number) => string;
}
```

**Estimated reduction**: ~50 lines of duplicated code.

---

## Finding 4: Duplicated Frontend CRUD Hook Pattern (High Impact)

**Files affected**: All 15+ hook files in `packages/frontend/src/hooks/`

**Problem**: Every entity hook file (use-gardens, use-plots, use-harvests, use-notes, use-pest-events, use-soil-tests, use-seed-inventory, use-tasks, use-costs) follows the exact same pattern:
1. `useList()` → `useQuery` + `api.get`
2. `useById(id)` → `useQuery` + `api.get` + `enabled: !!id`
3. `useCreate()` → `useMutation` + `api.post` + `invalidateQueries`
4. `useUpdate()` → `useMutation` + `api.patch` + `invalidateQueries`
5. `useDelete()` → `useMutation` + `api.delete` + `invalidateQueries`

Each hook redeclares `useQueryClient()`, writes the same invalidation logic, etc.

**Suggestion**: Create a `createCrudHooks<T>()` factory that generates standard hooks from a config:

```ts
// hooks/create-crud-hooks.ts
function createCrudHooks<T>(resource: string, queryKey: string) {
  return {
    useList: (params?) => useQuery({
      queryKey: [queryKey, params],
      queryFn: () => api.get<ApiResponse<T[]>>(`/${resource}`, params),
    }),
    useById: (id) => useQuery({
      queryKey: [queryKey, id],
      queryFn: () => api.get<ApiResponse<T>>(`/${resource}/${id}`),
      enabled: !!id,
    }),
    useCreate: (invalidateKeys?) => /* ... */,
    useUpdate: (invalidateKeys?) => /* ... */,
    useDelete: (invalidateKeys?) => /* ... */,
  };
}
```

Individual hook files would then only export the factory result plus any entity-specific hooks (e.g., `useOverdueTasks`, `useHarvestStats`).

**Estimated reduction**: ~300-400 lines of duplicated hook boilerplate.

---

## Finding 5: Inconsistent parseInt Usage (Low Impact, Easy Fix)

**Files affected**:
- `note.routes.ts` line 12: `parseInt(limit)` — no radix, no NaN guard
- `pest-event.routes.ts` lines 12-13: `parseInt(limit)` — no radix, no NaN guard
- `soil-test.routes.ts` line 12: `parseInt(limit)` — no radix, no NaN guard

**Problem**: Some routes use `safeParseInt()` (harvest, task, plant-instance, cost-entry, seed-inventory) while others use raw `parseInt()` without the radix parameter or NaN fallback. The utility exists but isn't used consistently.

**Suggestion**: Replace all raw `parseInt()` calls in route files with the existing `safeParseInt()` utility from `utils/parse.ts`. This is a simple find-and-replace.

**Estimated reduction**: 0 lines (replacement), but eliminates potential NaN bugs.

---

## Finding 6: Frontend Type Duplication with Shared Package (Medium Impact)

**Files affected**:
- `hooks/use-tasks.ts` lines 6-32: re-declares `Task` and `TaskCreate` interfaces
- `hooks/use-notes.ts` lines 4-28: re-declares `Note`, `NoteCreate`, `EntityLink` interfaces
- `hooks/use-pest-events.ts` lines 4-35: re-declares `PestEvent`, `PestEventCreate` interfaces
- `hooks/use-soil-tests.ts` lines 4-37: re-declares `SoilTest`, `SoilTestCreate` interfaces

**Problem**: The shared package (`@gardenvault/shared`) already exports Zod schemas and inferred types for these entities. Several hook files re-declare local interfaces instead of importing from shared, creating a maintenance burden where types can drift.

**Suggestion**: Import types from `@gardenvault/shared` instead of re-declaring them locally. The shared package already has schemas for all these entities. For hooks that need frontend-specific shapes (e.g., parsed JSON fields), extend the shared type rather than re-declaring it.

**Estimated reduction**: ~100 lines of duplicated type declarations.

---

## Finding 7: SearchService Repetitive Query Pattern (Low-Medium Impact)

**File**: `packages/backend/src/services/search.service.ts`

**Problem**: The `search()` method (lines 15-113) repeats the same pattern 6 times: prepare a LIKE query → execute → loop results → push to results array, varying only by table name, columns, and output mapping.

**Suggestion**: Define a search config array and iterate:

```ts
const searchTargets = [
  { table: 'plant_catalog', entityType: 'plant_catalog', titleCol: 'common_name', subtitleCol: 'scientific_name', searchCols: ['common_name', 'scientific_name', 'family'] },
  { table: 'plots', entityType: 'plot', titleCol: 'name', subtitleCol: 'notes', searchCols: ['name', 'notes'] },
  // ...
];
```

**Estimated reduction**: ~60 lines.

---

## Finding 8: AnalyticsService Duplicated Year-Filter Pattern (Low Impact)

**File**: `packages/backend/src/services/analytics.service.ts`

**Problem**: All 4 analytics methods (`getYieldByPlant`, `getYieldByPlot`, `getSeasonalTimeline`, `getDestinationBreakdown`) repeat the same year-filter pattern:
```ts
const yearFilter = year ? `AND/WHERE strftime('%Y', h.harvest_date) = ?` : '';
const params = year ? [String(year)] : [];
```

**Suggestion**: Extract a small helper: `buildYearFilter(year, alias, conjunction)` that returns `{ clause, params }`.

**Estimated reduction**: ~15 lines, improved consistency.

---

## Finding 9: CalendarService and PlantingGuideService Overlap (Medium Impact)

**Files**:
- `services/calendar.service.ts` (lines 91-150: `getPlantingSuggestions`)
- `services/planting-guide.service.ts` (lines 35-148: `getPlantingGuide`)

**Problem**: Both services compute planting windows from frost dates and catalog data using nearly identical logic — iterate all plants, compute indoor start / direct sow / transplant dates relative to last frost date, check if dates fall in a range. The `PlantingGuideService` is a superset of `CalendarService.getPlantingSuggestions()`.

**Suggestion**: Extract frost-date-relative window calculation into a shared utility:

```ts
// utils/frost-windows.ts
function computePlantingWindows(plant: PlantCatalogRow, lastFrostDate: string, firstFrostDate?: string) {
  return { indoorStart, directSow, transplant }; // each: { start, end }
}
```

Both services would call this utility, eliminating duplicated date arithmetic.

**Estimated reduction**: ~40 lines of duplicated logic.

---

## Finding 10: GardenLayout Page Complexity (Medium Impact)

**File**: `packages/frontend/src/pages/garden-layout.tsx` (564 lines)

**Problem**: This is the largest page component in the frontend. It manages: garden selection, plot CRUD, clipboard (copy/paste/duplicate), context menu, keyboard shortcuts, drag/drop with geometry sync, deletion with impact preview, form state, and sub-plot loading. This is a lot of state and logic in one component.

**Suggestion**: Extract into smaller, focused hooks:
- `useClipboard(plots, currentGardenId)` — handles copy/paste/duplicate state and logic
- `usePlotDragDrop(plots, updatePlot)` — handles geometry sync on drag end
- Extract the "Create Plot" dialog into a `CreatePlotDialog` component

This keeps the page as an orchestrator rather than an implementer.

**Estimated reduction**: The page drops from ~565 lines to ~250, with logic distributed to testable, focused hooks/components.

---

## Finding 11: `cleanupOrphans` Triple-Loops (Low Impact)

**File**: `packages/backend/src/services/garden.service.ts` lines 90-122

**Problem**: The `cleanupOrphans` method iterates the `orphanTables` array 3 times — once for garden-level, once for plot-level, once for plant-instance-level — running 15 DELETE queries total.

**Suggestion**: Combine into 3 queries (one per entity level) using `IN` across tables, or use a single CTE-based DELETE per level. Alternatively, consolidate the 3 loops into 1 loop that handles all 3 levels per table:

```ts
for (const table of orphanTables) {
  this.db.prepare(`DELETE FROM ${table} WHERE
    (entity_type = 'garden' AND entity_id = ?) OR
    (entity_type = 'plot' AND entity_id IN (SELECT id FROM plots WHERE garden_id = ?)) OR
    (entity_type = 'plant_instance' AND entity_id IN (SELECT ...))
  `).run(gardenId, gardenId, gardenId);
}
```

**Estimated reduction**: 10 SQL executions reduced to 5 (one per table), cleaner code.

---

## Implementation Priority

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| 1 | **F4**: Frontend CRUD hook factory | Medium | High — eliminates ~350 lines of duplication |
| 2 | **F1**: Backend CRUD route helper | Medium | High — eliminates ~250 lines of duplication |
| 3 | **F5**: Consistent `safeParseInt` usage | Trivial | Low — bug prevention |
| 4 | **F6**: Import shared types in hooks | Low | Medium — eliminates type drift |
| 5 | **F2**: Repository registry | Low | Medium — cleaner DI |
| 6 | **F3**: Unified alert check | Low | Medium — eliminates ~50 lines |
| 7 | **F10**: GardenLayout decomposition | Medium | Medium — maintainability |
| 8 | **F9**: Shared frost-window utility | Low | Medium — eliminates logic duplication |
| 9 | **F7**: SearchService config-driven | Low | Low-Medium |
| 10 | **F11**: Consolidate orphan cleanup | Trivial | Low |
| 11 | **F8**: Analytics year-filter helper | Trivial | Low |

## Phasing Recommendation

### Phase 7a — Quick Wins (Low risk, immediate)
- F5: Replace raw `parseInt` with `safeParseInt` (3 files, ~5 min)
- F6: Import shared types in frontend hooks (4 files)
- F8: Extract analytics year-filter helper
- F11: Consolidate orphan cleanup loops

### Phase 7b — Backend Refactoring
- F1: Create `registerCrudRoutes` helper; refactor route files to use it
- F2: Create repository registry; refactor route groups
- F3: Unify frost/heat alert logic
- F9: Extract shared frost-window utility

### Phase 7c — Frontend Refactoring
- F4: Create `createCrudHooks` factory; refactor hook files
- F10: Decompose GardenLayout page

## Testing Strategy

All changes must preserve existing functionality. After each phase:
1. Run existing backend tests: `npx vitest run` from project root
2. Run TypeScript checks: `npx tsc --noEmit` for both backend and frontend
3. Manual smoke test: garden CRUD, plot layout, plant instances, harvests, tasks, search
4. Verify no API response shape changes (frontend compatibility)
