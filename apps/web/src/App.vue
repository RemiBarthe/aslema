<script setup lang="ts">
import { RouterView } from "vue-router";
</script>

<template>
  <div class="min-h-screen bg-background max-w-4xl mx-auto">
    <header class="sticky top-0 z-10 p-4 bg-background">
      <h1 class="font-heading text-xl font-black">Aslema</h1>
    </header>

    <main class="p-4">
      <RouterView />
    </main>
  </div>
</template>
