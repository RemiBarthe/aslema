import type { SM2Quality } from "./learning";

export type GameType = "qcm" | "fill_blank" | "word_order" | "match";

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

export type QcmDirection = "tunisian-to-french" | "french-to-tunisian";

export interface GameResult {
  itemId: number;
  reviewId: number | null;
  isCorrect: boolean;
  quality: SM2Quality;
  responseTimeMs: number;
  userAnswer: string;
}

export interface GameSessionOptions {
  trackProgress?: boolean;
  lessonId?: number;
}
