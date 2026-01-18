<script setup lang="ts">
import { ref, computed } from "vue";
import Button from "@/components/ui/button/Button.vue";
import { CheckIcon, XIcon, Volume2Icon } from "lucide-vue-next";
import {
  QCM,
  SM2,
  type StudyItem,
  type GameResult,
  type QcmDirection,
  type SM2Quality,
} from "@aslema/shared";

const props = defineProps<{
  item: StudyItem;
  options: string[];
  direction: QcmDirection;
}>();

const emit = defineEmits<{
  answer: [result: GameResult];
}>();

const selectedAnswer = ref<string | null>(null);
const showResult = ref(false);
const startTime = ref(Date.now());

// The question displayed to user
const question = computed(() =>
  props.direction === "tunisian-to-french"
    ? props.item.tunisian
    : props.item.translation,
);

// The correct answer
const correctAnswer = computed(() =>
  props.direction === "tunisian-to-french"
    ? props.item.translation
    : props.item.tunisian,
);

// Instruction text
const instruction = computed(() =>
  props.direction === "tunisian-to-french"
    ? "Traduis en français"
    : "Traduis en tunisien",
);

const isCorrect = computed(() => selectedAnswer.value === correctAnswer.value);

// Show audio button only for tunisian question
const showAudio = computed(
  () => props.direction === "tunisian-to-french" && props.item.audioFile,
);

function selectAnswer(answer: string) {
  if (showResult.value) return;

  selectedAnswer.value = answer;
  showResult.value = true;

  const responseTimeMs = Date.now() - startTime.value;
  const correct = answer === correctAnswer.value;

  // Calculate SM-2 quality based on correctness and response time
  let quality: SM2Quality;
  if (!correct) {
    quality = SM2.QUALITY_INCORRECT;
  } else if (responseTimeMs < QCM.RESPONSE_FAST_MS) {
    quality = SM2.QUALITY_PERFECT;
  } else if (responseTimeMs < QCM.RESPONSE_GOOD_MS) {
    quality = SM2.QUALITY_GOOD;
  } else {
    quality = SM2.QUALITY_MIN_CORRECT;
  }

  // Emit after a short delay to show the result
  setTimeout(() => {
    emit("answer", {
      itemId: props.item.itemId,
      reviewId: props.item.reviewId,
      isCorrect: correct,
      quality,
      responseTimeMs,
      userAnswer: answer,
    });
  }, QCM.ANSWER_DELAY_MS);
}

function getButtonVariant(option: string) {
  if (!showResult.value) return "outline";
  if (option === correctAnswer.value) return "default";
  if (option === selectedAnswer.value) return "destructive";
  return "outline";
}

function getButtonClass(option: string) {
  if (!showResult.value) return "";
  if (option === correctAnswer.value) return "bg-green-600 border-green-600";
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Question -->
    <div class="text-center">
      <p class="text-sm text-muted-foreground">{{ instruction }}</p>
      <div class="flex items-center justify-center gap-3">
        <h2 class="text-3xl font-bold font-heading">{{ question }}</h2>
        <button
          v-if="showAudio"
          class="p-2 rounded-full hover:bg-muted transition-colors"
          @click.stop
        >
          <Volume2Icon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Options -->
    <div class="grid grid-cols-1 gap-3">
      <Button
        v-for="option in options"
        :key="option"
        :variant="getButtonVariant(option)"
        :class="['h-14 text-lg justify-start', getButtonClass(option)]"
        :disabled="showResult"
        @click="selectAnswer(option)"
      >
        <span class="flex-1 text-left">{{ option }}</span>
        <CheckIcon
          v-if="showResult && option === correctAnswer"
          class="w-5 h-5 text-white"
        />
        <XIcon
          v-else-if="
            showResult && option === selectedAnswer && option !== correctAnswer
          "
          class="w-5 h-5 text-white"
        />
      </Button>
    </div>

    <!-- Feedback -->
    <div
      v-if="showResult"
      class="text-center py-4"
      :class="isCorrect ? 'text-green-600' : 'text-red-600'"
    >
      <p class="text-lg font-semibold">
        {{ isCorrect ? "Bravo ! 🎉" : "Pas tout à fait..." }}
      </p>
      <p v-if="!isCorrect" class="text-sm text-muted-foreground mt-1">
        La bonne réponse était : <strong>{{ correctAnswer }}</strong>
      </p>
    </div>
  </div>
</template>
