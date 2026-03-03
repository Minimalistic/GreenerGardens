#!/usr/bin/env node

/**
 * One-time script to resolve Wikipedia URLs for all plants in the catalog.
 * Uses scientific name first, falls back to common name.
 * Writes results back into seed_data/plant_catalog.json.
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.resolve(__dirname, '../seed_data/plant_catalog.json');
const API_BASE = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'GreenerGardens/1.0 (plant catalog Wikipedia link resolver)';

// Rate limit: Wikipedia requests a polite delay
const DELAY_MS = 500;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function queryWikipedia(title) {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    redirects: '1',
    format: 'json',
    formatversion: '2',
  });

  const url = `${API_BASE}?${params}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const pages = data.query?.pages;
  if (!pages || pages.length === 0) return null;

  const page = pages[0];
  if (page.missing) return null;

  // Build canonical URL from the resolved page title
  const resolvedTitle = page.title.replace(/ /g, '_');
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle).replace(/%2F/g, '/')}`;
}

async function resolveUrl(plant) {
  // Try scientific name first (more reliable for Wikipedia)
  if (plant.scientific_name) {
    const url = await queryWikipedia(plant.scientific_name);
    if (url) return url;
  }

  // Fall back to common name
  const url = await queryWikipedia(plant.common_name);
  if (url) return url;

  // Try common name without parenthetical (e.g., "Allium (Ornamental)" -> "Allium")
  const withoutParens = plant.common_name.replace(/\s*\(.*?\)\s*/, '').trim();
  if (withoutParens !== plant.common_name) {
    const url2 = await queryWikipedia(withoutParens);
    if (url2) return url2;
  }

  return null;
}

async function main() {
  const plants = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  console.log(`Processing ${plants.length} plants...`);

  const unresolved = [];
  let resolved = 0;
  let skipped = 0;

  for (let i = 0; i < plants.length; i++) {
    const plant = plants[i];

    // Skip if already has a URL
    if (plant.wikipedia_url) {
      skipped++;
      continue;
    }

    const url = await resolveUrl(plant);
    if (url) {
      plant.wikipedia_url = url;
      resolved++;
      process.stdout.write(`\r  [${i + 1}/${plants.length}] Resolved: ${plant.common_name}`);
    } else {
      unresolved.push(plant.common_name);
      process.stdout.write(`\r  [${i + 1}/${plants.length}] FAILED: ${plant.common_name}  `);
    }

    await sleep(DELAY_MS);
  }

  console.log('\n');
  console.log(`Resolved: ${resolved}`);
  console.log(`Skipped (already had URL): ${skipped}`);
  console.log(`Failed: ${unresolved.length}`);

  if (unresolved.length > 0) {
    console.log('\nUnresolved plants (need manual review):');
    unresolved.forEach(name => console.log(`  - ${name}`));
  }

  // Write back
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(plants, null, 2) + '\n');
  console.log(`\nUpdated ${CATALOG_PATH}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
