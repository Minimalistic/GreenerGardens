import type { WeatherService } from '../services/weather.service.js';
import type { GardenRepository } from '../db/repositories/garden.repository.js';
import type { PushService } from '../services/push.service.js';

let pushServiceRef: PushService | null = null;

export function setPushService(pushService: PushService) {
  pushServiceRef = pushService;
}

export function startWeatherFetchJob(
  weatherService: WeatherService,
  gardenRepo: GardenRepository,
) {
  if (!weatherService.isConfigured()) {
    console.log('[WeatherJob] No OPENWEATHER_API_KEY configured — weather fetch disabled');
    return;
  }

  console.log('[WeatherJob] Starting weather fetch scheduler');

  // Fetch on startup if stale
  fetchForAllGardens(weatherService, gardenRepo);

  // Fetch every 30 minutes
  const intervalMs = 30 * 60 * 1000;
  setInterval(() => {
    fetchForAllGardens(weatherService, gardenRepo);
  }, intervalMs);

  // Compute daily summaries at midnight
  scheduleDailySummary(weatherService, gardenRepo);
}

async function fetchForAllGardens(
  weatherService: WeatherService,
  gardenRepo: GardenRepository,
) {
  try {
    const gardens = gardenRepo.findAll({ limit: 100 });
    for (const garden of gardens) {
      if (!garden.latitude || !garden.longitude) continue;
      try {
        const result = await weatherService.fetchCurrentWeather(garden.id);
        if (result.error) {
          console.log(`[WeatherJob] Garden ${garden.id}: fetch error — ${result.error}`);
          continue;
        }

        console.log(`[WeatherJob] Garden ${garden.id}: ${result.cached ? 'using cached data' : 'fresh weather data fetched'}`);

        // Send push notification for frost conditions (only on fresh data to avoid re-notifying)
        if (!result.cached && pushServiceRef) {
          try {
            const forecastResult = await weatherService.fetchForecast(garden.id);
            const forecastItems = forecastResult.data;
            if (forecastItems && forecastItems.length > 0) {
              const frostThreshold = 36; // °F
              const hasFrost = forecastItems.some(item => item.temp_min_f <= frostThreshold);
              if (hasFrost) {
                pushServiceRef.broadcastByPreference('frost', {
                  title: 'Frost Alert',
                  body: `Frost warning for ${garden.name || 'your garden'}. Protect tender plants!`,
                  url: '/weather',
                }).catch(err => console.error(`[WeatherJob] Push notification failed: ${err.message}`));
              }
            }
          } catch (frostErr: any) {
            console.error(`[WeatherJob] Frost check failed for garden ${garden.id}: ${frostErr.message}`);
          }
        }
      } catch (err: any) {
        console.error(`[WeatherJob] Garden ${garden.id}: unexpected error — ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error(`[WeatherJob] Failed to fetch gardens: ${err.message}`);
  }
}

function scheduleDailySummary(
  weatherService: WeatherService,
  gardenRepo: GardenRepository,
) {
  // Check every hour; if it's past 11 PM, compute summary for today
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 23) {
      const today = now.toISOString().split('T')[0];
      try {
        const gardens = gardenRepo.findAll({ limit: 100 });
        for (const garden of gardens) {
          try {
            weatherService.computeDailySummary(garden.id, today);
            console.log(`[WeatherJob] Daily summary computed for garden ${garden.id} on ${today}`);
          } catch (err: any) {
            console.error(`[WeatherJob] Summary error for garden ${garden.id}: ${err.message}`);
          }
        }
      } catch (err: any) {
        console.error(`[WeatherJob] Failed to compute daily summaries: ${err.message}`);
      }
    }
  }, 60 * 60 * 1000);
}
