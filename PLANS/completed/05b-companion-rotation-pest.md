# Phase 5b Plan — Companion, Rotation, Pest, Notes & Search — "The Garden Knows Things"

> Data-driven intelligence features: companion planting warnings, crop rotation engine, pest/disease tracking, soil test logging, first-class notes, photo uploads, frost/weather alerts, seasonal planting guide, and global search with tags.
> **Depends on**: Phase 2a (tasks table exists), Phase 4 (seed data enrichment — companion data upgraded)
> Estimated scope: Large (5+ new tables, multiple new CRUD modules, file upload infrastructure, search infrastructure)

## Context for AI Agents
- **Monorepo**: `packages/backend` (Fastify), `packages/frontend` (React/Vite), `packages/shared` (Zod schemas)
- **Pattern**: Repository → Service → Route (backend), Zod schema (shared), Page → Hook → API call (frontend)
- **DB**: SQLite via `better-sqlite3`, WAL mode
- **Plant catalog** has `companions_json`, `antagonists_json` (structured format from Phase 4), and `rotation_family` fields
- **Layout editor** uses react-konva — companion warnings will integrate with the canvas
- **Weather job** already runs on a schedule in `packages/backend/src/jobs/weather-fetch.job.ts`
- **PWA service worker** already configured via `vite-plugin-pwa`
- **Calendar service** has planting timing data from Phase 2b/4 — timing fields on all 200 plants

---

## Step 1: File Upload Infrastructure

Photo support is needed by pest events, notes, soil tests, garden layout backgrounds (Phase 6), and seed inventory (Phase 6). Build the upload system first so all subsequent features can use it.

### 1a. Database — uploads table
```sql
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_uploads_entity ON uploads(entity_type, entity_id);
```

### 1b. Backend upload service (`packages/backend/src/services/upload.service.ts`)
- Register `@fastify/multipart` for file uploads
- Store files in `./data/uploads/` directory (configurable via `UPLOAD_PATH` env)
- Generate unique filenames with original extension preserved
- Validate: max 10MB per file, allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Auto-create `./data/uploads/` directory on startup if missing
- Optional: generate thumbnails (200px wide) for gallery views using `sharp`

### 1c. Upload API
- `POST /api/v1/uploads` — multipart file upload, returns upload record with ID and URL
- `GET /api/v1/uploads/:id` — get upload metadata
- `DELETE /api/v1/uploads/:id` — delete file and record
- `GET /api/v1/uploads/entity/:entityType/:entityId` — list uploads for an entity

### 1d. Static file serving
- Serve `./data/uploads/` via `@fastify/static` at `/uploads/` path
- Add to existing static file setup in server.ts

### 1e. Frontend upload component
- `packages/frontend/src/components/ui/file-upload.tsx` — reusable drag-and-drop + click-to-upload component
- Shows preview thumbnails for images
- Progress indicator during upload
- Used by pest event form, notes form, soil test form

---

## Step 2: Database Schema — Migration

Create migration with pest_events, soil_tests, notes, tags, uploads tables:

### Pest events table
```sql
CREATE TABLE IF NOT EXISTS pest_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  pest_type TEXT NOT NULL DEFAULT 'other',
  pest_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  detected_date TEXT NOT NULL,
  resolved_date TEXT,
  treatment_applied TEXT,
  treatment_type TEXT DEFAULT 'none',
  outcome TEXT DEFAULT 'ongoing',
  photos TEXT DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pest_events_entity ON pest_events(entity_type, entity_id);
CREATE INDEX idx_pest_events_date ON pest_events(detected_date);
CREATE INDEX idx_pest_events_outcome ON pest_events(outcome);
```

### Soil tests table
```sql
CREATE TABLE IF NOT EXISTS soil_tests (
  id TEXT PRIMARY KEY,
  plot_id TEXT NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  test_date TEXT NOT NULL,
  ph REAL,
  nitrogen_ppm REAL,
  phosphorus_ppm REAL,
  potassium_ppm REAL,
  organic_matter_pct REAL,
  calcium_ppm REAL,
  magnesium_ppm REAL,
  moisture_level TEXT,
  amendments_applied TEXT DEFAULT '[]',
  lab_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_soil_tests_plot ON soil_tests(plot_id);
CREATE INDEX idx_soil_tests_date ON soil_tests(test_date);
```

### Notes table (first-class entity)
```sql
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  entity_links TEXT DEFAULT '[]',
  photo_ids TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notes_created ON notes(created_at DESC);
```

### Tags tables (normalized)
```sql
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS entity_tags (
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  PRIMARY KEY (tag_id, entity_type, entity_id)
);

CREATE INDEX idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
```

### Implementation notes:
- Add Zod schemas for all new tables (including uploads)
- Add enums: PestTypeEnum, SeverityEnum, TreatmentTypeEnum, OutcomeEnum, MoistureLevelEnum, NoteContentTypeEnum
- Register pest_events, soil_tests, notes with history_log middleware
- Include uploads table in this migration (from Step 1)

