<script setup lang="ts">
import { ref } from "vue";
import { toast } from "vue-sonner";
import { getRandomItemWithoutAudio, updateItemAudio } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const currentItem = ref<{
  id: number;
  tunisian: string;
  translation?: string;
} | null>(null);
const audioFile = ref("");
const isLoading = ref(false);
const isSubmitting = ref(false);

async function loadRandomItem() {
  isLoading.value = true;
  try {
    const item = await getRandomItemWithoutAudio();
    if (!item) {
      toast.info("Aucun item sans audio trouvé");
      currentItem.value = null;
    } else {
      currentItem.value = item;
      audioFile.value = "";
    }
  } catch (error) {
    console.error("Failed to load random item:", error);
    toast.error("Erreur lors du chargement de l'item");
  } finally {
    isLoading.value = false;
  }
}

async function handleSubmit() {
  if (!currentItem.value || !audioFile.value) {
    toast.error("Veuillez entrer le nom du fichier audio");
    return;
  }

  isSubmitting.value = true;
  try {
    await updateItemAudio(currentItem.value.id, audioFile.value);
    toast.success("Audio ajouté avec succès");

    // Load next item
    await loadRandomItem();
  } catch (error) {
    console.error("Failed to update audio:", error);
    toast.error("Erreur lors de l'ajout de l'audio");
  } finally {
    isSubmitting.value = false;
  }
}

function skip() {
  loadRandomItem();
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-8">Ajouter un audio à un item</h1>

    <div v-if="!currentItem && !isLoading" class="text-center py-12">
      <p class="text-muted-foreground mb-4">
        Chargez un item aléatoire sans audio
      </p>
      <Button @click="loadRandomItem">Charger un item</Button>
    </div>

    <div v-else-if="isLoading" class="text-center py-12">
      <p class="text-muted-foreground">Chargement...</p>
    </div>

    <div v-else-if="currentItem" class="space-y-6">
      <div class="p-6 border rounded-lg bg-muted/30">
        <div class="space-y-2">
          <div>
            <span class="text-sm text-muted-foreground">Tunisien:</span>
            <p class="text-2xl font-bold">{{ currentItem.tunisian }}</p>
          </div>
          <div v-if="currentItem.translation">
            <span class="text-sm text-muted-foreground">Traduction:</span>
            <p class="text-lg">{{ currentItem.translation }}</p>
          </div>
          <div>
            <span class="text-sm text-muted-foreground">ID:</span>
            <p class="text-sm">{{ currentItem.id }}</p>
          </div>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="space-y-2">
          <Label for="audioFile">Nom du fichier audio</Label>
          <Input
            id="audioFile"
            v-model="audioFile"
            placeholder="Ex: aslema.mp3"
            required
          />
          <p class="text-xs text-muted-foreground">
            Entrez le nom du fichier audio (avec extension)
          </p>
        </div>

        <div class="flex gap-3">
          <Button type="submit" :disabled="isSubmitting" class="flex-1">
            {{ isSubmitting ? "Enregistrement..." : "Ajouter l'audio" }}
          </Button>
          <Button
            type="button"
            variant="outline"
            @click="skip"
            :disabled="isSubmitting"
          >
            Passer
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>
