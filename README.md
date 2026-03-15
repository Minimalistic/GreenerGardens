# GreenerGardens

A self-hosted digital garden journal for planning, tracking, and optimizing your garden. Manage plants, plots, harvests, weather, and more — with AI-powered recommendations.

Built with TypeScript, React, Fastify, and SQLite in a clean monorepo architecture.

## Features

- **Garden Layout Editor** — Interactive canvas-based plot designer with drag-and-drop, sub-plot grids, and plant assignment (built with React-Konva)
- **Plant Catalog** — 200+ plant varieties with USDA zone filtering, companion planting data, frost dates, and detailed cultivation info
- **Harvest Tracking** — Log yields with quantity, quality, and destination (eaten fresh, preserved, shared, composted)
- **Weather Integration** — OpenWeather API forecasts with frost/heat alerts and seasonal planting recommendations
- **AI Assistant** — Claude-powered gardening advisor with full garden context (streaming responses)
- **Task Management** — Seasonal task generation, priority tracking, and calendar view
- **Companion Planting Engine** — Auto-suggests compatible plants based on beneficial relationships
- **Crop Rotation** — Tracks plant families and suggests rotation schedules across seasons
- **Pest & Disease Logging** — Photo-based pest tracking with treatment notes and a reference catalog
- **Seed Inventory** — Track seed varieties, quantities, sources, and storage locations
- **Cost Tracking** — Log expenses per plant, plot, or garden with analytics
- **Progressive Web App** — Installable, offline-capable, with push notifications
- **Dark/Light Theme** — System-aware with manual toggle

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, TanStack Query, React Router 7, Radix UI, Recharts, Tailwind CSS |
| Backend | Fastify 5, TypeScript, Zod validation |
| Database | SQLite (better-sqlite3) with 17 migrations |
| Shared | Zod schemas + TypeScript types (monorepo package) |
| AI | Anthropic Claude SDK (streaming) |
| DevOps | Docker multi-stage build, Docker Compose |

## Getting Started

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- npm 9+

### Development

```bash
# Install dependencies
npm install

# Start frontend + backend in dev mode
npm run dev
```

Frontend runs on `http://localhost:5173` (Vite) and backend on `http://localhost:3000` (Fastify).

### Docker

```bash
docker-compose up
# App available at http://localhost:3000
```

### Configuration

Copy `.env.example` to `.env` and configure:

```
PORT=3000
DATABASE_PATH=./data/gardenvault.db
OPENWEATHER_API_KEY=your-key-here          # Optional: weather forecasts
ANTHROPIC_API_KEY=your-key-here            # Optional: AI assistant
```

VAPID keys for push notifications are auto-generated on first run.

## Project Structure

```
GreenerGardens/
├── packages/
│   ├── backend/           # Fastify REST API (38+ endpoints)
│   │   └── src/
│   │       ├── db/        # Migrations, repositories, seed data
│   │       ├── routes/    # Organized into 5 route groups
│   │       ├── services/  # 20+ business logic services
│   │       └── jobs/      # Weather fetch, auto-backup
│   ├── frontend/          # React SPA
│   │   └── src/
│   │       ├── pages/     # 18+ lazy-loaded views
│   │       ├── components/# Radix-based UI primitives
│   │       ├── hooks/     # 20+ custom React hooks
│   │       └── contexts/  # Garden, undo/redo, assistant
│   └── shared/            # Zod schemas & TypeScript types
├── seed_data/             # 200+ plants, pest catalog
├── Dockerfile             # Multi-stage production build
└── docker-compose.yml
```

## License

MIT