---

## Step 3: Companion Planting Engine

### 3a. Companion planting service (`packages/backend/src/services/companion.service.ts`)
- `getCompanions(plantCatalogId)` — returns good/bad companions with relationship details
- `checkCompatibility(plantCatalogId, neighborPlantCatalogIds[])` — returns compatibility report
- `suggestCompanions(plantCatalogId, existingPlotPlants[])` — suggest what to plant nearby

### 3b. Companion planting API
- `GET /api/v1/companion/check?plant=ID&neighbors=ID1,ID2` — check compatibility
- `GET /api/v1/companion/suggestions?plant=ID&plot=PLOT_ID` — get suggestions based on what's already planted nearby

### 3c. Frontend integration in Garden Layout
- When placing a plant in a sub-plot, show companion indicators:
  - Green glow on adjacent cells with good companions
  - Red glow on adjacent cells with bad companions
- Tooltip on hover: "Basil improves tomato flavor and repels aphids"
- Warning dialog if placing antagonistic plants adjacent
- Suggestion panel: "Consider adding basil nearby — it helps tomatoes"

---

## Step 4: Crop Rotation Engine

### 4a. Rotation service (`packages/backend/src/services/rotation.service.ts`)
- `getPlotHistory(plotId, years)` — what rotation families were in this plot per year
- `checkRotation(plotId, plantCatalogId)` — check if planting this violates rotation rules
  - Default rule: don't plant same family in same plot within 3 years
  - Returns: `ok`, `warning` (2 years), `violation` (1 year or same year)
- `suggestPlots(plantCatalogId, gardenId)` — which plots are safe for this plant

### 4b. Rotation API
- `GET /api/v1/rotation/check?plot=ID&plant=CATALOG_ID` — rotation check
- `GET /api/v1/rotation/history?plot=ID&years=5` — plot planting history by family
- `GET /api/v1/rotation/suggest?plant=CATALOG_ID` — best plots for this plant

### 4c. Frontend
- Rotation warning in plant placement flow: "Tomatoes (nightshade) were in this bed last year. Consider waiting 2 more years."
- Plot detail page: color-coded strip showing rotation families by year
- Optional: rotation planner matrix view (plots × years)

---

## Step 5: Pest & Disease Tracking

### 5a. Backend (follow standard pattern)
- Repository, service, routes for pest_events
- Routes:
  - `GET /api/v1/pest-events` — list (filterable by entity, pest_type, outcome, date range)
  - `POST /api/v1/pest-events` — create
  - `GET /api/v1/pest-events/:id` — details
  - `PATCH /api/v1/pest-events/:id` — update (add treatment, resolve)
  - `DELETE /api/v1/pest-events/:id` — delete
  - `GET /api/v1/pest-events/history?plot=ID` — pest history for a plot

### 5b. Frontend
- "Report Pest" page/dialog accessible from plant instance detail and plot detail
- Photo upload integration — attach photos when reporting (uses Step 1 upload infrastructure)
- Pest event list view with severity badges and outcome status
- Treatment log within each pest event (treatment applied, type, date, photos)
- Photo gallery view for pest event (before/during/after treatment)
- Add "Report Pest" to quick-log buttons on dashboard

---

## Step 6: Soil Test Logging

### 6a. Backend
- Repository, service, routes for soil_tests
- Routes:
  - `GET /api/v1/soil-tests?plot=ID` — list for a plot
  - `POST /api/v1/soil-tests` — create
  - `GET /api/v1/soil-tests/:id` — details
  - `PATCH /api/v1/soil-tests/:id` — update
  - `DELETE /api/v1/soil-tests/:id` — delete
  - `GET /api/v1/soil-tests/trends?plot=ID` — pH and nutrient trends over time

### 6b. Frontend
- Soil test form on plot detail page
- Photo upload for soil test results (lab reports, test strip photos)
- Trend chart showing pH/nutrients over time per plot (use recharts or similar)
- Amendment recommendations based on readings (e.g., "pH 5.5 — consider adding lime")
- Color-coded indicators: green/yellow/red for each nutrient vs ideal range

---

## Step 7: Notes System

### 7a. Backend
- Repository, service, routes for notes
- Notes can link to multiple entities via `entity_links` JSON: `[{"entity_type": "plot", "entity_id": "uuid"}, ...]`
- Routes:
  - `GET /api/v1/notes` — list all notes (paginated, filterable)
  - `POST /api/v1/notes` — create note
  - `GET /api/v1/notes/:id` — get note
  - `PATCH /api/v1/notes/:id` — update note
  - `DELETE /api/v1/notes/:id` — delete note
  - `GET /api/v1/notes/entity/:entityType/:entityId` — get notes linked to an entity

