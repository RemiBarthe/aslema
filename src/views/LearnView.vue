<script setup lang="ts">
import { RouterLink } from "vue-router";
import Button from "@/components/ui/button/Button.vue";
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
    <div class="text-center">
      <h1 class="font-heading text-3xl font-bold">Leçons</h1>
      <p class="mt-2 text-muted-foreground">Choisis une leçon pour commencer</p>
    </div>

    <div class="grid gap-4 w-full max-w-xs">
      <div class="rounded-lg border bg-card p-4 text-card-foreground">
        <h3 class="font-semibold">Les salutations</h3>
        <p class="text-sm text-muted-foreground">Ahla, labess, bahi...</p>
      </div>

      <div class="rounded-lg border bg-card p-4 text-card-foreground">
        <h3 class="font-semibold">Les chiffres</h3>
        <p class="text-sm text-muted-foreground">Wa7ed, zouz, tletha...</p>
      </div>

      <div class="rounded-lg border bg-card p-4 text-card-foreground">
        <h3 class="font-semibold">Les questions</h3>
        <p class="text-sm text-muted-foreground">9alech, kifech, winou...</p>
      </div>
    </div>

    <Button as-child variant="outline">
      <RouterLink to="/">← Retour</RouterLink>
    </Button>
  </div>
</template>
