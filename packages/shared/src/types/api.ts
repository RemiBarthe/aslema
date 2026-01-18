// API response types

import type { Lesson } from "./content";
import type { StudyItem } from "./reviews";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LessonWithProgress extends Lesson {
  totalItems: number;
  completedItems: number;
  progress: number; // 0-100
}

// User stats API response (different from DB UserStats)
export interface UserStatsResponse {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityAt: string | null;
  dueReviews: number;
  newItems: number;
  learnedToday: number;
  totalNewAvailable: number;
}

export type { StudyItem };
