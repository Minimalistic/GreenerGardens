# GardenVault V1 — Gap Analysis

> Comparison of the comprehensive V1 architecture prompt against current implementation.
> Last updated: 2026-03-01

## Summary

| Phase | Plan File | Status | Notes |
|-------|-----------|--------|-------|
| **Phase 1 (Foundation)** | `01-phase1-completion.md` | COMPLETE | Schema, settings, Docker, .env, history improvements |
| **Phase 2a (Weather & Tasks)** | `02a-weather-tasks.md` | COMPLETE | Weather API, dashboard widget, background jobs, task system |
| **Phase 2b (Calendar & Succession)** | `02b-calendar-succession.md` | COMPLETE | Planting calendar, succession planting, seed starting |
| **Phase 3 (Quick Wins)** | `03-quick-wins.md` | COMPLETE | Dark mode, PWA, SQLite export — low deps, high impact |
| **Phase 4 (Seed Data Enrichment)** | `04-seed-data-enrichment.md` | COMPLETE | 200 plants, structured companion data, emojis, rotation families |
| **Phase 5a (LLM Assistant)** | `05a-llm-assistant.md` | COMPLETE | Claude chat with context, streaming, conversation history |
| **Phase 5b (Companion/Rotation/Pest)** | `05b-companion-rotation-pest.md` | COMPLETE | All 10 components: uploads, companions, rotation, pest, soil, notes, search, tags, alerts, planting guide |
| **Phase 6a (Cleanup & Hardening)** | `06a-cleanup-hardening.md` | COMPLETE | TS fixes, test coverage, route splitting, settings split |
| **Phase 6 Step 0 (Infrastructure)** | `06-polish-power.md` Step 0 | COMPLETE | Code splitting, error boundaries, mobile nav, integration tests, push notifications |
| **Phase 6 Steps 1-9 (Features)** | `06-polish-power.md` Steps 1-9 | 0% | Timeline, table views, analytics, sun/shade, seeds, costs, backup, reports |

## Dependency Graph

```
Phase 1 (DONE)
  ├── Phase 2a (DONE)
  │     └── Phase 2b (DONE)
  ├── Phase 3 (DONE)
  ├── Phase 4 (DONE) — seed data enrichment
  ├── Phase 5a (DONE) — LLM assistant
  └── Phase 5b (DONE) — companion/rotation/pest/notes/search/tags/alerts/guide
        └── Phase 6a (DONE) — cleanup & hardening
              └── Phase 6 Step 0 (DONE) — infrastructure
                    └── Phase 6 Steps 1-9 (TODO) — power features
```

---

## ~~Phase 2a Gaps — Weather & Tasks~~ COMPLETE

All items implemented: weather tables + API, dashboard widget, background fetch job, task CRUD + page, YNAB-style nudges.

## ~~Phase 2b Gaps — Calendar & Succession~~ COMPLETE

All items implemented: calendar engine (frost dates + catalog data), calendar page with monthly grid, planting suggestions, auto-task generation on plant instance creation, succession planting endpoint.

## ~~Phase 3 Gaps — Quick Wins~~ COMPLETE

All items implemented: dark mode (light/dark/system toggle in header), PWA (manifest, service worker, offline caching), SQLite database export from Settings page.

## ~~Phase 4 Gaps — Seed Data~~ COMPLETE

All items implemented:
- 200 plants in catalog (was 96)
- Structured companion/antagonist data with relationship types and notes
- All plants have rotation_family assigned (43 families)
- Timing fields populated (days_to_maturity 100%, frost-relative fields where applicable)
- Emoji field added to every plant for visual identification in UI

## ~~Phase 5a Gaps — LLM Assistant~~ COMPLETE

All items implemented: Anthropic Claude API integration (claude-sonnet-4-6), chat interface with streaming, context builder (garden state, weather, plants, tasks), conversation management, quick prompt buttons, graceful degradation without API key.

## ~~Phase 5b Gaps — Intelligence~~ COMPLETE

All items implemented: file upload infrastructure, companion planting engine + API, crop rotation engine + API, pest/disease tracking with photos, soil test logging with trends, first-class notes with entity linking, global search (LIKE-based), tag system (normalized), frost/heat/watering alerts, seasonal planting guide ("What to Plant Now").

## ~~Phase 6a Gaps — Cleanup~~ COMPLETE

All items implemented: frontend TS errors fixed (0 errors), expanded integration test coverage (49 tests, 8 files), route registration split into 5 groups, settings page split into tabbed layout.

## ~~Phase 6 Step 0 — Infrastructure~~ COMPLETE

All items implemented: React.lazy code splitting, error boundaries, mobile nav redesign (4 primary + More), integration tests, push notifications (VAPID, subscription management, notification preferences).

## Phase 6 Steps 1-9 Gaps — Power Features

1. Interactive timeline scrubber with past-state reconstruction
2. Table/spreadsheet views for all entity types
3. Advanced harvest analytics (basic stats exist)
4. Weather historical comparison
5. Background image support for layout editor
6. Sun/shade calculation engine
7. Layer system for layout (sun, water, pest, soil, companion, rotation, harvest)
8. Seed inventory management (table exists from migration 006, basic CRUD exists)
9. Cost tracking (table exists from migration 006, basic CRUD exists)
10. Backup automation (extends Phase 3 SQLite export)
11. Print/PDF reports

---

## Cross-Cutting Gaps (remaining)

| Gap | Impact | Addressed In |
|-----|--------|--------------|
| No FAB (floating action button) | Quick-log requires navigating to specific pages | Phase 6+ |
| No WebSocket support | Needed for live camera feeds, real-time updates | Phase 6+ |
| ~~No background job system~~ | ~~Needed for weather fetch~~ — done via setInterval in Phase 2a | ~~Phase 2a~~ |
| ~~No file upload/photo system~~ | ~~Spec wants photos on harvests, pest events, notes~~ — done in Phase 5b | ~~Phase 5b~~ |
