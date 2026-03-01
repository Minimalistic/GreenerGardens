import type { WeatherService } from '../services/weather.service.js';
import type { GardenRepository } from '../db/repositories/garden.repository.js';
import type { AlertService } from '../services/alert.service.js';

let alertServiceRef: AlertService | null = null;

export function setAlertService(alertService: AlertService) {
  alertServiceRef = alertService;
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
        if (result.cached) {
          console.log(`[WeatherJob] Garden ${garden.id}: using cached data`);
        } else if (result.error) {
          console.log(`[WeatherJob] Garden ${garden.id}: fetch error — ${result.error}`);
        } else {
          console.log(`[WeatherJob] Garden ${garden.id}: fresh weather data fetched`);
          // Run alert checks after fresh weather data
          if (alertServiceRef) {
            try {
              await alertServiceRef.checkFrostAlert(garden.id);
              await alertServiceRef.checkHeatAlert(garden.id);
            } catch (alertErr: any) {
              console.error(`[WeatherJob] Alert check failed for garden ${garden.id}: ${alertErr.message}`);
            }
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
