<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getLessonItems } from "@/lib/api";
import { useLesson, useLessonItems } from "@/composables/useQueries";
import Button from "@/components/ui/button/Button.vue";
import { ChevronLeft, Volume2 } from "lucide-vue-next";
import { GameSession } from "@/components/games";
import type { GameItem } from "@/components/games/types";

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
const gameItems = ref<GameItem[]>([]);

async function startGame() {
  // Fetch shuffled items for the quiz
  const shuffledItems = await getLessonItems(lessonId.value, "fr", true);
  // Convert to GameItem format (no reviewId = practice mode)
  gameItems.value = shuffledItems.map((item) => ({
    reviewId: null,
    itemId: item.id,
    tunisian: item.tunisian,
    translation: item.translation ?? "",
    audioFile: item.audioFile,
    lessonId: item.lessonId,
  }));
  gameMode.value = true;
}

function handleGameComplete() {
  gameMode.value = false;
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
    <div class="flex items-center gap-3">
      <button @click="goBack" class="p-2 -ml-2 hover:bg-accent rounded-lg">
        <ChevronLeft class="w-5 h-5" />
      </button>
      <div class="flex-1 min-w-0">
        <h1 class="font-medium truncate">
          {{ lesson?.title || "Chargement..." }}
        </h1>
        <p v-if="gameMode" class="text-sm text-muted-foreground">
          Mode entraînement
        </p>
      </div>
    </div>

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

    <!-- Game Mode (Practice - no SRS tracking) -->
    <template v-else-if="gameMode">
      <div class="flex-1 py-4">
        <GameSession
          :items="gameItems"
          :options="{ trackProgress: false, lessonId: lessonId }"
          @complete="handleGameComplete"
        />
      </div>
    </template>

    <!-- Word List Mode -->
    <template v-else>
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

      <!-- Start button -->
      <div class="sticky bottom-0 p-4 border-t bg-background">
        <Button class="w-full" size="lg" @click="startGame">
          Commencer le quiz
        </Button>
      </div>
    </template>
  </div>
</template>
