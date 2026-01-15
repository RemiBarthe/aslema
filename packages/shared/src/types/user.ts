// User-related types

export interface UserStats {
  id: number;
  userId: string;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityAt: string | null;
}
