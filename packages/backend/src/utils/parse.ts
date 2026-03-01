/**
 * Safely parse a string to an integer with a fallback default.
 * Returns `fallback` when the input is undefined, empty, or non-numeric.
 */
export function safeParseInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}