### 7b. Frontend
- Notes section on plot detail, plant instance detail, harvest detail pages
- Notes timeline view (all notes chronologically) — accessible from sidebar as `/notes`
- Rich text input (basic: bold, italic, lists) — use a simple markdown editor
- Photo attachment support via file upload component (Step 1)
- Inline photo gallery display within notes
- Pin important notes to the top of entity detail pages

---

## Step 8: Global Search & Tags

### 8a. Search service (`packages/backend/src/services/search.service.ts`)
- Full-text search across: plant names, plot names, notes content, task titles, pest names, tag names
- SQLite FTS5 virtual table for efficient full-text search, OR simpler LIKE queries for V1
- Results grouped by entity type

### 8b. Search API
- `GET /api/v1/search?q=QUERY` — global search

### 8c. Tags service
- CRUD for tags
- `GET /api/v1/tags` — list all tags
- `POST /api/v1/tags` — create tag
- `POST /api/v1/tags/:id/entities` — link tag to entity
- `DELETE /api/v1/tags/:id/entities/:entityType/:entityId` — unlink
- `GET /api/v1/tags/:id/entities` — get all entities with this tag

### 8d. Frontend
- Global search bar in header (accessible from every page)
- Search results page grouped by type
- Tag management in settings
- Tag chips on entity cards, clickable to filter

---

## Step 9: Frost & Weather Alerts

Leverage the existing weather fetch job and active plant data to protect gardens from surprise frosts and extreme conditions.

### 9a. Alert service (`packages/backend/src/services/alert.service.ts`)
- `checkFrostAlert(gardenId)` — called after each weather fetch
  - Compare tomorrow's forecast low vs garden's active plants' cold tolerance
  - If forecast low is at or below 36°F (configurable threshold), generate alert
  - Consider plant-specific tolerance: some plants (kale, spinach) are cold-hardy, tomatoes are not
- `checkHeatAlert(gardenId)` — if forecast high exceeds 95°F, warn about heat-sensitive crops
- `checkWateringAlert(gardenId)` — if no rain in 5+ days and temps above 80°F, suggest watering

### 9b. Integration with weather fetch job
- After each weather data fetch in `weather-fetch.job.ts`, run alert checks
- Create auto-generated tasks with high priority for frost/heat/watering alerts
- Set task type to `frost_alert`, `heat_alert`, `watering_reminder`
- Avoid duplicate alerts: check if an active alert task already exists for the same date before creating

### 9c. Frontend
- Alert banner on dashboard when frost/heat alerts are active
- Frost alert shows: forecast temperature, list of at-risk plants, suggested actions (cover, harvest, bring inside)
- Configurable alert thresholds in garden settings (frost temp, heat temp, dry days)

---

## Step 10: Seasonal Planting Guide — "What to Plant Now"

Use the plant catalog timing data (Phase 4) and garden zone/frost dates (Phase 1) to show a curated seasonal guide.

### 10a. Planting guide service (`packages/backend/src/services/planting-guide.service.ts`)
- `getPlantingGuide(gardenId, date?)` — for the given date (default: today), determine:
  - **Start Indoors Now**: plants whose `indoor_start_weeks_before_frost` window includes this week
  - **Direct Sow Now**: plants whose `outdoor_sow_weeks_after_frost` window includes this week
  - **Transplant Now**: plants whose `transplant_weeks_after_last_frost` window includes this week
  - **Coming Up Next**: plants whose windows start within the next 2-4 weeks
  - **Harvest Soon**: active plant instances approaching `days_to_maturity` completion
- Uses garden's `last_frost_date` and `first_frost_date` to calculate actual calendar dates
- Filters to plants appropriate for the garden's USDA zone

### 10b. Planting guide API
- `GET /api/v1/planting-guide?garden_id=ID&date=ISO` — get guide for a date
- `GET /api/v1/planting-guide/upcoming?garden_id=ID&weeks=4` — upcoming windows

### 10c. Frontend
- Add a "What to Plant" section/card to the dashboard — prominent, seasonal content
- Grouped display: "Start Indoors", "Direct Sow", "Transplant", "Harvest Soon"
- Each plant entry shows: name, recommended action, days remaining in the window
- Quick action: click a plant to create a plant instance directly from the guide
- Also accessible from calendar page as an overlay/sidebar panel

---

## Verification Checklist

- [ ] File upload works: upload, retrieve, delete images
- [ ] Migration runs cleanly (includes uploads table)
- [ ] Companion planting warnings appear in plant placement flow
- [ ] Crop rotation check warns when planting same family too soon
- [ ] Pest events can be created with photos, updated, and resolved
- [ ] Soil tests can be logged per plot with trend display and color indicators
- [ ] Notes can be created with photos and linked to entities
- [ ] Global search returns results across entity types
- [ ] Tags can be created and applied to entities
- [ ] Frost/weather alerts generate tasks from forecast data
- [ ] Seasonal planting guide shows correct plants for current date/zone
- [ ] All new entity types write to history_log
- [ ] TypeScript compiles with 0 errors, Vite builds successfully
