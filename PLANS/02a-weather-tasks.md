# Phase 2a Plan — Weather & Tasks — "What's Happening Now"

> **STATUS: COMPLETE (2026-02-28)**

> Weather data flows in and a task system keeps the user on track. This is the foundation for time-awareness.
> **Depends on**: Phase 1 completion (schema migration, .env support)
> Estimated scope: Medium-Large (new tables, background jobs, weather API, 1 new frontend page)

## Context for AI Agents
- **Monorepo**: `packages/backend` (Fastify), `packages/frontend` (React/Vite), `packages/shared` (Zod schemas)
- **Pattern**: New features follow Repository → Service → Route (backend), Zod schema (shared), Page → Hook → API call (frontend)
- **DB**: SQLite via `better-sqlite3`, WAL mode. Migrations in `packages/backend/src/db/migrations/`
- **Existing tables**: gardens, plots, sub_plots, plant_catalog, plant_instances, harvests, history_log
- **Frontend routing**: `packages/frontend/src/App.tsx` — add new routes here
- **Sidebar nav**: `packages/frontend/src/components/layout/sidebar.tsx` — add nav links here
- Weather API key will come from `process.env.OPENWEATHER_API_KEY` (.env file)

---

## Step 1: Database Schema — Migration 003

Create `packages/backend/src/db/migrations/003_weather_tasks.sql`:

### Weather tables
```sql
CREATE TABLE IF NOT EXISTS weather_readings (
  id TEXT PRIMARY KEY,
  garden_id TEXT NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'api_current',
  temperature_f REAL,
  feels_like_f REAL,
  humidity_pct REAL,
  wind_speed_mph REAL,
  wind_direction TEXT,
  precipitation_inches REAL,
  precipitation_type TEXT DEFAULT 'none',
  cloud_cover_pct REAL,
  uv_index REAL,
  dew_point_f REAL,
  pressure_inhg REAL,
  sunrise TEXT,
  sunset TEXT,
  day_length_hours REAL,
  gdd_base50 REAL,
  raw_api_response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_weather_garden_time ON weather_readings(garden_id, timestamp);

CREATE TABLE IF NOT EXISTS weather_daily_summary (
  id TEXT PRIMARY KEY,
  garden_id TEXT NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  high_f REAL,
  low_f REAL,
  avg_f REAL,
  precipitation_total_inches REAL,
  gdd_accumulated REAL,
  frost_occurred INTEGER NOT NULL DEFAULT 0,
  freeze_occurred INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_weather_daily_garden_date ON weather_daily_summary(garden_id, date);
```

### Tasks table
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  entity_type TEXT,
  entity_id TEXT,
  task_type TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  completed_date TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_rule TEXT DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  auto_generated INTEGER NOT NULL DEFAULT 0,
  source_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_entity ON tasks(entity_type, entity_id);
```

### Implementation notes:
- Register migration in the migration runner
- Add Zod schemas for weather_readings, weather_daily_summary, tasks in `packages/shared/`
- Add enums: TaskTypeEnum, TaskPriorityEnum, TaskStatusEnum, WeatherSourceEnum, PrecipitationTypeEnum

---

## Step 2: Weather API Integration (Backend)

### 2a. Weather service (`packages/backend/src/services/weather.service.ts`)
- Use OpenWeatherMap API (free tier: 1000 calls/day)
  - Current weather: `https://api.openweathermap.org/data/2.5/weather`
  - 5-day forecast: `https://api.openweathermap.org/data/2.5/forecast`
- Map API response to `weather_readings` schema
- Calculate GDD: `max(0, (high + low) / 2 - 50)`
- Store raw API response in `raw_api_response` column
- Graceful degradation: if API key not configured or API unreachable, return cached data with staleness indicator

### 2b. Weather repository (`packages/backend/src/db/repositories/weather.repository.ts`)
- `insertReading(reading)` — store weather reading
- `getLatestReading(gardenId)` — current conditions
- `getReadingsByDateRange(gardenId, startDate, endDate)` — historical queries
- `upsertDailySummary(summary)` — update daily rollup
- `getDailySummaries(gardenId, startDate, endDate)` — for charts

