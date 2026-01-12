<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useLessons } from "@/composables/useQueries";

const { data: lessons, isLoading, error } = useLessons();
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header
      class="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-4"
    >
      <h1 class="font-heading text-xl font-bold">Aslema</h1>
    </header>

    <!-- Content -->
    <main class="p-4 pb-20">
      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center py-12">
        <div
          class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-12 text-destructive">
        {{ error.message }}
      </div>

      <!-- Lessons List -->
      <div v-else-if="lessons" class="space-y-3">
        <h2 class="text-lg font-semibold mb-4">Leçons</h2>

        <RouterLink
          v-for="lesson in lessons"
          :key="lesson.id"
          :to="`/learn/${lesson.id}`"
          class="block"
        >
          <div
            class="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
          >
            <!-- Icon -->
            <div class="text-3xl">{{ lesson.icon }}</div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <h3 class="font-medium truncate">{{ lesson.title }}</h3>
              <p class="text-sm text-muted-foreground truncate">
                {{ lesson.description }}
              </p>

              <!-- Progress bar -->
              <div class="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary transition-all"
                  :style="{ width: `${lesson.progress}%` }"
                />
              </div>
            </div>

            <!-- Progress text -->
            <div class="text-sm text-muted-foreground">
              {{ lesson.completedItems }}/{{ lesson.totalItems }}
            </div>
          </div>
        </RouterLink>
      </div>
    </main>
  </div>
</template>
