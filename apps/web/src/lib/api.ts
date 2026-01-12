import type {
  ApiResponse,
  LessonWithProgress,
  ItemWithTranslation,
} from "@tunisian/shared";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const json = (await response.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new Error(json.error || "Unknown error");
  }

  return json.data as T;
}

// Lessons
export async function getLessons(): Promise<LessonWithProgress[]> {
  return fetchApi<LessonWithProgress[]>("/lessons");
}

export async function getLesson(id: number): Promise<LessonWithProgress> {
  return fetchApi<LessonWithProgress>(`/lessons/${id}`);
}

export async function getLessonItems(
  lessonId: number,
  locale = "fr"
): Promise<ItemWithTranslation[]> {
  return fetchApi<ItemWithTranslation[]>(
    `/lessons/${lessonId}/items?locale=${locale}`
  );
}

// Items
export async function getRandomItems(
  count: number,
  excludeId?: number,
  locale = "fr"
): Promise<Pick<ItemWithTranslation, "id" | "tunisian" | "translation">[]> {
  const params = new URLSearchParams({ locale });
  if (excludeId) params.set("excludeId", String(excludeId));
  return fetchApi(`/items/random/${count}?${params}`);
}

// Reviews
export async function startLearning(
  userId: string,
  itemIds: number[]
): Promise<{ created: number }> {
  return fetchApi("/reviews/start", {
    method: "POST",
    body: JSON.stringify({ userId, itemIds }),
  });
}

export async function submitAnswer(
  reviewId: number,
  data: {
    quality: 0 | 1 | 2 | 3 | 4 | 5;
    isCorrect: boolean;
    responseTimeMs?: number;
    userAnswer?: string;
  }
): Promise<{
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;
}> {
  return fetchApi(`/reviews/${reviewId}/answer`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
