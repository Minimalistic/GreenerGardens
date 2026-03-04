# Phase 2b Plan — Calendar & Succession — "Know When To Do What"

> **STATUS: COMPLETE** (2026-02-28)
>
> The planting calendar generates schedules from frost dates + catalog data. Succession planting and seed starting round out the planning experience.
> **Depends on**: Phase 2a (weather tables, task system, background jobs)
> Estimated scope: Medium (calendar engine, 1 new frontend page, extensions to existing task system)

## Context for AI Agents
- **Monorepo**: `packages/backend` (Fastify), `packages/frontend` (React/Vite), `packages/shared` (Zod schemas)
- **Pattern**: Repository → Service → Route (backend), Zod schema (shared), Page → Hook → API call (frontend)
- **DB**: SQLite via `better-sqlite3`, WAL mode
- **Prerequisite**: Phase 2a must be complete — `tasks` table and task service must exist
- **Plant catalog** has `indoor_start_weeks_before_frost`, `outdoor_sow_weeks_after_frost`, `transplant_weeks_after_last_frost`, `days_to_maturity_min/max`, `succession_planting_interval_days` columns
- **Garden** has `first_frost_date`, `last_frost_date`, `hardiness_zone` columns

---

## Step 1: Planting Calendar Engine (Backend)

### 1a. Calendar service (`packages/backend/src/services/calendar.service.ts`)
- Given a garden's frost dates and a list of planted/planned plant_instances:
  - For each plant, compute key dates using plant_catalog data:
    - Indoor start date = last_frost_date - (indoor_start_weeks_before_frost * 7 days)
    - Direct sow date = last_frost_date + (outdoor_sow_weeks_after_frost * 7 days)
    - Transplant date = last_frost_date + (transplant_weeks_after_last_frost * 7 days)
    - Expected harvest = planted_date + days_to_maturity_min
  - Return a calendar of events sorted by date

### 1b. Calendar routes
- `GET /api/v1/calendar?month=&year=` — get calendar events for a month
- `GET /api/v1/calendar/week` — get this week's events
- `GET /api/v1/calendar/suggestions` — "what can I plant now?" based on current date + zone

### 1c. Auto-generate tasks from calendar
- When a plant_instance is created, auto-generate relevant tasks:
  - "Transplant [plant] seedlings" (if started indoors)
  - "Begin hardening off [plant]" (1 week before transplant)
  - "Expected harvest for [plant]" (at maturity date)
- Mark auto-generated tasks with `auto_generated = 1` and `source_reason`

---

## Step 2: Calendar View Page (Frontend)

### 2a. Calendar page (`packages/frontend/src/pages/calendar.tsx`)
- Add route `/calendar` to App.tsx
- Add "Calendar" to sidebar nav (Calendar icon)
- Monthly calendar grid showing:
  - Planting events (green dots)
  - Harvest windows (orange bars)
  - Task due dates (blue dots)
  - Weather alerts (red dots for frost)
- Click a day → expand to show all events for that day
- Navigation: previous/next month, today button

### 2b. Calendar hook
- `packages/frontend/src/hooks/use-calendar.ts`
- `useCalendarEvents(month, year)` — fetches all events for display

---

## Step 3: Succession Planting

### 3a. Backend logic
- When creating a plant_instance with a plant that has `succession_planting_interval_days` set:
  - Offer to auto-create follow-up plant_instances at regular intervals
- API: `POST /api/v1/plant-instances/succession` — create a series of staggered plantings
  - Params: plant_catalog_id, plot_id, start_date, interval_days, count

### 3b. Frontend
- In the plant placement flow, if the selected plant supports succession planting, show:
  - "Plant lettuce every 14 days? How many rounds?" with slider/input
  - Preview dates before confirming

---

## Step 4: Seed Starting Tracker

### 4a. Extend plant_instance status values
- Ensure these statuses exist (add to enum if missing): `seed_started`, `germinated`, `hardening_off`
- The existing lifecycle tracking (date_planted, date_germinated, date_transplanted) supports this

### 4b. Seed starting view
- Filter plant_instances by status `seed_started` or `seedling`
- Show progress indicator per plant: started → germinated → true leaves → hardening off → transplanted
- Link to auto-generated tasks for each milestone

---

## Verification Checklist

- [ ] Calendar engine computes correct dates from frost dates + plant catalog
- [ ] Calendar page shows planting events, harvests, and task due dates
- [ ] "What can I plant now?" suggestions work based on zone and date
- [ ] Auto-generated tasks appear when new plant instances are created
- [ ] Succession planting creates staggered plant_instances correctly
- [ ] Seed starting tracker shows lifecycle progress
- [ ] TypeScript compiles with 0 errors, Vite builds successfully
