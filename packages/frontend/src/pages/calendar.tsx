import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sprout, Leaf, Scissors, ListChecks, Snowflake, Sun, CloudSun, Droplets } from 'lucide-react';
import { useCalendarEvents, usePlantingSuggestions } from '@/hooks/use-calendar';
import { useWeatherDailySummary, useForecast } from '@/hooks/use-weather';
import { DayNotes } from '@/components/notes/day-notes';
import type { CalendarEvent, PlantingSuggestion } from '@/hooks/use-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const WEATHER_STORAGE_KEY = 'gardenvault_calendar_weather';

interface DayWeather {
  high: number;
  low: number;
  frost?: boolean;
  precip?: number;
  conditions?: string;
}

const EVENT_STYLES: Record<string, { color: string; icon: typeof Sprout; label: string }> = {
  indoor_start: { color: 'bg-purple-500', icon: Sprout, label: 'Indoor Start' },
  direct_sow: { color: 'bg-green-500', icon: Leaf, label: 'Direct Sow' },
  transplant: { color: 'bg-blue-500', icon: Sprout, label: 'Transplant' },
  harvest: { color: 'bg-orange-500', icon: Scissors, label: 'Harvest' },
  task: { color: 'bg-sky-500', icon: ListChecks, label: 'Task' },
  frost: { color: 'bg-red-500', icon: Snowflake, label: 'Frost' },
  planted: { color: 'bg-green-600', icon: Sprout, label: 'Planted' },
  germinated: { color: 'bg-emerald-500', icon: Leaf, label: 'Germinated' },
  transplanted: { color: 'bg-blue-600', icon: Sprout, label: 'Transplanted' },
  harvested: { color: 'bg-amber-500', icon: Scissors, label: 'Harvested' },
  finished: { color: 'bg-gray-500', icon: ListChecks, label: 'Finished' },
};

function EventDot({ type }: { type: string }) {
  const style = EVENT_STYLES[type];
  return <div className={`w-1.5 h-1.5 rounded-full ${style?.color ?? 'bg-gray-400'}`} />;
}

function eventPath(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'plant_catalog': return `/catalog/${entityId}`;
    case 'plant_instance': return `/plants/${entityId}`;
    case 'plot': return `/garden/plots/${entityId}`;
    case 'task': return '/tasks';
    case 'harvest': return '/harvests';
    case 'pest_event': return '/pest-events';
    default: return null;
  }
}

