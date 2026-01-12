import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import {
  getLessons,
  getLesson,
  getLessonItems,
  getDueReviews,
  getUserStats,
  startLearning,
  submitAnswer,
  getRandomItems,
} from "@/lib/api";
import type { SM2Quality } from "@tunisian/shared";

// Lessons
export function useLessons() {
  return useQuery({
    queryKey: ["lessons"],
    queryFn: getLessons,
    staleTime: Infinity,
  });
}

export function useLesson(id: number) {
  return useQuery({
    queryKey: ["lessons", id],
    queryFn: () => getLesson(id),
    staleTime: Infinity,
  });
}

export function useLessonItems(lessonId: number, locale = "fr") {
  return useQuery({
    queryKey: ["lessons", lessonId, "items", locale],
    queryFn: () => getLessonItems(lessonId, locale),
    staleTime: Infinity,
  });
}

// Reviews
export function useDueReviews(locale = "fr", limit = 10) {
  return useQuery({
    queryKey: ["reviews", "due", locale],
    queryFn: () => getDueReviews(limit, locale),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ["reviews", "stats"],
    queryFn: getUserStats,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
}

// Mutations
export function useStartLearning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemIds: number[]) => startLearning(itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}

export interface SubmitAnswerParams {
  reviewId: number;
  quality: SM2Quality;
  isCorrect: boolean;
  responseTimeMs?: number;
  userAnswer?: string;
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, ...data }: SubmitAnswerParams) =>
      submitAnswer(reviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}

// Random items for QCM (no cache)
export function useRandomItems(
  count: number,
  options?: { excludeId?: number; lessonId?: number }
) {
  return useQuery({
    queryKey: ["items", "random", count, options?.excludeId, options?.lessonId],
    queryFn: () => getRandomItems(count, options),
    staleTime: 0,
    gcTime: 0,
  });
}
