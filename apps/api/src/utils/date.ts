export function getStartOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDaysSinceActivity(lastActivityAt: Date): number {
  const startOfToday = getStartOfDay();
  const startOfLastActivity = getStartOfDay(lastActivityAt);
  return Math.floor(
    (startOfToday.getTime() - startOfLastActivity.getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

/**
 * Calculates the new streak when performing an activity.
 * Streak rules: same day = no change, consecutive day = +1, broken = reset to 1
 */
export function calculateNewStreak(
  lastActivityAt: Date | null,
  currentStreak: number,
): number {
  if (!lastActivityAt) return 1;

  const daysDiff = getDaysSinceActivity(lastActivityAt);

  if (daysDiff === 0) return currentStreak;
  if (daysDiff === 1) return currentStreak + 1;
  return 1;
}

/**
 * Gets the current active streak (read-only).
 * Returns 0 if no activity or if streak is broken (>1 day gap).
 */
export function getCurrentStreak(
  lastActivityAt: Date | null,
  currentStreak: number,
): number {
  if (!lastActivityAt) return 0;

  const daysDiff = getDaysSinceActivity(lastActivityAt);

  if (daysDiff > 1) return 0;
  return currentStreak;
}
