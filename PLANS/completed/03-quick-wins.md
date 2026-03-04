# Phase 3 Plan — Quick Wins — "Low-Hanging Fruit"

> **STATUS: COMPLETE** (2026-02-28)
>
> These are high-impact, low-complexity features that can be done any time after Phase 1. They improve daily usability without requiring new data models.
> **Depends on**: Phase 1 completion only
> Estimated scope: Small-Medium (CSS changes, Vite plugin, one new API endpoint)

## Context for AI Agents
- **Monorepo**: `packages/backend` (Fastify), `packages/frontend` (React/Vite), `packages/shared` (Zod schemas)
- **CSS**: Tailwind v3 + shadcn/ui (already uses CSS variables in `packages/frontend/src/index.css`)
- **Build**: Vite in `packages/frontend/`
- **DB**: SQLite via `better-sqlite3`, WAL mode
- shadcn/ui already has dark mode support via CSS variables — just needs the dark class and theme toggle

---

## Step 1: Dark Mode

### 1a. CSS variables
- Define dark mode color palette in `packages/frontend/src/index.css` under `.dark` class
- shadcn/ui already uses CSS variables (hsl-based) — add the dark variants
- Ensure all custom styles (beyond shadcn components) also use CSS variables
- The shadcn `index.css` likely already has a `.dark` section — verify and extend if needed

### 1b. Theme provider
- Create `packages/frontend/src/components/theme-provider.tsx`
- React context that manages theme state: `light` | `dark` | `system`
- On mount: read preference from localStorage, apply `.dark` class to `<html>` element
- On `system`: listen for `prefers-color-scheme` media query changes
- Export `useTheme()` hook

### 1c. Theme toggle
- Add theme toggle button to the app header or settings page
- Three options: Light / Dark / System (auto)
- Use shadcn/ui DropdownMenu or Toggle component
- Store preference in localStorage key `gardenvault-theme`

### 1d. Verify dark mode coverage
- Test all existing pages in dark mode
- Fix any hardcoded colors (should be minimal if using shadcn/ui properly)
- Ensure garden layout canvas (react-konva) looks acceptable in dark mode

---

## Step 2: PWA Support

### 2a. Web app manifest
- Create `packages/frontend/public/manifest.json`:
  ```json
  {
    "name": "GardenVault",
    "short_name": "GardenVault",
    "description": "Digital Garden Journal",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#16a34a",
    "icons": [
      { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }
  ```

### 2b. Service worker via vite-plugin-pwa
- Install `vite-plugin-pwa` in frontend
- Configure in `vite.config.ts`:
  - Cache-first for static assets (JS, CSS, images)
  - Network-first for API calls (fall back to cached responses when offline)
  - Auto-update strategy (prompt user on new version)
- Generate app icons (192x192 and 512x512) — can use a simple green leaf/garden icon

### 2c. Offline behavior
- Core pages load from cache when offline
- API calls show cached data with "offline" indicator
- Weather, LLM features (future) show "unavailable offline" gracefully

### 2d. Add `<meta>` tags to `index.html`
- `<meta name="theme-color" content="#16a34a">`
- `<link rel="manifest" href="/manifest.json">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`

---

## Step 3: Data Export (SQLite Download)

### 3a. Export endpoint
- `GET /api/v1/export/database-file` — direct SQLite file download
- Use SQLite's backup API (`db.backup()` from better-sqlite3) to create a consistent snapshot
- Stream the backup file as a download (Content-Disposition: attachment)
- File name: `gardenvault-backup-YYYY-MM-DD.db`

### 3b. Frontend
- Add "Export Data" section to the existing Settings page
- Button: "Download Database Backup" — triggers the download
- Brief explanation: "Downloads a complete copy of your garden database as a SQLite file"

### 3c. Future expansion hooks
- This endpoint lays the groundwork for Phase 6's full backup automation
- JSON/CSV exports can be added later as separate endpoints

---

## Verification Checklist

- [ ] Dark mode toggles between light/dark/system
- [ ] All pages render correctly in dark mode
- [ ] Theme preference persists across page reloads
- [ ] PWA installs to home screen on mobile (Chrome/Safari)
- [ ] App loads from cache when offline
- [ ] Database export downloads a valid .db file
- [ ] Export file can be opened with any SQLite viewer
- [ ] TypeScript compiles with 0 errors, Vite builds successfully
