// Review API response types

export interface DueReview {
  reviewId: number;
  itemId: number;
  tunisian: string;
  audioFile: string | null;
  translation: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export interface TodayItem {
  reviewId: number | null;
  itemId: number;
  tunisian: string;
  audioFile: string | null;
  translation: string;
  easeFactor: number | null;
  interval: number | null;
  repetitions: number | null;
  type: "review" | "learning" | "new" | "learned";
}

export interface TodaySession {
  dueReviews: TodayItem[];
  newItems: TodayItem[];
  learnedTodayItems: TodayItem[];
  totalDue: number;
  totalNew: number;
  totalLearnedToday: number;
}
