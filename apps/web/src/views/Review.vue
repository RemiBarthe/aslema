<script setup lang="ts">
import { ref, computed } from "vue";
import { RouterLink } from "vue-router";
import { useTodaySession, useStartLearning } from "@/composables/useQueries";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemMedia,
} from "@/components/ui/item";
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
import Separator from "@/components/ui/separator/Separator.vue";
import { GameSession } from "@/components/games";
import type { TodayItem } from "@/lib/api";

const { data: session, isLoading, error, refetch } = useTodaySession(5, 20);
const startLearning = useStartLearning();

// Game mode
const isPlaying = ref(false);
const gameItems = ref<TodayItem[]>([]);

// All items for the session (due + learning + new)
const allSessionItems = computed(() => {
  if (!session.value) return [];
  return [
    ...session.value.dueReviews,
    ...session.value.learningItems,
    ...session.value.newItems,
  ];
});

// Counts for display
const reviewCount = computed(() => session.value?.totalDue ?? 0);
const learningCount = computed(() => session.value?.totalLearning ?? 0);
const newCount = computed(() => session.value?.totalNew ?? 0);
const totalCount = computed(() => allSessionItems.value.length);

// Has anything to show
const hasItemsToShow = computed(() => totalCount.value > 0);

// Button label based on content
const startButtonLabel = computed(() => {
  if (reviewCount.value > 0 && newCount.value > 0) {
    return `Réviser et apprendre (${totalCount.value})`;
  } else if (reviewCount.value > 0) {
    return `Réviser (${totalCount.value})`;
  } else if (newCount.value > 0 || learningCount.value > 0) {
    return `Apprendre (${totalCount.value})`;
  }
  return `Commencer (${totalCount.value})`;
});

// Start the full session
async function handleStartSession() {
  if (!session.value) return;

  // If there are new items, first register them as reviews then refetch to get reviewIds
  if (session.value.newItems.length > 0) {
    const itemIds = session.value.newItems.map(
      (item: TodayItem) => item.itemId
    );
    await startLearning.mutateAsync(itemIds);
    // Refetch to get the new reviewIds
    await refetch();
  }

  // Now use the updated session data with proper reviewIds
  if (!session.value) return;
  const items = [...session.value.dueReviews, ...session.value.learningItems];

  if (items.length === 0) return;

  gameItems.value = items;
  isPlaying.value = true;
}

// Handle game completion
function handleGameComplete() {
  isPlaying.value = false;
  refetch();
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Game Mode -->
    <template v-if="isPlaying">
      <GameSession :items="gameItems" @complete="handleGameComplete" />
    </template>

    <!-- Review List Mode -->
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
        <AlertDescription>
          <p>{{ error.message }}</p>
        </AlertDescription>
      </Alert>

      <!-- Empty state -->
      <div v-else-if="!hasItemsToShow" class="text-center py-12 space-y-4">
        <CheckCircleIcon class="w-16 h-16 mx-auto text-green-500" />
        <h2 class="text-xl font-semibold">Bravo ! 🎉</h2>
        <p class="text-muted-foreground">
          Tu as terminé toutes tes révisions pour aujourd'hui.
          <br />
          Reviens demain pour continuer ton apprentissage !
        </p>
        <RouterLink to="/">
          <Button variant="outline" class="mt-4"> Retour à l'accueil </Button>
        </RouterLink>
      </div>

      <!-- Items to learn/review -->
      <div v-else class="space-y-6">
        <!-- Start Session Button -->
        <Button
          class="w-full"
          size="lg"
          :disabled="startLearning.isPending.value"
          @click="handleStartSession"
        >
          {{
            startLearning.isPending.value ? "Chargement..." : startButtonLabel
          }}
        </Button>

        <!-- Due Reviews Section -->
        <div v-if="reviewCount > 0">
          <h2
            class="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"
          >
            <RepeatIcon class="w-4 h-4" />
            À réviser ({{ reviewCount }})
          </h2>
          <div class="space-y-2">
            <Item
              v-for="item in session?.dueReviews"
              :key="`review-${item.itemId}`"
              variant="outline"
            >
              <ItemMedia>
                <div
                  class="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"
                >
                  <RepeatIcon class="w-4 h-4 text-orange-600" />
                </div>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{{ item.tunisian }}</ItemTitle>
                <ItemDescription>{{ item.translation }}</ItemDescription>
              </ItemContent>
            </Item>
          </div>
        </div>

        <!-- Learning Items Section -->
        <div v-if="learningCount > 0">
          <Separator v-if="reviewCount > 0" class="my-4" />
          <h2
            class="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"
          >
            <BookOpenIcon class="w-4 h-4" />
            En cours ({{ learningCount }})
          </h2>
          <div class="space-y-2">
            <Item
              v-for="item in session?.learningItems"
              :key="`learning-${item.itemId}`"
              variant="outline"
            >
              <ItemMedia>
                <div
                  class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                >
                  <BookOpenIcon class="w-4 h-4 text-green-600" />
                </div>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{{ item.tunisian }}</ItemTitle>
                <ItemDescription>{{ item.translation }}</ItemDescription>
              </ItemContent>
            </Item>
          </div>
        </div>

        <!-- New Items Section -->
        <div v-if="newCount > 0">
          <Separator v-if="reviewCount > 0 || learningCount > 0" class="my-4" />
          <h2
            class="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"
          >
            <SparklesIcon class="w-4 h-4" />
            Nouveaux mots ({{ newCount }})
          </h2>
          <div class="space-y-2">
            <Item
              v-for="item in session?.newItems"
              :key="`new-${item.itemId}`"
              variant="outline"
            >
              <ItemMedia>
                <div
                  class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
                >
                  <SparklesIcon class="w-4 h-4 text-blue-600" />
                </div>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{{ item.tunisian }}</ItemTitle>
                <ItemDescription>{{ item.translation }}</ItemDescription>
              </ItemContent>
            </Item>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
