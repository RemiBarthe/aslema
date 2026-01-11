<script setup lang="ts">
import { RouterLink } from "vue-router";
import Button from "@/components/ui/button/Button.vue";
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
    <div class="text-center">
      <h1 class="font-heading text-4xl font-bold">Ahla! 👋</h1>
      <p class="mt-2 text-muted-foreground">Apprends le tunisien facilement</p>
    </div>

    <div class="flex flex-col gap-4 w-full max-w-xs">
      <Button as-child size="lg" class="w-full">
        <RouterLink to="/learn">Commencer à apprendre</RouterLink>
      </Button>
    </div>
  </div>
</template>
