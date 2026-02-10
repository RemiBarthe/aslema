<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, RouterView, useRouter } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import { devSimulateDays, devResetProgress } from "@/lib/api";
import Button from "@/components/ui/button/Button.vue";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "vue-sonner";
import { FastForwardIcon, RotateCcwIcon } from "lucide-vue-next";

const queryClient = useQueryClient();
const router = useRouter();
const isDevMode = ref(import.meta.env.DEV);

async function handleSimulateDay() {
  if (!confirm("Simuler le passage d'1 jour ?")) return;
  try {
    await devSimulateDays(1);
    // Force refetch all queries to see updated data
    await queryClient.refetchQueries();
    toast.success("Jour simulé avec succès");
  } catch (error) {
    console.error("Failed to simulate day:", error);
    toast.error("Erreur lors de la simulation du jour");
  }
}

async function handleReset() {
  if (!confirm("Réinitialiser tout ton apprentissage ?")) return;
  try {
    await devResetProgress();
    await queryClient.refetchQueries();
    router.push("/");
    toast.success("Progression réinitialisée");
  } catch (error) {
    console.error("Failed to reset progress:", error);
    toast.error("Erreur lors de la réinitialisation");
  }
}
</script>

<template>
  <div class="min-h-screen bg-background max-w-4xl mx-auto pb-20">
    <Toaster position="top-center" />
    <header
      class="sticky top-0 z-10 p-4 bg-background flex items-center justify-between"
    >
      <RouterLink
        to="/"
        class="font-heading text-xl font-black flex items-center gap-2"
      >
        <img src="/logo.svg" alt="Aslema" class="size-6" />
        Aslema
      </RouterLink>

      <div v-if="isDevMode" class="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          @click="handleSimulateDay"
          title="Simuler +1 jour"
        >
          <FastForwardIcon class="size-4" />
          <span class="hidden sm:inline ml-1">+1 jour</span>
        </Button>
        <Button variant="outline" size="sm" @click="handleReset" title="Reset">
          <RotateCcwIcon class="size-4" />
          <span class="hidden sm:inline ml-1">Reset</span>
        </Button>
      </div>
    </header>

    <main class="p-4">
      <RouterView />
    </main>
  </div>
</template>
