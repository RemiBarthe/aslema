import {
  DEFAULT_LOCALE,
  REVIEW_LIMITS,
  type ApiResponse,
  type LessonWithProgress,
  type StudyItem,
  type Distractor,
  type TodaySession,
  type UserStatsResponse,
  type SM2Quality,
} from "@aslema/shared";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const USER_ID_KEY = "tunisian_user_id";

// Generate or retrieve anonymous user ID
function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

// Export for use in components
export function getAnonymousUserId(): string {
  return getUserId();
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": getUserId(),
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
  locale = DEFAULT_LOCALE,
  shuffle = false,
): Promise<StudyItem[]> {
  const params = new URLSearchParams({ locale });
  if (shuffle) params.set("shuffle", "true");
  return fetchApi<StudyItem[]>(`/lessons/${lessonId}/items?${params}`);
}

export async function getRandomItems(
  count: number,
  options?: { excludeId?: number; lessonId?: number; locale?: string },
): Promise<Distractor[]> {
  const params = new URLSearchParams({
    locale: options?.locale ?? DEFAULT_LOCALE,
  });
  if (options?.excludeId) params.set("excludeId", String(options.excludeId));
  if (options?.lessonId) params.set("lessonId", String(options.lessonId));
  return fetchApi(`/items/random/${count}?${params}`);
}

// Reviews
export async function startLearning(
  itemIds: number[],
): Promise<{ created: number }> {
  return fetchApi("/reviews/start", {
    method: "POST",
    body: JSON.stringify({ itemIds }),
  });
}

export async function submitAnswer(
  reviewId: number,
  data: {
    quality: SM2Quality;
    isCorrect: boolean;
    responseTimeMs?: number;
    userAnswer?: string;
  },
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

// Get due reviews for the current user
export async function getDueReviews(
  limit = REVIEW_LIMITS.DUE_DEFAULT,
  locale = DEFAULT_LOCALE,
): Promise<StudyItem[]> {
  return fetchApi<StudyItem[]>(`/reviews/due?locale=${locale}&limit=${limit}`);
}

// Get user stats
export async function getUserStats(): Promise<UserStatsResponse> {
  return fetchApi<UserStatsResponse>(`/reviews/stats`);
}

// Get today's learning session
export async function getTodaySession(
  newLimit = REVIEW_LIMITS.NEW_DEFAULT,
  dueLimit = REVIEW_LIMITS.DUE_DEFAULT,
  locale = DEFAULT_LOCALE,
): Promise<TodaySession> {
  return fetchApi<TodaySession>(
    `/reviews/today?locale=${locale}&newLimit=${newLimit}&dueLimit=${dueLimit}`,
  );
}

// ═══════════════════════════════════════════════════════════════
// DEV TOOLS
// ═══════════════════════════════════════════════════════════════

export async function devSimulateDays(
  days: number,
): Promise<{ message: string }> {
  return fetchApi("/reviews/dev/simulate-days", {
    method: "POST",
    body: JSON.stringify({ days }),
  });
}

export async function devResetProgress(): Promise<{ message: string }> {
  return fetchApi("/reviews/dev/reset", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
