import type { ApiResponse } from "@aslema/shared";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
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

// Items
export async function createItem(data: {
  tunisian: string;
  translation: string;
  type?: string;
  difficulty?: number;
  audioFile?: string;
  lessonId?: number;
  locale?: string;
}): Promise<{ id: number }> {
  return fetchApi("/items", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getRandomItemWithoutAudio(): Promise<{
  id: number;
  tunisian: string;
  translation?: string;
} | null> {
  return fetchApi("/items/random-without-audio");
}

export async function updateItemAudio(
  itemId: number,
  audioFile: string,
): Promise<{ success: boolean }> {
  return fetchApi(`/items/${itemId}/audio`, {
    method: "PATCH",
    body: JSON.stringify({ audioFile }),
  });
}

export async function uploadItemAudio(
  itemId: number,
  audioBlob: Blob,
): Promise<{ filename: string }> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.mp3");

  const response = await fetch(`${API_URL}/items/${itemId}/upload-audio`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const json = (await response.json()) as ApiResponse<{ filename: string }>;

  if (!json.success) {
    throw new Error(json.error || "Unknown error");
  }

  return json.data as { filename: string };
}

// Lessons
export async function getLessons(): Promise<Array<{ id: number; title: string }>> {
  return fetchApi("/lessons");
}

export async function createLesson(data: {
  title: string;
  description?: string;
  icon?: string;
}): Promise<{ id: number }> {
  return fetchApi("/lessons", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
