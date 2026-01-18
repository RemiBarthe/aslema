<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useLesson, useLessonItems } from "@/composables/useQueries";
import { WordList } from "@/components/ui/word-list";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircleIcon, ArrowLeftIcon, PlayIcon } from "lucide-vue-next";
import { Spinner } from "@/components/ui/spinner";
import Button from "@/components/ui/button/Button.vue";

const route = useRoute();
const lessonId = Number(route.params.lessonId);

const {
  data: lesson,
  isLoading: lessonLoading,
  error: lessonError,
} = useLesson(lessonId);
const {
  data: items,
  isLoading: itemsLoading,
  error: itemsError,
} = useLessonItems(lessonId);

const isLoading = computed(() => lessonLoading.value || itemsLoading.value);
const error = computed(() => lessonError.value || itemsError.value);

// Item count
const itemCount = computed(() => items.value?.length ?? 0);

// Button label
const startButtonLabel = computed(() => {
  if (itemCount.value === 0) return "Aucun élément";
  return `Commencer (${itemCount.value})`;
});

const wordListItems = computed(() => items.value ?? []);
</script>

<template>
  <div
    class="sticky top-16 z-10 bg-background flex items-center justify-between pb-1"
  >
    <div class="flex items-center gap-2">
      <RouterLink to="/" class="text-muted-foreground hover:text-foreground">
        <Button variant="ghost" size="icon-sm">
          <ArrowLeftIcon />
        </Button>
      </RouterLink>
      <h1 class="text-xl font-semibold font-heading">
        {{ lesson?.title || "Leçon" }}
      </h1>
    </div>

    <RouterLink v-if="itemCount > 0" :to="`/learn/${lessonId}/session`">
      <Button>
        <PlayIcon class="mr-2 h-4 w-4" />
        {{ startButtonLabel }}
      </Button>
    </RouterLink>

    <RouterLink v-else to="/">
      <Button>Retour à l'accueil</Button>
    </RouterLink>
  </div>

  <div class="mt-8">
    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Spinner />
    </div>

    <!-- Error -->
    <Alert v-else-if="error" variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>Erreur</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Empty state -->
      <div v-if="itemCount === 0" class="text-center py-8 space-y-4">
        <AlertCircleIcon class="w-16 h-16 mx-auto text-muted-foreground" />
        <div>
          <h2 class="text-xl font-semibold">Aucun élément</h2>
          <p class="text-muted-foreground">
            Cette leçon ne contient aucun mot.
          </p>
        </div>
      </div>

      <WordList
        v-else
        title="Mots de la leçon"
        :items="wordListItems"
        :icon="PlayIcon"
        color-class="bg-blue-100 dark:bg-blue-900/30 text-blue-600"
      />
    </div>
  </div>
</template>
