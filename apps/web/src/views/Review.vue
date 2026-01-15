<script setup lang="ts">
import { ref, computed } from "vue";
import { RouterLink } from "vue-router";
import { useTodaySession, useStartLearning } from "@/composables/useQueries";
import { WordList } from "@/components/ui/word-list";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  SparklesIcon,
  RepeatIcon,
  CheckCircleIcon,
  BookOpenIcon,
} from "lucide-vue-next";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import Button from "@/components/ui/button/Button.vue";
import { GameSession } from "@/components/games";
import type { TodayItem } from "@/lib/api";

const { data: session, isLoading, error, refetch } = useTodaySession(5, 20);
const startLearning = useStartLearning();

// Game mode
const isPlaying = ref(false);
const gameItems = ref<TodayItem[]>([]);

// Counts
const reviewCount = computed(() => session.value?.totalDue ?? 0);
const learningCount = computed(() => session.value?.totalLearning ?? 0);
const newCount = computed(() => session.value?.totalNew ?? 0);

// Total items to practice
const totalToPractice = computed(
  () => reviewCount.value + learningCount.value + newCount.value
);

// Button label
const startButtonLabel = computed(() => {
  if (
    reviewCount.value > 0 &&
    (newCount.value > 0 || learningCount.value > 0)
  ) {
    return `Réviser et apprendre (${totalToPractice.value})`;
  } else if (reviewCount.value > 0) {
    return `Réviser (${totalToPractice.value})`;
  } else if (newCount.value > 0 || learningCount.value > 0) {
    return `Apprendre (${totalToPractice.value})`;
  }
  return "Session terminée";
});

// Start the session
async function handleStartSession() {
  if (!session.value) return;

  // Register new items first if any
  if (session.value.newItems.length > 0) {
    const itemIds = session.value.newItems.map(
      (item: TodayItem) => item.itemId
    );
    await startLearning.mutateAsync(itemIds);
    await refetch();
  }

  if (!session.value) return;
  const items = [...session.value.dueReviews, ...session.value.learningItems];
  if (items.length === 0) return;

  gameItems.value = items;
  isPlaying.value = true;
}

// Handle game completion
async function handleGameComplete() {
  await refetch();
  isPlaying.value = false;
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Game Mode -->
    <template v-if="isPlaying">
      <GameSession :items="gameItems" @complete="handleGameComplete" />
    </template>

    <!-- List Mode -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <RouterLink to="/" class="text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon class="w-5 h-5" />
        </RouterLink>
        <h1 class="text-2xl font-bold font-heading">Session du jour</h1>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-3">
        <Skeleton class="w-full h-16" />
        <Skeleton class="w-full h-16" />
        <Skeleton class="w-full h-16" />
      </div>

      <!-- Error -->
      <Alert v-else-if="error" variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{{ error.message }}</AlertDescription>
      </Alert>

      <!-- Content -->
      <div v-else class="space-y-6">
        <!-- Start button (only if items to practice) -->
        <Button
          v-if="totalToPractice > 0"
          class="w-full"
          size="lg"
          :disabled="startLearning.isPending.value"
          @click="handleStartSession"
        >
          {{
            startLearning.isPending.value ? "Chargement..." : startButtonLabel
          }}
        </Button>

        <!-- Success message if nothing to practice -->
        <div v-if="totalToPractice === 0" class="text-center py-8 space-y-4">
          <CheckCircleIcon class="w-16 h-16 mx-auto text-green-500" />
          <h2 class="text-xl font-semibold">Bravo ! 🎉</h2>
          <p class="text-muted-foreground">Tu as terminé ta session du jour.</p>
        </div>

        <!-- Word lists -->
        <WordList
          title="À réviser"
          :items="session?.dueReviews ?? []"
          :icon="RepeatIcon"
          color-class="bg-orange-100 dark:bg-orange-900/30 text-orange-600"
        />

        <WordList
          title="En cours"
          :items="session?.learningItems ?? []"
          :icon="BookOpenIcon"
          color-class="bg-amber-100 dark:bg-amber-900/30 text-amber-600"
        />

        <WordList
          title="Nouveaux mots"
          :items="session?.newItems ?? []"
          :icon="SparklesIcon"
          color-class="bg-blue-100 dark:bg-blue-900/30 text-blue-600"
        />

        <WordList
          title="Travaillés aujourd'hui"
          :items="session?.learnedTodayItems ?? []"
          :icon="CheckCircleIcon"
          color-class="bg-green-100 dark:bg-green-900/30 text-green-600"
        />

        <!-- Back button -->
        <RouterLink v-if="totalToPractice === 0" to="/" class="block">
          <Button variant="outline" class="w-full">Retour à l'accueil</Button>
        </RouterLink>
      </div>
    </template>
  </div>
</template>