### 2c. Weather routes (`packages/backend/src/routes/weather.routes.ts`)
- `GET /api/v1/weather/current` — latest conditions (fetch from API if stale > 30min)
- `GET /api/v1/weather/forecast` — 5-day forecast
- `GET /api/v1/weather/history?start=&end=` — historical readings
- `GET /api/v1/weather/daily-summary?start=&end=` — daily summaries
- `POST /api/v1/weather/refresh` — force refresh from API

### 2d. Background weather fetch
- Install `node-cron` in backend
- Create `packages/backend/src/jobs/weather-fetch.job.ts`
- Schedule: fetch current weather every 30 minutes during configured hours
- Schedule: compute daily summary at end of each day
- On startup: fetch weather if last reading > 1 hour old
- Log fetch status but don't crash app if weather API fails

---

## Step 3: Weather Dashboard Widget (Frontend)

### 3a. Weather widget component
- `packages/frontend/src/components/garden/weather-widget.tsx`
- Shows: current temp, feels-like, humidity, wind, conditions icon
- 7-day mini forecast (just high/low + icon per day)
- Frost/freeze alert banner (prominent, red/orange) when forecast shows < 32°F
- "Last updated X min ago" indicator
- Graceful empty state if no weather data / API key not set

### 3b. Weather hook
- `packages/frontend/src/hooks/use-weather.ts`
- `useCurrentWeather()` — fetches current conditions
- `useForecast()` — fetches forecast
- `useWeatherHistory(startDate, endDate)` — historical data
- Refetch interval: 30 minutes for current, 2 hours for forecast

### 3c. Add weather widget to Dashboard page
- Place above or alongside existing stats cards

---

## Step 4: Task System (Backend)

### 4a. Task repository, service, routes
Follow existing pattern (base repository → service → route):

- `packages/backend/src/db/repositories/task.repository.ts`
- `packages/backend/src/services/task.service.ts`
- `packages/backend/src/routes/task.routes.ts`

### Routes:
- `GET /api/v1/tasks` — list tasks (filterable: status, priority, due_date range, entity)
- `POST /api/v1/tasks` — create task
- `GET /api/v1/tasks/:id` — get task details
- `PATCH /api/v1/tasks/:id` — update task
- `DELETE /api/v1/tasks/:id` — delete task
- `PATCH /api/v1/tasks/:id/complete` — mark complete (sets completed_date)
- `PATCH /api/v1/tasks/:id/skip` — mark skipped
- `GET /api/v1/tasks/overdue` — get overdue tasks

### 4b. Register tasks with history_log middleware
- Task creates, updates, deletes should write to history_log

---

## Step 5: Task Management Page (Frontend)

### 5a. Tasks page (`packages/frontend/src/pages/tasks.tsx`)
- Add route `/tasks` to App.tsx
- Add "Tasks" to sidebar nav (CheckSquare icon from lucide-react)
- Sections:
  - **Overdue** (red section) — tasks past due_date, not completed
  - **Today** — tasks due today
  - **This Week** — upcoming 7 days
  - **Later** — future tasks
- Each task card shows: title, due date, priority badge, linked entity, quick-complete button
- YNAB-style nudges for overdue: "You planned to [task]. Ready to log this, or want to reschedule?"
  - Quick actions: "Done", "Reschedule", "Skip"
- Create task button (manual tasks)
- Filter by: status, priority, task_type

### 5b. Task hooks
- `packages/frontend/src/hooks/use-tasks.ts`
- `useTasks(filters)`, `useOverdueTasks()`, `useCreateTask()`, `useCompleteTask()`, `useUpdateTask()`

### 5c. Dashboard integration
- Add "Today's Tasks" widget to dashboard (compact list, max 5 items)
- Show overdue count badge in sidebar nav

---

## Verification Checklist

- [ ] Migration 003 runs cleanly on existing database
- [ ] Weather API fetches and stores data correctly (test with real API key)
- [ ] Weather widget shows on dashboard with current conditions
- [ ] Frost alerts display when forecast shows freezing temps
- [ ] Tasks can be created, viewed, completed, and skipped
- [ ] Overdue tasks surface with YNAB-style nudges
- [ ] App still works with no weather API key (graceful degradation)
- [ ] Background weather fetch job runs on schedule
- [ ] TypeScript compiles with 0 errors, Vite builds successfully
- [ ] All new routes respond correctly