function EventItem({ event }: { event: CalendarEvent }) {
  const navigate = useNavigate();
  const style = EVENT_STYLES[event.type];
  const Icon = style?.icon ?? ListChecks;
  const path = eventPath(event.entity_type, event.entity_id);
  return (
    <div
      className={`flex items-start gap-2 py-1.5 rounded-md px-1 transition-colors ${path ? 'cursor-pointer hover:bg-muted' : ''}`}
      onClick={path ? () => navigate(path) : undefined}
    >
      <div className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 ${style?.color ?? 'bg-gray-400'} text-white`}>
        <Icon className="w-3 h-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{event.title}</div>
        {event.description && (
          <div className="text-xs text-muted-foreground truncate">{event.description}</div>
        )}
      </div>
      <Badge variant="outline" className="text-xs shrink-0">
        {style?.label ?? event.type}
      </Badge>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: PlantingSuggestion }) {
  const navigate = useNavigate();
  const style = EVENT_STYLES[suggestion.action];
  const Icon = style?.icon ?? Leaf;
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => navigate(`/catalog/${suggestion.plant_catalog_id}`)}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style?.color ?? 'bg-green-500'} text-white`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{suggestion.common_name}</div>
        <div className="text-xs text-muted-foreground">{suggestion.reason}</div>
      </div>
      <div className="text-xs text-muted-foreground shrink-0">
        {new Date(suggestion.suggested_date + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function WeatherDayOverlay({ weather }: { weather: DayWeather }) {
  return (
    <div className="flex items-center gap-0.5 mt-0.5">
      <span className="text-[0.6rem] leading-none text-muted-foreground">
        {Math.round(weather.high)}/{Math.round(weather.low)}
      </span>
      {weather.frost && <Snowflake className="w-2.5 h-2.5 text-blue-500" />}
      {(weather.precip ?? 0) > 0 && <Droplets className="w-2.5 h-2.5 text-sky-400" />}
    </div>
  );
}

function WeatherDetail({ weather, dateStr }: { weather: DayWeather; dateStr: string }) {
  const today = new Date().toISOString().split('T')[0];
  const isPast = dateStr < today;

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-2 mb-2">
          <CloudSun className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {isPast ? 'Recorded Weather' : 'Forecast'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">High</span>
            <p className="font-medium">{Math.round(weather.high)}°F</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Low</span>
            <p className="font-medium">{Math.round(weather.low)}°F</p>
          </div>
          {(weather.precip ?? 0) > 0 && (
            <div>
              <span className="text-muted-foreground text-xs">Precipitation</span>
              <p className="font-medium flex items-center gap-1">
                <Droplets className="w-3 h-3 text-sky-400" />
                {weather.precip!.toFixed(2)}"
              </p>
            </div>
          )}
          {weather.frost && (
            <div>
              <span className="text-muted-foreground text-xs">Frost</span>
              <p className="font-medium flex items-center gap-1">
                <Snowflake className="w-3 h-3 text-blue-500" />
                {weather.low <= 32 ? 'Freeze' : 'Frost risk'}
              </p>
            </div>
          )}
          {weather.conditions && (
            <div className="col-span-2">
              <span className="text-muted-foreground text-xs">Conditions</span>
              <p className="font-medium capitalize">{weather.conditions}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CalendarPage() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const initDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? new Date(dateParam + 'T12:00:00') : null;
  const now = new Date();
  const [year, setYear] = useState(initDate ? initDate.getFullYear() : now.getFullYear());
  const [month, setMonth] = useState(initDate ? initDate.getMonth() + 1 : now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(dateParam ?? null);
  const [showWeather, setShowWeather] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(WEATHER_STORAGE_KEY) === 'true';
  });

  const { data: eventsData, isLoading } = useCalendarEvents(month, year);
  const { data: suggestionsData } = usePlantingSuggestions();

  // Weather data — only fetch when overlay is enabled
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(getDaysInMonth(year, month)).padStart(2, '0')}`;
  const { data: dailySummaryData } = useWeatherDailySummary(
    showWeather ? monthStart : '',
    showWeather ? monthEnd : '',
  );
  const { data: forecastData } = useForecast();

  const events = eventsData?.data ?? [];
  const suggestions = suggestionsData?.data ?? [];

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const evt of events) {
      const list = map.get(evt.date) ?? [];
      list.push(evt);
      map.set(evt.date, list);
    }
    return map;
  }, [events]);

  // Build weather map merging daily summaries (past) and forecast (future)
  const weatherByDate = useMemo(() => {
    if (!showWeather) return new Map<string, DayWeather>();

    const map = new Map<string, DayWeather>();
    const todayStr = new Date().toISOString().split('T')[0];

    // Past/current days from daily summaries
    const summaries = dailySummaryData?.data ?? [];
    for (const s of summaries) {
      if (s.high_f != null && s.low_f != null) {
        map.set(s.date, {
          high: s.high_f,
          low: s.low_f,
          frost: s.frost_occurred || s.freeze_occurred,
          precip: s.precipitation_total_inches ?? undefined,
        });
      }
    }

    // Future days from forecast — group by date
    const forecastItems = forecastData?.data ?? [];
    const forecastByDate = new Map<string, { min: number; max: number; precip: number; conditions: string }>();
    for (const item of forecastItems) {
      const date = item.dt_txt.split(' ')[0];
      const existing = forecastByDate.get(date);
      if (existing) {
        existing.min = Math.min(existing.min, item.temp_min_f);
        existing.max = Math.max(existing.max, item.temp_max_f);
        existing.precip += item.precipitation_inches ?? 0;
        // Use the most common non-trivial description
        if (item.weather_description && item.weather_description !== 'clear sky') {
          existing.conditions = item.weather_description;
        }
      } else {
        forecastByDate.set(date, {
          min: item.temp_min_f,
          max: item.temp_max_f,
          precip: item.precipitation_inches ?? 0,
          conditions: item.weather_description ?? '',
        });
      }
    }

    for (const [date, stats] of forecastByDate) {
      // For today: prefer daily summary if available
      if (date === todayStr && map.has(date)) continue;
      // Only use forecast for today and future
      if (date >= todayStr) {
        map.set(date, {
          high: stats.max,
          low: stats.min,
          frost: stats.min <= 32,
          precip: stats.precip > 0 ? stats.precip : undefined,
          conditions: stats.conditions || undefined,
        });
      }
    }

    return map;
  }, [showWeather, dailySummaryData, forecastData]);

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];
  const selectedWeather = selectedDate ? weatherByDate.get(selectedDate) : undefined;

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayStr = now.toISOString().split('T')[0];

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDate(null);
  }

  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSelectedDate(todayStr);
  }

  function toggleWeather() {
    setShowWeather(prev => {
      const next = !prev;
      localStorage.setItem(WEATHER_STORAGE_KEY, String(next));
      return next;
    });
  }

  // Build calendar grid cells
  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr });
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Calendar</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={showWeather ? 'default' : 'outline'}
            size="sm"
            onClick={toggleWeather}
            title={showWeather ? 'Hide weather overlay' : 'Show weather overlay'}
          >
            <CloudSun className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-base">{monthLabel}</CardTitle>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded" />
                ))}
              </div>
            ) : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-1">{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                  {cells.map((cell, i) => {
                    if (!cell.day || !cell.dateStr) {
                      return <div key={i} className="bg-background min-h-[3.5rem]" />;
                    }
                    const dayEvents = eventsByDate.get(cell.dateStr) ?? [];
                    const dayWeather = showWeather ? weatherByDate.get(cell.dateStr) : undefined;
                    const isToday = cell.dateStr === todayStr;
                    const isSelected = cell.dateStr === selectedDate;
                    const isFrost = dayWeather?.frost;

                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(cell.dateStr)}
                        className={`bg-background min-h-[3.5rem] p-1 text-left transition-colors hover:bg-muted/50 ${
                          isSelected ? 'ring-2 ring-primary ring-inset' : ''
                        } ${isFrost ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''}`}
                      >
                        <div className={`text-xs font-medium mb-0.5 ${
                          isToday ? 'bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center' : 'text-foreground'
                        }`}>
                          {cell.day}
                        </div>
                        {dayEvents.length > 0 && (
                          <div className="flex flex-wrap gap-0.5">
                            {dayEvents.slice(0, 3).map(evt => (
                              <EventDot key={evt.id} type={evt.type} />
                            ))}
                            {dayEvents.length > 3 && (
                              <span className="text-[0.6rem] text-muted-foreground">+{dayEvents.length - 3}</span>
                            )}
                          </div>
                        )}
                        {dayWeather && <WeatherDayOverlay weather={dayWeather} />}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                  {Object.entries(EVENT_STYLES).map(([key, { color, label }]) => (
                    <div key={key} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      {label}
                    </div>
                  ))}
                  {showWeather && (
                    <>
                      <div className="flex items-center gap-1">
                        <Snowflake className="w-2.5 h-2.5 text-blue-500" />
                        Frost
                      </div>
                      <div className="flex items-center gap-1">
                        <Droplets className="w-2.5 h-2.5 text-sky-400" />
                        Rain
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {selectedDate
                  ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
                  : 'Select a day'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Weather details for selected day */}
              {selectedDate && selectedWeather && showWeather && (
                <div className="mb-3">
                  <WeatherDetail weather={selectedWeather} dateStr={selectedDate} />
                </div>
              )}

              {!selectedDate ? (
                <p className="text-sm text-muted-foreground">Click a day on the calendar to see its events.</p>
              ) : selectedEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events on this day.</p>
              ) : (
                <div className="divide-y">
                  {selectedEvents.map(evt => (
                    <EventItem key={evt.id} event={evt} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Day notes */}
          {selectedDate && <DayNotes date={selectedDate} />}

          {/* Planting suggestions */}
          {suggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Plant Now
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestions.slice(0, 5).map(s => (
                  <SuggestionCard key={`${s.plant_catalog_id}-${s.action}`} suggestion={s} />
                ))}
                {suggestions.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{suggestions.length - 5} more suggestions
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
