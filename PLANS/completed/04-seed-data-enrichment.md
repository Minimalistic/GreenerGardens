# Phase 4 Plan — Seed Data Enrichment — "Fill The Catalog"

> Expand the plant catalog from 96 to 200+ plants and backfill missing columns needed for calendar, companion, and rotation features.
> **Depends on**: Phase 1 completion (schema has the columns), can run in parallel with Phase 2a/2b
> Estimated scope: Small (data-only, no code changes beyond seed file updates)

## Context for AI Agents
- **Seed data**: `seed_data/plant_catalog.json` — array of plant objects
- **Seed loader**: `packages/backend/src/db/seed.ts` — upserts by `common_name`
- **Plant catalog schema**: `packages/shared/src/schemas/plant-catalog.schema.ts`
- **Current count**: 96 plants
- **Target**: 200-300 plants with fully populated columns

---

## Step 1: Audit Current Data Quality

### 1a. Identify sparse columns
Review all 96 plants and determine fill rates for key columns:
- `indoor_start_weeks_before_frost` — needed for calendar engine
- `outdoor_sow_weeks_after_frost` — needed for calendar engine
- `transplant_weeks_after_last_frost` — needed for calendar engine
- `days_to_maturity_min` / `days_to_maturity_max` — needed for harvest predictions
- `succession_planting_interval_days` — needed for succession planting feature
- `rotation_family` — needed for crop rotation engine
- `companions_json` / `antagonists_json` — needed for companion planting
- `spacing_inches_min` / `spacing_inches_max` — needed for layout auto-spacing
- `sun_requirement` — needed for sun/shade features
- `water_needs` — useful for garden planning

### 1b. Create a data completeness report
Document which plants are missing which fields, to prioritize backfill effort.

---

## Step 2: Backfill Existing Plants

### 2a. Priority fields (needed for Phase 2b calendar)
For all 96 plants, ensure these are populated:
- `indoor_start_weeks_before_frost` (set to null for direct-sow-only plants)
- `outdoor_sow_weeks_after_frost`
- `transplant_weeks_after_last_frost` (set to null for direct-sow-only plants)
- `days_to_maturity_min` and `days_to_maturity_max`
- `succession_planting_interval_days` (for lettuce, radish, beans, etc.)

### 2b. Rotation fields (needed for Phase 5b)
- `rotation_family` — one of: nightshade, brassica, legume, cucurbit, allium, root, leafy, umbellifers, grass, other
- Ensure every plant has a rotation_family assigned

### 2c. Companion data upgrade (needed for Phase 5b)
- Upgrade `companions_json` from simple name arrays to structured data:
  ```json
  [{"name": "Basil", "relationship": "beneficial", "notes": "Improves flavor, repels aphids"}]
  ```
- Upgrade `antagonists_json` similarly:
  ```json
  [{"name": "Fennel", "relationship": "antagonistic", "notes": "Inhibits growth of most plants"}]
  ```
- Relationship types: `beneficial`, `pest_deterrent`, `trap_crop`, `antagonistic`, `allelopathic`, `neutral`

### 2d. Research sources
- Use established gardening references (Carrots Love Tomatoes, university extension guides)
- Cross-reference multiple sources for timing data
- Be conservative with companion planting claims — only include well-documented relationships

---

## Step 3: Add New Plants (target 200+)

### 3a. Priority additions (common garden plants likely missing)
Expand to cover these categories:
- **Herbs**: Add any missing common herbs (cilantro, dill, oregano, thyme, mint, chives, etc.)
- **Greens**: Arugula, chard, endive, radicchio, mustard greens, bok choy, tatsoi
- **Root vegetables**: Parsnips, turnips, rutabaga, daikon, celeriac, kohlrabi
- **Legumes**: Fava beans, lima beans, edamame, lentils, chickpeas
- **Nightshades**: Ground cherry, tomatillo, additional pepper varieties
- **Brassicas**: Brussels sprouts, collard greens, Chinese cabbage, rapini
- **Cucurbits**: Luffa, bitter melon, chayote, watermelon varieties
- **Alliums**: Leeks, shallots, green onions, garlic chives
- **Flowers** (companion plants): Marigold, nasturtium, sunflower, borage, calendula, zinnia, cosmos, sweet alyssum, lavender
- **Cover crops**: Clover, winter rye, buckwheat, hairy vetch, crimson clover
- **Perennials**: Asparagus, rhubarb, artichoke, horseradish, sorrel

### 3b. Data template for new plants
Every new plant must include at minimum:
- `common_name`, `scientific_name`, `category`
- `days_to_maturity_min`, `days_to_maturity_max`
- `rotation_family`
- `sun_requirement`, `water_needs`
- `companions_json`, `antagonists_json`
- Planting timing fields (indoor start, outdoor sow, transplant)

### 3c. Validation
- Run the seed loader after adding plants to verify no schema violations
- Ensure no duplicate `common_name` entries
- Spot-check timing data against zone 6-7 references (most common US zones)

---

## Step 4: Update Seed Loader (if needed)

### 4a. Handle upgraded companion data format
- If `companions_json` changes from `["Basil", "Carrot"]` to structured objects, ensure `seed.ts` handles both formats gracefully during the transition
- Or: do a complete replacement of all companion data at once

### 4b. Optional: Split seed data file
- If `plant_catalog.json` becomes unwieldy (>5000 lines), consider splitting:
  - `plant_catalog_vegetables.json`
  - `plant_catalog_herbs.json`
  - `plant_catalog_flowers.json`
  - `plant_catalog_cover_crops.json`
- Update `seed.ts` to load from multiple files

---

## Verification Checklist

- [ ] All 96 existing plants have `days_to_maturity_min/max` populated
- [ ] All plants have `rotation_family` assigned
- [ ] Planting timing fields populated for all relevant plants
- [ ] `companions_json` upgraded to structured format with relationship types
- [ ] Plant count reaches 200+ total
- [ ] Seed loader runs without errors
- [ ] No duplicate plant names
- [ ] TypeScript compiles with 0 errors
