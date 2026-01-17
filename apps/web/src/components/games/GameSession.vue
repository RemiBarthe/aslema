<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { toast } from "vue-sonner";
import QcmGame from "./QcmGame.vue";
import Progress from "@/components/ui/progress/Progress.vue";
import { Spinner } from "@/components/ui/spinner";
import { getRandomItems, submitAnswer } from "@/lib/api";
import type {
  GameItem,
  GameResult,
  QcmDirection,
  GameSessionOptions,
} from "@aslema/shared";
import { CheckIcon, XIcon } from "lucide-vue-next";

interface SessionItem {
  reviewId: number | null;
  itemId: number;
  tunisian: string;
  translation: string;
  audioFile?: string | null;
  lessonId?: number | null;
}

const props = withDefaults(
  defineProps<{
    items: SessionItem[];
    options?: GameSessionOptions;
  }>(),
  {
    options: () => ({ trackProgress: true }),
  },
);

const emit = defineEmits<{
  complete: [results: GameResult[]];
}>();

const queryClient = useQueryClient();

// Session state
const currentIndex = ref(0);
const results = ref<GameResult[]>([]);
const qcmOptions = ref<string[]>([]);
const currentDirection = ref<QcmDirection>("tunisian-to-french");
const isLoading = ref(false);

// Current item
const currentItem = computed((): GameItem | null => {
  const item = props.items[currentIndex.value];
  if (!item) return null;
  return {
    reviewId: item.reviewId,
    itemId: item.itemId,
    tunisian: item.tunisian,
    translation: item.translation,
    audioFile: item.audioFile,
    lessonId: item.lessonId,
  };
});

// Progress
const progress = computed(() => {
  return Math.round((currentIndex.value / props.items.length) * 100);
});

// Stats
const correctCount = computed(
  () => results.value.filter((r) => r.isCorrect).length,
);
const incorrectCount = computed(
  () => results.value.filter((r) => !r.isCorrect).length,
);

// Pick a random direction
function pickRandomDirection(): QcmDirection {
  const directions: QcmDirection[] = [
    "tunisian-to-french",
    "french-to-tunisian",
  ];
  return directions[
    Math.floor(Math.random() * directions.length)
  ] as QcmDirection;
}

// Shuffle array
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = temp as T;
  }
  return arr;
}

// Load options for current item
async function loadOptions() {
  if (!currentItem.value) return;

  isLoading.value = true;
  currentDirection.value = pickRandomDirection();

  try {
    // Get distractors from API - prefer same lesson for thematic consistency
    const distractors = await getRandomItems(3, {
      excludeId: currentItem.value.itemId,
      lessonId:
        props.options?.lessonId ?? currentItem.value.lessonId ?? undefined,
    });

    if (currentDirection.value === "tunisian-to-french") {
      // Options are French translations
      const allOptions = [
        currentItem.value.translation,
        ...distractors.map((d) => d.translation).filter(Boolean),
      ].slice(0, 4);
      qcmOptions.value = shuffle(allOptions) as string[];
    } else {
      // Options are Tunisian words
      const allOptions = [
        currentItem.value.tunisian,
        ...distractors.map((d) => d.tunisian).filter(Boolean),
      ].slice(0, 4);
      qcmOptions.value = shuffle(allOptions);
    }
  } catch (error) {
    console.error("Failed to load options:", error);
    toast.error("Erreur lors du chargement des options");
    // Fallback: just use the correct answer
    if (currentDirection.value === "tunisian-to-french") {
      qcmOptions.value = [currentItem.value.translation];
    } else {
      qcmOptions.value = [currentItem.value.tunisian];
    }
  } finally {
    isLoading.value = false;
  }
}

// Handle answer
async function handleAnswer(result: GameResult) {
  results.value.push(result);

  // Submit to API only if tracking progress and we have a reviewId
  if (props.options?.trackProgress && result.reviewId) {
    try {
      await submitAnswer(result.reviewId, {
        quality: result.quality,
        isCorrect: result.isCorrect,
        responseTimeMs: result.responseTimeMs,
        userAnswer: result.userAnswer,
      });

      // Invalidate queries after each answer to keep stats up to date
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    } catch (error) {
      console.error("Failed to submit answer:", error);
      toast.error("Erreur lors de la sauvegarde de ta réponse");
    }
  }

  // Move to next item or complete
  if (currentIndex.value < props.items.length - 1) {
    currentIndex.value++;
    await loadOptions();
  } else emit("complete", results.value);
}

// Start the session
watch(
  () => props.items,
  () => {
    if (props.items.length > 0) {
      loadOptions();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Progress bar -->
    <div class="space-y-2">
      <div class="flex justify-between text-sm text-muted-foreground">
        <span>{{ currentIndex + 1 }} / {{ items.length }}</span>
        <div class="flex gap-4">
          <span class="flex gap-0.5 items-center">
            <CheckIcon class="w-4 h-4" /> {{ correctCount }}
          </span>

          <span class="flex gap-0.5 items-center">
            <XIcon class="w-4 h-4" /> {{ incorrectCount }}
          </span>
        </div>
      </div>
      <Progress :model-value="progress" class="h-2" />
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Spinner />
    </div>

    <!-- Game component -->
    <template v-else-if="currentItem">
      <QcmGame
        :key="`${currentItem.itemId}-${currentDirection}`"
        :item="currentItem"
        :options="qcmOptions"
        :direction="currentDirection"
        @answer="handleAnswer"
      />
    </template>
  </div>
</template>
