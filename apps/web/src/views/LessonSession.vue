<script setup lang="ts">
import { ref, watchEffect, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { getLessonItems } from "@/lib/api";
import { GameSession } from "@/components/games";
import { Spinner } from "@/components/ui/spinner";
import { DEFAULT_LOCALE, type StudyItem } from "@aslema/shared";

const route = useRoute();
const router = useRouter();

const lessonId = computed(() => Number(route.params.lessonId));

const isLoading = ref(true);
const gameItems = ref<StudyItem[]>([]);
const sessionStarted = ref(false);

// Initialize session automatically when component is mounted
watchEffect(() => {
  if (lessonId.value && !sessionStarted.value && isLoading.value) {
    initializeSession();
  }
});

async function initializeSession() {
  if (sessionStarted.value) return;

  try {
    const items = await getLessonItems(lessonId.value, DEFAULT_LOCALE, true);

    // If no items, redirect back to lesson page
    if (items.length === 0) {
      toast.info("Aucun élément à pratiquer");
      router.push(`/learn/${lessonId.value}`);
      return;
    }

    gameItems.value = items;
    sessionStarted.value = true;
  } catch (error) {
    console.error("Failed to start session:", error);
    toast.error("Erreur lors du démarrage de la session");
    router.push(`/learn/${lessonId.value}`);
  } finally {
    isLoading.value = false;
  }
}

// Handle game completion
function handleGameComplete() {
  router.push(`/learn/${lessonId.value}`);
}
</script>

<template>
  <div v-if="isLoading" class="flex justify-center items-center min-h-screen">
    <Spinner class="size-8" />
  </div>

  <GameSession
    v-else-if="sessionStarted && gameItems.length > 0"
    :items="gameItems"
    :options="{ trackProgress: false, lessonId: lessonId }"
    @complete="handleGameComplete"
  />
</template>
