<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { Toaster } from "@/components/ui/sonner";
</script>

<template>
  <div class="min-h-screen bg-background">
    <Toaster position="top-center" />
    <header
      class="sticky top-0 z-10 p-4 bg-background border-b flex items-center justify-between"
    >
      <RouterLink to="/" class="text-xl font-bold">
        Aslema Admin
      </RouterLink>
      <nav class="flex gap-4">
        <RouterLink to="/" class="hover:underline">Ajouter Item</RouterLink>
        <RouterLink to="/audio" class="hover:underline">Ajouter Audio</RouterLink>
        <RouterLink to="/edit-audio" class="hover:underline">Éditer Audio</RouterLink>
      </nav>
    </header>

    <main class="max-w-4xl mx-auto p-8">
      <RouterView />
    </main>
  </div>
</template>
