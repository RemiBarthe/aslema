<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { toast } from "vue-sonner";
import QcmGame from "./QcmGame.vue";
import Progress from "@/components/ui/progress/Progress.vue";
import { Spinner } from "@/components/ui/spinner";
import { getRandomItems, submitAnswer } from "@/lib/api";
import {
  QCM,
  type StudyItem,
  type GameResult,
  type QcmDirection,
  type GameSessionOptions,
  type QcmOption,
} from "@aslema/shared";
import { CheckIcon, XIcon } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    items: StudyItem[];
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
const qcmOptions = ref<QcmOption[]>([]);
const currentDirection = ref<QcmDirection>("tunisian-to-french");
const isLoading = ref(false);
const comboCount = ref(0);
const showCombo = ref(false);

const currentItem = computed((): StudyItem | null => {
  return props.items[currentIndex.value] ?? null;
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

// Combo color based on streak
const comboColor = computed(() => {
  if (comboCount.value >= 10) return "text-purple-500";
  if (comboCount.value >= 5) return "text-red-500";
  return "text-orange-500";
});

// Handle validation (for combo update)
function handleValidate(isCorrect: boolean) {
  if (isCorrect) {
    comboCount.value++;
    showCombo.value = comboCount.value >= 2;
  } else {
    comboCount.value = 0;
    showCombo.value = false;
  }
}

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
    const distractors = await getRandomItems(QCM.DISTRACTOR_COUNT, {
      excludeId: currentItem.value.itemId,
      lessonId:
        props.options?.lessonId ?? currentItem.value.lessonId ?? undefined,
    });

    if (currentDirection.value === "tunisian-to-french") {
      // Options are French translations (no audio for French)
      const allOptions: QcmOption[] = [
        { text: currentItem.value.translation, audioFile: null },
        ...distractors
          .filter((d) => d.translation)
          .map((d) => ({ text: d.translation!, audioFile: null })),
      ].slice(0, QCM.OPTIONS_COUNT);
      qcmOptions.value = shuffle(allOptions);
    } else {
      // Options are Tunisian words (with audio if available)
      const allOptions: QcmOption[] = [
        {
          text: currentItem.value.tunisian,
          audioFile: currentItem.value.audioFile,
        },
        ...distractors.map((d) => ({
          text: d.tunisian,
          audioFile: d.audioFile,
        })),
      ].slice(0, QCM.OPTIONS_COUNT);
      qcmOptions.value = shuffle(allOptions);
    }
  } catch (error) {
    console.error("Failed to load options:", error);
    toast.error("Erreur lors du chargement des options");
    // Fallback: just use the correct answer
    if (currentDirection.value === "tunisian-to-french") {
      qcmOptions.value = [
        { text: currentItem.value.translation, audioFile: null },
      ];
    } else {
      qcmOptions.value = [
        {
          text: currentItem.value.tunisian,
          audioFile: currentItem.value.audioFile,
        },
      ];
    }
  } finally {
    isLoading.value = false;
  }
}

// Handle answer
async function handleAnswer(result: GameResult) {
  results.value.push(result);
  showCombo.value = false;

  // Submit to API only if tracking progress and we have a reviewId
  if (props.options?.trackProgress && result.reviewId) {
    try {
      await submitAnswer(result.reviewId, {
        quality: result.quality,
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
        <div class="flex items-center gap-4">
          <span>{{ currentIndex + 1 }} / {{ items.length }}</span>

          <span
            v-if="showCombo"
            :key="comboCount"
            :class="['combo-animation text-xs font-bold', comboColor]"
          >
            COMBO x{{ comboCount }}
          </span>
        </div>
        <div class="flex gap-4">
          <span class="flex gap-0.5 items-center">
            <CheckIcon class="size-4" /> {{ correctCount }}
          </span>

          <span class="flex gap-0.5 items-center">
            <XIcon class="size-4" /> {{ incorrectCount }}
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
        @validate="handleValidate"
        @answer="handleAnswer"
      />
    </template>
  </div>
</template>

<style scoped>
.combo-animation {
  animation: combo-pop 0.3s ease-out;
}

@keyframes combo-pop {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
