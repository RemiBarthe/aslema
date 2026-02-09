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
  type QcmOption,
} from "@aslema/shared";
import { useAudio } from "@/composables/useAudio";

const props = defineProps<{
  item: StudyItem;
  options: QcmOption[];
  direction: QcmDirection;
}>();

const emit = defineEmits<{
  answer: [result: GameResult];
  validate: [isCorrect: boolean];
}>();

const selectedAnswer = ref<QcmOption | null>(null);
const isValidated = ref(false);
const startTime = ref(Date.now());
const responseTimeMs = ref(0);

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

const isCorrect = computed(
  () => selectedAnswer.value?.text === correctAnswer.value,
);

// Show audio button only for tunisian question
const showAudio = computed(
  () => props.direction === "tunisian-to-french" && props.item.audioFile,
);

const { playAudio } = useAudio();

function selectAnswer(option: QcmOption) {
  if (isValidated.value) return;
  selectedAnswer.value = option;
}

function validateAnswer() {
  if (!selectedAnswer.value || isValidated.value) return;

  responseTimeMs.value = Date.now() - startTime.value;
  isValidated.value = true;

  emit("validate", selectedAnswer.value.text === correctAnswer.value);
}

function continueToNext() {
  if (!selectedAnswer.value) return;

  const correct = selectedAnswer.value.text === correctAnswer.value;

  // Calculate SM-2 quality based on correctness and response time
  let quality: SM2Quality;
  if (!correct) {
    quality = SM2.QUALITY_INCORRECT;
  } else if (responseTimeMs.value < QCM.RESPONSE_FAST_MS) {
    quality = SM2.QUALITY_PERFECT;
  } else if (responseTimeMs.value < QCM.RESPONSE_GOOD_MS) {
    quality = SM2.QUALITY_GOOD;
  } else {
    quality = SM2.QUALITY_MIN_CORRECT;
  }

  emit("answer", {
    itemId: props.item.itemId,
    reviewId: props.item.reviewId,
    isCorrect: correct,
    quality,
    responseTimeMs: responseTimeMs.value,
    userAnswer: selectedAnswer.value.text,
  });
}

function getButtonVariant(option: QcmOption) {
  if (!isValidated.value) return "outline";
  if (option.text === correctAnswer.value) return "default";
  if (option.text === selectedAnswer.value?.text) return "destructive";
  return "outline";
}

function getButtonClass(option: QcmOption) {
  if (!isValidated.value && option.text === selectedAnswer.value?.text) {
    return "ring-2 ring-primary";
  }
  if (isValidated.value && option.text === correctAnswer.value) {
    return "bg-green-600";
  }
  return "";
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="text-center">
      <p class="text-sm text-muted-foreground">{{ instruction }}</p>
      <div class="flex items-center justify-center gap-3">
        <h2 class="text-3xl font-bold font-heading">{{ question }}</h2>
        <Button
          v-if="showAudio"
          size="icon-lg"
          variant="ghost"
          @click.stop="playAudio(props.item.audioFile)"
        >
          <Volume2Icon class="size-5" />
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3">
      <div v-for="option in options" :key="option.text" class="flex gap-2">
        <Button
          :variant="getButtonVariant(option)"
          :class="['h-14 text-lg justify-start flex-1', getButtonClass(option)]"
          :disabled="isValidated"
          @click="selectAnswer(option)"
        >
          <span class="flex-1 text-left">{{ option.text }}</span>
          <CheckIcon
            v-if="isValidated && option.text === correctAnswer"
            class="size-5 text-white"
          />
          <XIcon
            v-else-if="
              isValidated &&
              option.text === selectedAnswer?.text &&
              option.text !== correctAnswer
            "
            class="size-5 text-white"
          />
        </Button>

        <Button
          v-if="option.audioFile"
          size="icon-lg"
          variant="ghost"
          class="size-14"
          @click.stop="playAudio(option.audioFile)"
        >
          <Volume2Icon class="size-5" />
        </Button>
      </div>
    </div>

    <div class="h-16 flex items-center justify-center">
      <div
        v-if="isValidated"
        class="text-center"
        :class="isCorrect ? 'text-green-600' : 'text-red-600'"
      >
        <div class="flex gap-2 items-center justify-center">
          <CheckIcon v-if="isCorrect" class="size-5" />
          <XIcon v-else class="size-5" />

          <p class="text-lg font-semibold">
            {{ isCorrect ? "Correct" : "Incorrect" }}
          </p>
        </div>
        <p v-if="!isCorrect" class="text-sm text-muted-foreground mt-1">
          La bonne réponse : <strong>{{ correctAnswer }}</strong>
        </p>
      </div>
    </div>

    <Button
      size="lg"
      class="w-full"
      :disabled="!selectedAnswer"
      @click="isValidated ? continueToNext() : validateAnswer()"
    >
      {{ isValidated ? "Continuer" : "Valider" }}
    </Button>
  </div>
</template>
