// Content types - Lessons and Items

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
  audioFile: string | null;
  difficulty: number;
  orderIndex: number;
}

export interface ItemTranslation {
  id: number;
  itemId: number;
  locale: string;
  translation: string;
}

export interface ItemWithTranslation extends Item {
  translation: string;
}
