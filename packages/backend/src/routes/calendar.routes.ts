import type { FastifyInstance } from 'fastify';
import type { CalendarService } from '../services/calendar.service.js';
import { replyError } from '../utils/reply-error.js';
import { safeParseInt } from '../utils/parse.js';

export function calendarRoutes(fastify: FastifyInstance, calendarService: CalendarService) {
  // GET /api/v1/calendar?garden_id=&month=&year=
  fastify.get<{ Querystring: { garden_id?: string; month?: string; year?: string } }>(
    '/api/v1/calendar',
    async (request, reply) => {
      const { garden_id, month, year } = request.query;
      if (!garden_id) {
        return replyError(reply, 400, 'VALIDATION_ERROR', 'garden_id query parameter required');
      }

      const now = new Date();
      const m = safeParseInt(month, now.getMonth() + 1);
      const y = safeParseInt(year, now.getFullYear());

      const events = calendarService.getMonthEvents(garden_id, y, m);
      return { success: true, data: events };
    },
  );

  // GET /api/v1/calendar/week?garden_id=
  fastify.get<{ Querystring: { garden_id?: string } }>(
    '/api/v1/calendar/week',
    async (request, reply) => {
      const gardenId = request.query.garden_id;
      if (!gardenId) {
        return replyError(reply, 400, 'VALIDATION_ERROR', 'garden_id query parameter required');
      }

      const events = calendarService.getWeekEvents(gardenId);
      return { success: true, data: events };
    },
  );

  // GET /api/v1/calendar/suggestions?garden_id=
  fastify.get<{ Querystring: { garden_id?: string } }>(
    '/api/v1/calendar/suggestions',
    async (request, reply) => {
      const gardenId = request.query.garden_id;
      if (!gardenId) {
        return replyError(reply, 400, 'VALIDATION_ERROR', 'garden_id query parameter required');
      }

      const suggestions = calendarService.getPlantingSuggestions(gardenId);
      return { success: true, data: suggestions };
    },
  );
}
