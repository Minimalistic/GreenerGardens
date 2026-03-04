/**
 * Retries fetching images for plants that were missed on the first pass.
 * Uses manual Wikipedia title mappings and cleaned-up search terms.
 *
 * Usage:  npx tsx packages/backend/src/scripts/fetch-plant-images-retry.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.resolve(__dirname, '../../../../seed_data/plant_catalog.json');

const WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';

// Manual mappings: common_name -> Wikipedia article title
const MANUAL_TITLES: Record<string, string> = {
  'Hot Pepper': 'Capsicum',
  'Snap Pea': 'Snap pea',
  'Asparagus': 'Asparagus officinalis',
  'Mint': 'Mentha',
  'Marigold': 'Tagetes',
  'Columbine': 'Aquilegia',
  'Daikon Radish': 'Daikon',
  'Rapini (Broccoli Rabe)': 'Rapini',
  'Savoy Cabbage': 'Savoy cabbage',
  'Romanesco': 'Romanesco broccoli',
  'Egyptian Walking Onion': 'Allium × proliferum',
  'Bitter Melon': 'Momordica charantia',
  'Armenian Cucumber': 'Armenian cucumber',
  'Winged Bean': 'Winged bean',
  'New Zealand Spinach': 'New Zealand spinach',
  'Epazote': 'Dysphania ambrosioides',
  'Thai Basil': 'Thai basil',
  'Hyssop': 'Hyssopus officinalis',
  'Chervil': 'Chervil',
  'Rudbeckia (Goldsturm)': 'Rudbeckia fulgida',
  'Iris': 'Iris (plant)',
  'Poppy': 'Papaver',
  'Verbena': 'Verbena',
  'Amaranth': 'Amaranthus',
  'Cleome': 'Cleome hassleriana',
  'Nicotiana': 'Nicotiana alata',
  'White Clover': 'Trifolium repens',
  'Buckwheat': 'Fagopyrum esculentum',
  'Austrian Winter Pea': 'Pisum sativum',
  'Oats (Cover Crop)': 'Oat',
  'Sorghum-Sudan Grass': 'Sorghum bicolor',
  'Elderberry': 'Sambucus',
  'Cranberry': 'Cranberry',
  'Pawpaw': 'Asimina triloba',
  'Medlar': 'Mespilus germanica',
  'Hardy Kiwi': 'Actinidia arguta',
  'Jostaberry': 'Jostaberry',
};

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
  const missing = plants.filter((p: any) => !p.image_url);
  console.log(`Retrying ${missing.length} plants with missing images...\n`);

  let updated = 0;
  let failed = 0;

  for (const plant of missing) {
    const title = MANUAL_TITLES[plant.common_name];
    if (!title) {
      console.log(`${plant.common_name} — no manual mapping, skipping`);
      failed++;
      continue;
    }

    const url = await fetchImage(title);
    if (url) {
      plant.image_url = url;
      updated++;
      console.log(`${plant.common_name} — found (via "${title}")`);
    } else {
      failed++;
      console.log(`${plant.common_name} — still not found (tried "${title}")`);
    }

    await sleep(200);
  }

  fs.writeFileSync(SEED_FILE, JSON.stringify(plants, null, 2) + '\n');
  console.log(`\nDone. Fixed: ${updated}, Still missing: ${failed}, Total retried: ${missing.length}`);
}

main().catch(console.error);
