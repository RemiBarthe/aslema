<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getRandomItems } from "@/lib/api";
import { useLesson, useLessonItems } from "@/composables/useQueries";
import Button from "@/components/ui/button/Button.vue";
import { ChevronLeft, Volume2 } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();

const lessonId = computed(() => Number(route.params.lessonId));

const {
  data: lesson,
  isLoading: lessonLoading,
  error: lessonError,
} = useLesson(lessonId.value);
const {
  data: items,
  isLoading: itemsLoading,
  error: itemsError,
} = useLessonItems(lessonId.value);

const loading = computed(() => lessonLoading.value || itemsLoading.value);
const error = computed(() => lessonError.value || itemsError.value);

// Game state
const gameMode = ref(false);
const currentIndex = ref(0);
const score = ref(0);
const options = ref<string[]>([]);
const selectedAnswer = ref<string | null>(null);
const showResult = ref(false);

const currentItem = computed(() => items.value?.[currentIndex.value]);
const isFinished = computed(
  () => items.value && currentIndex.value >= items.value.length
);
const progress = computed(() =>
  items.value?.length
    ? Math.round((currentIndex.value / items.value.length) * 100)
    : 0
);

async function startGame() {
  gameMode.value = true;
  currentIndex.value = 0;
  score.value = 0;
  await loadOptions();
}

async function loadOptions() {
  if (!currentItem.value) return;

  try {
    const distractors = await getRandomItems(3, {
      excludeId: currentItem.value.id,
      lessonId: lessonId.value,
    });
    const allOptions = [
      currentItem.value.translation,
      ...distractors.map((d) => d.translation).filter(Boolean),
    ].slice(0, 4);

    // Shuffle
    options.value = allOptions.sort(() => Math.random() - 0.5) as string[];
  } catch {
    options.value = [currentItem.value.translation];
  }

  selectedAnswer.value = null;
  showResult.value = false;
}

function selectAnswer(answer: string) {
  if (showResult.value) return;

  selectedAnswer.value = answer;
  showResult.value = true;

  if (answer === currentItem.value?.translation) {
    score.value++;
  }
}

async function nextQuestion() {
  currentIndex.value++;
  if (!isFinished.value) {
    await loadOptions();
  }
}

function goBack() {
  if (gameMode.value) {
    gameMode.value = false;
  } else {
    router.push("/");
  }
}
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col">
    <!-- Header -->
    <header
      class="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-4"
    >
      <div class="flex items-center gap-3">
        <button @click="goBack" class="p-2 -ml-2 hover:bg-accent rounded-lg">
          <ChevronLeft class="w-5 h-5" />
        </button>
        <div class="flex-1 min-w-0">
          <h1 class="font-medium truncate">
            {{ lesson?.title || "Chargement..." }}
          </h1>
          <p v-if="gameMode" class="text-sm text-muted-foreground">
            Question {{ currentIndex + 1 }} / {{ items?.length ?? 0 }}
          </p>
        </div>
        <div v-if="gameMode" class="text-sm font-medium text-primary">
          {{ score }} pts
        </div>
      </div>

      <!-- Progress bar -->
      <div
        v-if="gameMode"
        class="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden"
      >
        <div
          class="h-full bg-primary transition-all duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div
        class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"
      />
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="flex-1 flex items-center justify-center text-destructive p-4"
    >
      {{ error.message }}
    </div>

    <!-- Game Mode -->
    <template v-else-if="gameMode">
      <!-- Finished -->
      <div
        v-if="isFinished"
        class="flex-1 flex flex-col items-center justify-center gap-6 p-6"
      >
        <div class="text-6xl">🎉</div>
        <div class="text-center">
          <h2 class="text-2xl font-bold">Bahi! (Bravo!)</h2>
          <p class="text-muted-foreground mt-2">
            Score: {{ score }} / {{ items?.length ?? 0 }}
          </p>
        </div>
        <div class="flex gap-3">
          <Button variant="outline" @click="gameMode = false">
            Voir les mots
          </Button>
          <Button @click="startGame"> Rejouer </Button>
        </div>
      </div>

      <!-- Question -->
      <div v-else class="flex-1 flex flex-col p-6">
        <!-- Word to guess -->
        <div class="flex-1 flex flex-col items-center justify-center gap-2">
          <p class="text-sm text-muted-foreground">Comment dit-on...</p>
          <h2 class="text-3xl font-bold text-center">
            {{ currentItem?.tunisian }}
          </h2>
        </div>

        <!-- Options -->
        <div class="grid grid-cols-1 gap-3 mt-auto">
          <button
            v-for="option in options"
            :key="option"
            @click="selectAnswer(option)"
            :disabled="showResult"
            class="p-4 rounded-xl border text-left transition-all"
            :class="{
              'bg-card hover:bg-accent/50': !showResult,
              'bg-green-500/20 border-green-500':
                showResult && option === currentItem?.translation,
              'bg-red-500/20 border-red-500':
                showResult &&
                option === selectedAnswer &&
                option !== currentItem?.translation,
              'opacity-50':
                showResult &&
                option !== selectedAnswer &&
                option !== currentItem?.translation,
            }"
          >
            {{ option }}
          </button>
        </div>

        <!-- Next button -->
        <Button v-if="showResult" class="mt-4" size="lg" @click="nextQuestion">
          {{
            items && currentIndex < items.length - 1
              ? "Suivant"
              : "Voir les résultats"
          }}
        </Button>
      </div>
    </template>

    <!-- Word List Mode -->
    <template v-else>
      <main class="flex-1 p-4">
        <div class="space-y-3">
          <div
            v-for="item in items"
            :key="item.id"
            class="p-4 rounded-xl border bg-card"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-medium">{{ item.tunisian }}</h3>
                <p class="text-sm text-muted-foreground">
                  {{ item.translation }}
                </p>
              </div>
              <button
                v-if="item.audioFile"
                class="p-2 hover:bg-accent rounded-lg"
              >
                <Volume2 class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <!-- Start button -->
      <div class="sticky bottom-0 p-4 border-t bg-background">
        <Button class="w-full" size="lg" @click="startGame">
          Commencer le quiz
        </Button>
      </div>
    </template>
  </div>
</template>
