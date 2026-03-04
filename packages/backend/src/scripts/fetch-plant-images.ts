/**
 * Fetches plant thumbnail images from Wikipedia and writes them into seed_data/plant_catalog.json.
 *
 * Usage:  npx tsx packages/backend/src/scripts/fetch-plant-images.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.resolve(__dirname, '../../../../seed_data/plant_catalog.json');

const WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';

async function fetchImage(title: string): Promise<string | null> {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  try {
    const res = await fetch(`${WIKI_API}/${encoded}`, {
      headers: { 'User-Agent': 'GardenVault/1.0 (plant-image-fetch)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.originalimage?.source ?? data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const plants = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < plants.length; i++) {
    const plant = plants[i];
    if (plant.image_url) {
      console.log(`[${i + 1}/${plants.length}] ${plant.common_name} — already has image`);
      continue;
    }

    // Try scientific name first, then common name
    let url: string | null = null;
    if (plant.scientific_name) {
      url = await fetchImage(plant.scientific_name);
    }
    if (!url) {
      url = await fetchImage(plant.common_name);
    }

    if (url) {
      plant.image_url = url;
      updated++;
      console.log(`[${i + 1}/${plants.length}] ${plant.common_name} — found`);
    } else {
      failed++;
      console.log(`[${i + 1}/${plants.length}] ${plant.common_name} — not found`);
    }

    await sleep(200);
  }

  fs.writeFileSync(SEED_FILE, JSON.stringify(plants, null, 2) + '\n');
  console.log(`\nDone. Updated: ${updated}, Not found: ${failed}, Total: ${plants.length}`);
}

main().catch(console.error);
