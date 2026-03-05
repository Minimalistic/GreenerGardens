import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';

interface WeatherSummaryRow {
  date: string;
  high_f: number | null;
  low_f: number | null;
  gdd_accumulated: number | null;
  [key: string]: unknown;
}

export function weatherCompareRoutes(fastify: FastifyInstance, db: Database.Database) {
  // Year-over-year temperature comparison
  fastify.get<{ Querystring: { garden_id: string; years?: string } }>(
    '/api/v1/weather/compare',
    async (request) => {
      const { garden_id, years } = request.query;
      const yearList = years ? years.split(',').map(Number) : [new Date().getFullYear(), new Date().getFullYear() - 1];

      const data: Record<number, WeatherSummaryRow[]> = {};
      for (const year of yearList) {
        const start = `${year}-01-01`;
        const end = `${year}-12-31`;
        const summaries = db.prepare(
          `SELECT * FROM weather_daily_summary WHERE garden_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC`
        ).all(garden_id, start, end) as WeatherSummaryRow[];
        data[year] = summaries;
      }
      return { success: true, data };
    },
  );

  // GDD accumulation curve
  fastify.get<{ Querystring: { garden_id: string; year?: string; base?: string } }>(
    '/api/v1/weather/gdd',
    async (request) => {
      const { garden_id, year: yearStr, base: baseStr } = request.query;
      const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();
      const base = baseStr ? parseFloat(baseStr) : 50;

      const summaries = db.prepare(
        `SELECT date, high_f, low_f, gdd_accumulated FROM weather_daily_summary
         WHERE garden_id = ? AND strftime('%Y', date) = ?
         ORDER BY date ASC`
      ).all(garden_id, String(year)) as WeatherSummaryRow[];

      let cumulative = 0;
      const data = summaries.map((s) => {
        const daily = s.high_f != null && s.low_f != null
          ? Math.max(0, (s.high_f + s.low_f) / 2 - base)
          : 0;
        cumulative += daily;
        return {
          date: s.date,
          daily_gdd: Math.round(daily * 10) / 10,
          cumulative_gdd: Math.round(cumulative * 10) / 10,
        };
      });

      return { success: true, data };
    },
  );
}
