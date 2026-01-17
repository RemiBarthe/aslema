<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useTodaySession } from "@/composables/useQueries";
import { WordList } from "@/components/ui/word-list";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  SparklesIcon,
  RepeatIcon,
  CheckCircleIcon,
} from "lucide-vue-next";
import { Spinner } from "@/components/ui/spinner";
import Button from "@/components/ui/button/Button.vue";

const { data: session, isLoading, error } = useTodaySession(5, 20);

// Counts
const reviewCount = computed(() => session.value?.dueReviews.length ?? 0);
const newCount = computed(() => session.value?.newItems.length ?? 0);

// Total items to practice
const totalToPractice = computed(() => reviewCount.value + newCount.value);

// Button label
const startButtonLabel = computed(() => {
  if (reviewCount.value > 0 && newCount.value > 0) {
    return `Réviser et apprendre (${totalToPractice.value})`;
  } else if (reviewCount.value > 0) {
    return `Réviser (${totalToPractice.value})`;
  } else if (newCount.value > 0) {
    return `Apprendre (${totalToPractice.value})`;
  }
  return "Session terminée";
});
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
      <h1 class="text-2xl font-bold font-heading">Session du jour</h1>
    </div>

    <RouterLink v-if="totalToPractice > 0" to="/review/session">
      <Button>
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
      <!-- Success message if nothing to practice -->
      <div v-if="totalToPractice === 0" class="text-center py-8 space-y-4">
        <CheckCircleIcon class="w-16 h-16 mx-auto text-green-500" />
        <div>
          <h2 class="text-xl font-semibold">Bravo !</h2>
          <p class="text-muted-foreground">Tu as terminé ta session du jour.</p>
        </div>
      </div>

      <WordList
        title="À réviser"
        :items="session?.dueReviews ?? []"
        :icon="RepeatIcon"
        color-class="bg-orange-100 dark:bg-orange-900/30 text-orange-600"
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
    </div>
  </div>
</template>
