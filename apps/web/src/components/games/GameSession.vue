<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import QcmGame from "./QcmGame.vue";
import Progress from "@/components/ui/progress/Progress.vue";
import Button from "@/components/ui/button/Button.vue";
import { getRandomItems, submitAnswer } from "@/lib/api";
import { CheckCircleIcon, XCircleIcon, TrophyIcon } from "lucide-vue-next";
import type {
  GameItem,
  GameResult,
  QcmDirection,
  GameSessionOptions,
} from "./types";

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
  }
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
const isComplete = ref(false);

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
  () => results.value.filter((r) => r.isCorrect).length
);
const incorrectCount = computed(
  () => results.value.filter((r) => !r.isCorrect).length
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
    } catch (error) {
      console.error("Failed to submit answer:", error);
    }
  }

  // Move to next item or complete
  if (currentIndex.value < props.items.length - 1) {
    currentIndex.value++;
    await loadOptions();
  } else {
    isComplete.value = true;
    if (props.options?.trackProgress) {
      // Invalidate both reviews and lessons to update progress
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    }
    emit("complete", results.value);
  }
}

// Start the session
watch(
  () => props.items,
  () => {
    if (props.items.length > 0) {
      loadOptions();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Progress bar -->
    <div v-if="!isComplete" class="space-y-2">
      <div class="flex justify-between text-sm text-muted-foreground">
        <span>{{ currentIndex + 1 }} / {{ items.length }}</span>
        <div class="flex gap-3">
          <span class="text-green-600">✓ {{ correctCount }}</span>
          <span class="text-red-600">✗ {{ incorrectCount }}</span>
        </div>
      </div>
      <Progress :model-value="progress" class="h-2" />
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div
        class="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
      />
    </div>

    <!-- Game component -->
    <template v-else-if="!isComplete && currentItem">
      <QcmGame
        :key="`${currentItem.itemId}-${currentDirection}`"
        :item="currentItem"
        :options="qcmOptions"
        :direction="currentDirection"
        @answer="handleAnswer"
      />
    </template>

    <!-- Complete state -->
    <div v-else-if="isComplete" class="text-center py-8 space-y-6">
      <TrophyIcon class="w-20 h-20 mx-auto text-yellow-500" />

      <div>
        <h2 class="text-2xl font-bold font-heading">Session terminée !</h2>
        <p class="text-muted-foreground mt-2">
          Tu as révisé {{ items.length }} mots
        </p>
      </div>

      <!-- Stats -->
      <div class="flex justify-center gap-8">
        <div class="text-center">
          <div class="flex items-center justify-center gap-2 text-green-600">
            <CheckCircleIcon class="w-6 h-6" />
            <span class="text-3xl font-bold">{{ correctCount }}</span>
          </div>
          <p class="text-sm text-muted-foreground">Correct</p>
        </div>
        <div class="text-center">
          <div class="flex items-center justify-center gap-2 text-red-600">
            <XCircleIcon class="w-6 h-6" />
            <span class="text-3xl font-bold">{{ incorrectCount }}</span>
          </div>
          <p class="text-sm text-muted-foreground">À revoir</p>
        </div>
      </div>

      <!-- Score percentage -->
      <div class="py-4">
        <div class="text-5xl font-bold font-heading">
          {{ Math.round((correctCount / items.length) * 100) }}%
        </div>
        <p class="text-muted-foreground">de bonnes réponses</p>
      </div>

      <Button size="lg" @click="$router.push('/')"> Retour à l'accueil </Button>
    </div>
  </div>
</template>
