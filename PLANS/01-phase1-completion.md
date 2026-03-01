# Phase 1 Completion Plan — "Digital Garden Journal" Polish

> **STATUS: COMPLETE** (2026-02-28)
>
> All items implemented: migration 002, settings page, Docker, .env, history middleware improvements.
> TypeScript compiles with 0 errors. Vite builds successfully. Runtime verified.

## Prerequisites
- Node.js v20 (`/opt/homebrew/opt/node@20/bin` on PATH)
- Current codebase runs with `npm run dev`

## Context for AI Agents
- **Monorepo**: `packages/backend` (Fastify), `packages/frontend` (React/Vite), `packages/shared` (Zod schemas)
- **Architecture**: Repository → Service → Route (backend), Pages → Hooks (TanStack Query v5) → API client (frontend)
- **DB**: SQLite via `better-sqlite3`, WAL mode, FK enforcement
- **Shared schemas**: Zod as single source of truth
- Refer to `PLANS/00-gap-analysis.md` for full gap details

---

## Step 1: Database Schema Migration

Create `packages/backend/src/db/migrations/002_phase1_completion.sql`:

### 1a. Add missing columns to existing tables

```sql
-- gardens
ALTER TABLE gardens ADD COLUMN total_area_sqft REAL;
ALTER TABLE gardens ADD COLUMN settings TEXT DEFAULT '{}';

-- plots
ALTER TABLE plots ADD COLUMN is_covered INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plots ADD COLUMN retired_at TEXT;
ALTER TABLE plots ADD COLUMN tags TEXT DEFAULT '[]';

-- plant_instances
ALTER TABLE plant_instances ADD COLUMN expected_harvest_date TEXT;
ALTER TABLE plant_instances ADD COLUMN actual_harvest_date TEXT;
ALTER TABLE plant_instances ADD COLUMN seed_depth_inches REAL;
ALTER TABLE plant_instances ADD COLUMN spacing_inches REAL;
ALTER TABLE plant_instances ADD COLUMN tags TEXT DEFAULT '[]';

-- history_log
ALTER TABLE history_log ADD COLUMN notes TEXT;
```

### 1b. Add missing plant_catalog columns

```sql
ALTER TABLE plant_catalog ADD COLUMN genus TEXT;
ALTER TABLE plant_catalog ADD COLUMN gdd_to_maturity REAL;
ALTER TABLE plant_catalog ADD COLUMN seeds_per_foot REAL;
ALTER TABLE plant_catalog ADD COLUMN thin_to_inches REAL;
ALTER TABLE plant_catalog ADD COLUMN transplant_weeks_after_last_frost INTEGER;
ALTER TABLE plant_catalog ADD COLUMN succession_planting_interval_days INTEGER;
ALTER TABLE plant_catalog ADD COLUMN harvest_window_days INTEGER;
ALTER TABLE plant_catalog ADD COLUMN harvest_indicators TEXT;
ALTER TABLE plant_catalog ADD COLUMN expected_yield_per_plant REAL;
ALTER TABLE plant_catalog ADD COLUMN yield_unit TEXT;
ALTER TABLE plant_catalog ADD COLUMN storage_life_days INTEGER;
ALTER TABLE plant_catalog ADD COLUMN storage_method TEXT;
ALTER TABLE plant_catalog ADD COLUMN is_perennial INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plant_catalog ADD COLUMN chill_hours_required INTEGER;
ALTER TABLE plant_catalog ADD COLUMN years_to_first_fruit INTEGER;
ALTER TABLE plant_catalog ADD COLUMN pruning_season TEXT;
ALTER TABLE plant_catalog ADD COLUMN pruning_notes TEXT;
ALTER TABLE plant_catalog ADD COLUMN pollination_type TEXT;
ALTER TABLE plant_catalog ADD COLUMN pollination_partners TEXT DEFAULT '[]';
ALTER TABLE plant_catalog ADD COLUMN common_pests TEXT DEFAULT '[]';
ALTER TABLE plant_catalog ADD COLUMN common_diseases TEXT DEFAULT '[]';
ALTER TABLE plant_catalog ADD COLUMN disease_resistance TEXT DEFAULT '{}';
ALTER TABLE plant_catalog ADD COLUMN rotation_notes TEXT;
ALTER TABLE plant_catalog ADD COLUMN nitrogen_fixer INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plant_catalog ADD COLUMN heavy_feeder INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plant_catalog ADD COLUMN varieties TEXT DEFAULT '[]';
ALTER TABLE plant_catalog ADD COLUMN culinary_notes TEXT;
ALTER TABLE plant_catalog ADD COLUMN preservation_methods TEXT DEFAULT '[]';
ALTER TABLE plant_catalog ADD COLUMN tags TEXT DEFAULT '[]';
```

