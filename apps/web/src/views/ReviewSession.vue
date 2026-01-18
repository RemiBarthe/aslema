<script setup lang="ts">
import { ref, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { useTodaySession, useStartLearning } from "@/composables/useQueries";
import { GameSession } from "@/components/games";
import { Spinner } from "@/components/ui/spinner";
import { REVIEW_LIMITS, type StudyItem } from "@aslema/shared";

const router = useRouter();
const { data: session, isLoading, refetch } = useTodaySession(
  REVIEW_LIMITS.NEW_DEFAULT,
  REVIEW_LIMITS.DUE_DEFAULT
);
const startLearning = useStartLearning();

const isStarting = ref(false);
const gameItems = ref<StudyItem[]>([]);
const sessionStarted = ref(false);

// Start the session automatically when session data is available
watchEffect(() => {
  if (session.value && !sessionStarted.value && !isStarting.value) {
    initializeSession();
  }
});

async function initializeSession() {
  if (!session.value || isStarting.value || sessionStarted.value) return;

  isStarting.value = true;

  try {
    // Filter new items that don't have a reviewId yet (truly new)
    const trulyNewItems = session.value.newItems.filter(
      (item) => item.reviewId === null
    );

    // Register new items first if any
    if (trulyNewItems.length > 0) {
      const itemIds = trulyNewItems.map((item) => item.itemId);
      await startLearning.mutateAsync(itemIds);
      await refetch();
    }

    if (!session.value) return;

    // All items to practice (newItems now includes learningItems from API)
    const items = [...session.value.dueReviews, ...session.value.newItems];

    // If no items to practice, redirect back to review page
    if (items.length === 0) {
      toast.info("Aucun élément à réviser");
      router.push("/review");
      return;
    }

    // Shuffle items to make the order unpredictable
    const shuffledItems = items.sort(() => Math.random() - 0.5);
    gameItems.value = shuffledItems;
    sessionStarted.value = true;
  } catch (error) {
    console.error("Failed to start session:", error);
    toast.error("Erreur lors du démarrage de la session");
    router.push("/review");
  } finally {
    isStarting.value = false;
  }
}

// Handle game completion
async function handleGameComplete() {
  await refetch();
  router.push("/review");
}
</script>

<template>
  <div v-if="isLoading || isStarting" class="flex justify-center items-center min-h-screen">
    <Spinner class="size-8" />
  </div>

  <GameSession
    v-else-if="sessionStarted && gameItems.length > 0"
    :items="gameItems"
    @complete="handleGameComplete"
  />
</template>
