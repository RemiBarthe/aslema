<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useTodaySession, useStartLearning } from "@/composables/useQueries";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemMedia,
  ItemHeader,
} from "@/components/ui/item";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  SparklesIcon,
  RepeatIcon,
  CheckCircleIcon,
} from "lucide-vue-next";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import Button from "@/components/ui/button/Button.vue";
import Separator from "@/components/ui/separator/Separator.vue";
import type { TodayItem } from "@/lib/api";

const { data: session, isLoading, error, refetch } = useTodaySession(5, 20);
const startLearning = useStartLearning();

// Combine reviews and new items into a single list for display
const allItems = computed(() => {
  if (!session.value) return [];
  return [...session.value.dueReviews, ...session.value.newItems];
});

const hasItemsToLearn = computed(() => allItems.value.length > 0);

// Start learning new items
async function handleStartNewItems() {
  if (!session.value?.newItems.length) return;

  const itemIds = session.value.newItems.map((item: TodayItem) => item.itemId);
  await startLearning.mutateAsync(itemIds);
  refetch();
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
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
    <div
      v-else-if="!hasItemsToLearn"
      class="text-center py-12 space-y-4"
    >
      <CheckCircleIcon class="w-16 h-16 mx-auto text-green-500" />
      <h2 class="text-xl font-semibold">Bravo ! 🎉</h2>
      <p class="text-muted-foreground">
        Tu as terminé toutes tes révisions pour aujourd'hui.
        <br />
        Reviens demain pour continuer ton apprentissage !
      </p>
      <RouterLink to="/">
        <Button variant="outline" class="mt-4">
          Retour à l'accueil
        </Button>
      </RouterLink>
    </div>

    <!-- Items to learn/review -->
    <div v-else class="space-y-6">
      <!-- Summary -->
      <div class="flex gap-4">
        <Item variant="muted" class="flex-1">
          <ItemHeader>
            <RepeatIcon class="w-4 h-4" />
          </ItemHeader>
          <ItemContent>
            <ItemTitle class="text-sm">À réviser</ItemTitle>
            <ItemDescription>{{ session?.totalDue ?? 0 }} mots</ItemDescription>
          </ItemContent>
        </Item>

        <Item variant="muted" class="flex-1">
          <ItemHeader>
            <SparklesIcon class="w-4 h-4" />
          </ItemHeader>
          <ItemContent>
            <ItemTitle class="text-sm">Nouveaux</ItemTitle>
            <ItemDescription>{{ session?.totalNew ?? 0 }} mots</ItemDescription>
          </ItemContent>
        </Item>
      </div>

      <!-- Due Reviews Section -->
      <div v-if="session?.dueReviews.length">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
          <RepeatIcon class="w-4 h-4" />
          Révisions
        </h2>
        <div class="space-y-2">
          <Item
            v-for="item in session.dueReviews"
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

      <Separator v-if="session?.dueReviews.length && session?.newItems.length" />

      <!-- New Items Section -->
      <div v-if="session?.newItems.length">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
          <SparklesIcon class="w-4 h-4" />
          Nouveaux mots
        </h2>
        <div class="space-y-2">
          <Item
            v-for="item in session.newItems"
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

        <!-- Start Learning Button -->
        <Button
          class="w-full mt-4"
          :disabled="startLearning.isPending.value"
          @click="handleStartNewItems"
        >
          {{ startLearning.isPending.value ? "Chargement..." : "Commencer l'apprentissage" }}
        </Button>
      </div>

      <!-- Start Review Button (when there are due reviews) -->
      <div v-if="session?.dueReviews.length" class="pt-4">
        <Button class="w-full" size="lg">
          Commencer la révision ({{ allItems.length }} mots)
        </Button>
        <p class="text-xs text-muted-foreground text-center mt-2">
          Les exercices seront disponibles prochainement
        </p>
      </div>
    </div>
  </div>
</template>
