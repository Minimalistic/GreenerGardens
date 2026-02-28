// Approximate USDA zone from latitude (very rough; continental US focus)
const ZONE_BANDS: Array<{ minLat: number; maxLat: number; zone: string }> = [
  { minLat: 25, maxLat: 27, zone: '10a' },
  { minLat: 27, maxLat: 29, zone: '9b' },
  { minLat: 29, maxLat: 31, zone: '9a' },
  { minLat: 31, maxLat: 33, zone: '8b' },
  { minLat: 33, maxLat: 35, zone: '8a' },
  { minLat: 35, maxLat: 37, zone: '7b' },
  { minLat: 37, maxLat: 39, zone: '7a' },
  { minLat: 39, maxLat: 41, zone: '6b' },
  { minLat: 41, maxLat: 43, zone: '6a' },
  { minLat: 43, maxLat: 45, zone: '5b' },
  { minLat: 45, maxLat: 47, zone: '5a' },
  { minLat: 47, maxLat: 49, zone: '4b' },
];

export function lookupZone(latitude: number): string | null {
  for (const band of ZONE_BANDS) {
    if (latitude >= band.minLat && latitude < band.maxLat) {
      return band.zone;
    }
  }
  if (latitude < 25) return '11a';
  if (latitude >= 49) return '4a';
  return null;
}

// Approximate frost dates by zone
const FROST_DATES: Record<string, { lastFrost: string; firstFrost: string }> = {
  '4a': { lastFrost: '05-15', firstFrost: '09-15' },
  '4b': { lastFrost: '05-10', firstFrost: '09-20' },
  '5a': { lastFrost: '05-01', firstFrost: '10-01' },
  '5b': { lastFrost: '04-25', firstFrost: '10-05' },
  '6a': { lastFrost: '04-20', firstFrost: '10-10' },
  '6b': { lastFrost: '04-15', firstFrost: '10-15' },
  '7a': { lastFrost: '04-10', firstFrost: '10-25' },
  '7b': { lastFrost: '04-01', firstFrost: '11-01' },
  '8a': { lastFrost: '03-20', firstFrost: '11-10' },
  '8b': { lastFrost: '03-10', firstFrost: '11-15' },
  '9a': { lastFrost: '02-28', firstFrost: '11-30' },
  '9b': { lastFrost: '02-15', firstFrost: '12-10' },
  '10a': { lastFrost: '01-31', firstFrost: '12-20' },
  '11a': { lastFrost: '01-01', firstFrost: '12-31' },
};

export function lookupFrostDates(zone: string): { lastFrost: string; firstFrost: string } | null {
  return FROST_DATES[zone] ?? null;
}
