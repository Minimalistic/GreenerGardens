# GardenVault V1 — Gap Analysis

> Comparison of the comprehensive V1 architecture prompt against current implementation.
> Last updated: 2026-02-28

## Summary

| Phase | Plan File | Status | Notes |
|-------|-----------|--------|-------|
| **Phase 1 (Foundation)** | `01-phase1-completion.md` | COMPLETE | Schema, settings, Docker, .env, history improvements |
| **Phase 2a (Weather & Tasks)** | `02a-weather-tasks.md` | COMPLETE | Weather API, dashboard widget, background jobs, task system |
| **Phase 2b (Calendar & Succession)** | `02b-calendar-succession.md` | COMPLETE | Planting calendar, succession planting, seed starting |
| **Phase 3 (Quick Wins)** | `03-quick-wins.md` | COMPLETE | Dark mode, PWA, SQLite export — low deps, high impact |
| **Phase 4 (Seed Data Enrichment)** | `04-seed-data-enrichment.md` | 0% | Backfill catalog fields, expand 96→200+ plants. Parallel-safe. |
| **Phase 5a (LLM Assistant)** | `05a-llm-assistant.md` | 0% | Chat with context, proactive insights |
| **Phase 5b (Companion/Rotation/Pest)** | `05b-companion-rotation-pest.md` | 0% | Companion warnings, rotation engine, pest/soil, notes, search/tags |
| **Phase 6 (Polish & Power)** | `06-polish-power.md` | 0% | Timeline scrubber, table views, analytics, sun/shade, seed inventory, cost tracking |

## Dependency Graph

```
Phase 1 (DONE)
  ├── Phase 2a (DONE)
  │     └── Phase 2b (DONE)
  ├── Phase 3 (DONE)
  ├── Phase 4 (Seed Data Enrichment) — can run in parallel with anything
  ├── Phase 5a (LLM Assistant) — enhanced by Phase 2a weather data
  └── Phase 5b (Companion/Rotation/Pest) — needs Phase 2a tasks + Phase 4 seed data
        └── Phase 6 (Polish & Power) — needs most prior phases
```

## Parallelization Opportunities

These phases can be worked on simultaneously by different agents:
- **Phase 3** (Quick Wins) can start immediately — no dependency on Phase 2
- **Phase 4** (Seed Data Enrichment) is data-only work, can run in parallel with everything
- **Phase 5a** (LLM Assistant) can start after Phase 1, works better with Phase 2a data

---

## ~~Phase 2a Gaps — Weather & Tasks~~ COMPLETE

All items implemented: weather tables + API, dashboard widget, background fetch job, task CRUD + page, YNAB-style nudges.

## ~~Phase 2b Gaps — Calendar & Succession~~ COMPLETE

All items implemented: calendar engine (frost dates + catalog data), calendar page with monthly grid, planting suggestions, auto-task generation on plant instance creation, succession planting endpoint.

## ~~Phase 3 Gaps — Quick Wins~~ COMPLETE

All items implemented: dark mode (light/dark/system toggle in header), PWA (manifest, service worker, offline caching), SQLite database export from Settings page.

## Phase 4 Gaps — Seed Data

1. Seed data has 96 plants (spec targets 200-300)
2. Many plants missing timing fields needed for calendar engine
3. Companion data is name arrays, not structured objects with relationship types
4. Some plants missing rotation_family assignments

## Phase 5a Gaps — LLM Assistant

1. No Anthropic API integration
2. No chat interface
3. No context builder
4. No proactive insight cards

## Phase 5b Gaps — Intelligence

1. Companion planting warnings in layout editor (data partially exists in catalog)
2. Crop rotation engine and visualization
3. Pest/disease tracking (no `pest_events` table)
4. Soil test logging (no `soil_tests` table)
5. Notes only as fields, not first-class entities
6. Global search across all entities
7. Tag system

## Phase 6 Gaps — Polish & Power

1. Interactive timeline scrubber with past-state reconstruction
2. Table/spreadsheet views for all entity types
3. Advanced harvest analytics (basic stats exist)
4. Weather historical comparison
5. Background image support for layout editor
6. Sun/shade calculation engine
7. Layer system for layout (sun, water, pest, soil, companion, rotation, harvest)
8. Seed inventory management (no `seed_inventory` table)
9. Cost tracking (no `cost_entries` table)
10. Backup automation (extends Phase 3 SQLite export)
11. Print/PDF reports

---

## Cross-Cutting Gaps (remaining)

| Gap | Impact | Addressed In |
|-----|--------|--------------|
| No FAB (floating action button) | Quick-log requires navigating to specific pages | Phase 2a+ |
| No WebSocket support | Needed for live camera feeds, real-time updates | Phase 6+ |
| ~~No background job system~~ | ~~Needed for weather fetch~~ — done via setInterval in Phase 2a | ~~Phase 2a~~ |
| No file upload/photo system | Spec wants photos on harvests, pest events, notes | Phase 5b+ |
