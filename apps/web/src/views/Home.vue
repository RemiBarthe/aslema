<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useLessons, useUserStats } from "@/composables/useQueries";
import Progress from "@/components/ui/progress/Progress.vue";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemMedia,
  ItemHeader,
} from "@/components/ui/item";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  FlameIcon,
  RepeatIcon,
  SparklesIcon,
} from "lucide-vue-next";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import Button from "@/components/ui/button/Button.vue";

const { data: lessons, isLoading, error } = useLessons();
const { data: stats, isLoading: statsLoading } = useUserStats();

const hasLearnedToday = computed(() => {
  return (stats.value?.learnedToday ?? 0) > 0;
});

// Button text based on state
const buttonText = computed(() => {
  if (!stats.value) return "Chargement...";

  const due = stats.value.dueReviews;
  const newItems = stats.value.newItems;

  if (due > 0 && newItems > 0) {
    return "Réviser et apprendre";
  } else if (due > 0) {
    return "Continuer la révision";
  } else if (newItems > 0) {
    return "Apprendre de nouveaux mots";
  } else if (hasLearnedToday.value) {
    return "Voir les mots appris";
  }
  return "Voir la session";
});

// Helper for French pluralization
function pluralize(count: number, singular: string, plural?: string): string {
  return count <= 1 ? singular : plural ?? singular + "s";
}
</script>

<template>
  <div class="mb-8 flex gap-4 flex-col items-center">
    <h2 class="text-xl font-semibold font-heading w-full">Aujourd'hui</h2>

    <div class="flex gap-2 w-full md:flex-row flex-col">
      <Item variant="muted" class="w-full">
        <ItemHeader>
          <RepeatIcon />
        </ItemHeader>

        <ItemContent>
          <ItemTitle class="text-base">À réviser</ItemTitle>

          <ItemDescription>
            <template v-if="statsLoading">
              <Skeleton class="h-4 w-12" />
            </template>
            <template v-else>
              {{ stats?.dueReviews ?? 0 }}
              {{ pluralize(stats?.dueReviews ?? 0, "mot") }}
            </template>
          </ItemDescription>
        </ItemContent>
      </Item>

      <Item variant="muted" class="w-full">
        <ItemHeader>
          <SparklesIcon />
        </ItemHeader>

        <ItemContent>
          <ItemTitle class="text-base">Nouveaux</ItemTitle>

          <ItemDescription>
            <template v-if="statsLoading">
              <Skeleton class="h-4 w-12" />
            </template>
            <template v-else>
              {{ stats?.newItems ?? 0 }}
              {{ pluralize(stats?.newItems ?? 0, "mot") }}
            </template>
          </ItemDescription>
        </ItemContent>
      </Item>

      <Item variant="muted" class="w-full">
        <ItemHeader>
          <FlameIcon />
        </ItemHeader>

        <ItemContent>
          <ItemTitle class="text-base">Série</ItemTitle>

          <ItemDescription>
            <template v-if="statsLoading">
              <Skeleton class="h-4 w-12" />
            </template>
            <template v-else>
              {{ stats?.currentStreak ?? 0 }} jour{{
                (stats?.currentStreak ?? 0) > 1 ? "s" : ""
              }}
            </template>
          </ItemDescription>
        </ItemContent>
      </Item>
    </div>

    <RouterLink to="/review" class="w-full flex justify-center">
      <Button>
        {{ buttonText }}
      </Button>
    </RouterLink>
  </div>

  <h2 class="text-lg font-semibold mb-4 font-heading">Leçons</h2>

  <div v-if="isLoading" class="space-y-3">
    <Skeleton v-for="i in 5" :key="i" class="w-full h-20" />
  </div>

  <Alert v-else-if="error" variant="destructive">
    <AlertCircleIcon />
    <AlertTitle>Impossible d'obtenir les leçons</AlertTitle>
    <AlertDescription>
      <p>{{ error.message }}</p>
    </AlertDescription>
  </Alert>

  <div v-else-if="lessons" class="space-y-4">
    <Item v-for="lesson in lessons" :key="lesson.id" as-child>
      <RouterLink :to="`/learn/${lesson.id}`" class="block">
        <ItemMedia>
          <div class="text-3xl">{{ lesson.icon }}</div>
        </ItemMedia>

        <ItemContent>
          <ItemTitle> {{ lesson.title }}</ItemTitle>
          <ItemDescription>
            {{ lesson.description }}

            <Progress
              :model-value="lesson.progress"
              class="mt-2 h-1.5 bg-secondary"
            />
          </ItemDescription>
        </ItemContent>

        <ItemActions>
          <div class="text-sm text-muted-foreground">
            {{ lesson.completedItems }}/{{ lesson.totalItems }}
          </div>
        </ItemActions>
      </RouterLink>
    </Item>
  </div>
</template>
