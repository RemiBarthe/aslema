/**
 * Returns the start of day (00:00:00.000) for the given date.
 * @param date - The date to get the start of day for. Defaults to current date.
 * @returns A new Date object set to the start of the day
 */
export function getStartOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
