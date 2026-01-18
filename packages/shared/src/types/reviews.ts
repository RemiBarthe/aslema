export interface StudyItem {
  itemId: number;
  tunisian: string;
  translation: string;
  audioFile: string | null;
  reviewId: number | null;
  lessonId: number | null;
  isLearned?: boolean;
}

export interface TodaySession {
  dueReviews: StudyItem[];
  newItems: StudyItem[];
  learnedTodayItems: StudyItem[];
}
