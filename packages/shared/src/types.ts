// Shared types between frontend and backend

// ═══════════════════════════════════════════════════════════════
// CONTENT TYPES
// ═══════════════════════════════════════════════════════════════

export type ItemType = "word" | "phrase" | "expression" | "dialogue" | "verb";

export interface Lesson {
  id: number;
  title: string;
  description: string | null;
  icon: string | null;
  orderIndex: number;
  isPremium: boolean;
}

export interface Item {
  id: number;
  lessonId: number | null;
  type: ItemType;
  tunisian: string;
  phonetic: string | null;
  audioFile: string | null;
  difficulty: number;
  orderIndex: number;
}

export interface ItemTranslation {
  id: number;
  itemId: number;
  locale: string;
  translation: string;
  altTranslations: string[] | null;
}

export interface ItemWithTranslation extends Item {
  translation: string;
  altTranslations: string[] | null;
}

// ═══════════════════════════════════════════════════════════════
// LEARNING / SPACED REPETITION
// ═══════════════════════════════════════════════════════════════

export interface Review {
  id: number;
  userId: string;
  itemId: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
}

export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// EXERCISES / GAMES
// ═══════════════════════════════════════════════════════════════

export type GameType = "qcm" | "fill_blank" | "dictation" | "match" | "write";
export type QuestionType =
  | "tunisian_to_translation"
  | "translation_to_tunisian"
  | "audio_to_translation"
  | "audio_to_tunisian";

export interface Exercise {
  id: number;
  itemId: number;
  gameType: GameType;
  questionType: QuestionType;
}

export interface Attempt {
  id: number;
  reviewId: number;
  exerciseId: number | null;
  isCorrect: boolean;
  responseTimeMs: number | null;
  userAnswer: string | null;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// USER
// ═══════════════════════════════════════════════════════════════

export interface UserStats {
  id: number;
  userId: string;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityAt: string | null;
}

// ═══════════════════════════════════════════════════════════════
// API RESPONSES
// ═══════════════════════════════════════════════════════════════

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
