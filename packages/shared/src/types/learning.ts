// Learning and Spaced Repetition types

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

export interface Attempt {
  id: number;
  reviewId: number;
  exerciseId: number | null;
  isCorrect: boolean;
  responseTimeMs: number | null;
  userAnswer: string | null;
  createdAt: string;
}
