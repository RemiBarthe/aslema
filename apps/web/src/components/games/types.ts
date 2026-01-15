// Types for game components

export interface GameItem {
  reviewId: number | null;
  itemId: number;
  tunisian: string;
  translation: string;
  audioFile?: string | null;
  lessonId?: number | null;
}

export interface GameResult {
  itemId: number;
  reviewId: number | null;
  isCorrect: boolean;
  quality: 0 | 1 | 2 | 3 | 4 | 5; // SM-2 quality rating
  responseTimeMs: number;
  userAnswer: string;
}

export type QcmDirection = "tunisian-to-french" | "french-to-tunisian";

export interface GameSessionOptions {
  // If true, submit answers to SRS API (for real reviews)
  // If false, just practice mode (for lessons)
  trackProgress: boolean;
  // Lesson ID to get distractors from same theme
  lessonId?: number;
}
