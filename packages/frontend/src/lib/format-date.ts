/**
 * Parse a date-only string (YYYY-MM-DD) at noon local time to avoid timezone shifts.
 */
function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

/** "Jan 5" */
export function formatShortDate(dateStr: string): string {
  return parseDateString(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

/** "Jan 5, 2025" */
export function formatFullDate(dateStr: string): string {
  return parseDateString(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Monday, Jan 5" */
export function formatWeekdayDate(dateStr: string): string {
  return parseDateString(dateStr).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
}

/** "Mon, Jan 5" */
export function formatShortWeekdayDate(dateStr: string): string {
  return parseDateString(dateStr).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "Jan 5, 2025, 3:30 PM" */
export function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}