### 1c. Fix history_log indexes

```sql
DROP INDEX IF EXISTS idx_history_entity;
CREATE INDEX idx_history_entity ON history_log(entity_type, entity_id, timestamp);
CREATE INDEX idx_history_type_time ON history_log(entity_type, timestamp);
```

### Implementation notes:
- Update `packages/backend/src/db/connection.ts` to run migration 002 (check the migration runner pattern)
- Update the Zod schemas in `packages/shared/` to include the new fields
- Update repositories and services as needed
- Update seed data if possible (add new fields to existing plant entries)

---

## Step 2: Environment Configuration

### 2a. Add dotenv support
- Install `dotenv` in `packages/backend`
- Create `.env.example` with:
  ```
  PORT=3000
  DATABASE_PATH=./data/gardenvault.db
  # OPENWEATHER_API_KEY=  (Phase 2)
  # ANTHROPIC_API_KEY=    (Phase 3)
  ```
- Update `packages/backend/src/db/connection.ts` to use `process.env.DATABASE_PATH`
- Add `.env` to `.gitignore`

---

## Step 3: Settings Page

### 3a. Backend: Settings API
- `GET /api/v1/settings` — returns garden settings (pulls from `gardens.settings` JSON column + garden fields)
- `PATCH /api/v1/settings` — updates garden settings

Settings payload should include:
- Garden name, address, lat/lon, timezone, USDA zone, frost dates
- Display preferences (temperature unit, measurement unit, date format)
- Feature toggles (for Phase 3/4 features — store now, UI later)

### 3b. Frontend: Settings page
- Add `/settings` route to App.tsx
- Add "Settings" link to sidebar (gear icon)
- Sections:
  - **Garden Info**: Edit name, location, zone, frost dates (same fields as setup wizard but editable)
  - **Display Preferences**: Temperature (F/C), measurements (imperial/metric)
- Keep it simple for now — advanced feature toggles come in later phases

---

## Step 4: Docker Deployment

### 4a. Create `Dockerfile` at project root
- Multi-stage build: build frontend → build backend → production image
- Node.js 20 Alpine base
- Copy built frontend into backend's static serving directory
- Expose port 3000
- Volume mount for `/data` (SQLite DB + uploads)

### 4b. Create `docker-compose.yml` at project root
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - db-data:/data
      - uploads:/uploads
    environment:
      - PORT=3000
      - DATABASE_PATH=/data/gardenvault.db
    restart: unless-stopped

volumes:
  db-data:
  uploads:
```

### 4c. Create `.dockerignore`
- `node_modules`, `.git`, `data/`, `.env`

---

## Step 5: Minor Fixes

### 5a. History middleware improvements
- Accept optional `notes` parameter in `logCreate`, `logUpdate`, `logDelete`
- Store full snapshot in `snapshot_json` for updates too (not just creates/deletes)
- Make `changed_by` configurable (pass through from request context)

### 5b. Update shared Zod schemas
- Add all new columns to their respective schemas
- Ensure create/update schemas have the new optional fields

### 5c. Update frontend forms
- Plot creation/edit: add `is_covered` toggle, `tags` input
- Plant instance: show expected/actual harvest dates
- Plant catalog detail page: show new fields when present

---

## Verification Checklist

- [ ] Migration 002 runs without errors on existing database
- [ ] All Zod schemas updated and TypeScript compiles with 0 errors
- [ ] Settings page loads and can edit garden info
- [ ] `docker-compose up` starts the app successfully
- [ ] Existing functionality (layout, catalog, planting, harvests) still works
- [ ] `.env.example` documented
- [ ] Vite builds successfully
