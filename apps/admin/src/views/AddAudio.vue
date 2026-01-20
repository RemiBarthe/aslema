<script setup lang="ts">
import { ref, computed } from "vue";
import { toast } from "vue-sonner";
import { getRandomItemWithoutAudio, uploadItemAudio } from "@/lib/api";
import { normalizeAudio } from "@/lib/audio";
import { Button } from "@/components/ui/button";

const currentItem = ref<{
  id: number;
  tunisian: string;
  translation?: string;
} | null>(null);
const isLoading = ref(false);
const isSubmitting = ref(false);

// Audio recording state
const isRecording = ref(false);
const audioBlob = ref<Blob | null>(null);
const audioUrl = ref<string | null>(null);
const mediaRecorder = ref<MediaRecorder | null>(null);

const hasRecording = computed(() => audioBlob.value !== null);

async function loadRandomItem() {
  isLoading.value = true;
  resetRecording();
  try {
    const item = await getRandomItemWithoutAudio();
    if (!item) {
      toast.info("Aucun item sans audio trouvé");
      currentItem.value = null;
    } else {
      currentItem.value = item;
    }
  } catch (error) {
    console.error("Failed to load random item:", error);
    toast.error("Erreur lors du chargement de l'item");
  } finally {
    isLoading.value = false;
  }
}

function resetRecording() {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }
  audioBlob.value = null;
  audioUrl.value = null;
  isRecording.value = false;
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      audioBlob.value = blob;
      audioUrl.value = URL.createObjectURL(blob);
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.value = recorder;
    recorder.start();
    isRecording.value = true;
  } catch (error) {
    console.error("Failed to start recording:", error);
    toast.error("Impossible d'accéder au microphone");
  }
}

function stopRecording() {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop();
    isRecording.value = false;
  }
}

async function handleSubmit() {
  if (!currentItem.value || !audioBlob.value) {
    toast.error("Veuillez enregistrer un audio");
    return;
  }

  isSubmitting.value = true;
  try {
    // Normalize audio volume before upload
    const normalizedBlob = await normalizeAudio(audioBlob.value);
    await uploadItemAudio(currentItem.value.id, normalizedBlob);
    toast.success("Audio ajouté avec succès");

    // Load next item
    await loadRandomItem();
  } catch (error) {
    console.error("Failed to upload audio:", error);
    toast.error("Erreur lors de l'envoi de l'audio");
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
    <h1 class="text-3xl font-bold mb-8">Enregistrer un audio</h1>

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
      <!-- Item display -->
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

      <!-- Audio recorder -->
      <div class="p-6 border rounded-lg space-y-4">
        <div class="flex items-center justify-center gap-4">
          <!-- Record button -->
          <Button
            v-if="!isRecording"
            @click="startRecording"
            variant="outline"
            size="lg"
            class="w-16 h-16 rounded-full p-0"
            :disabled="isSubmitting"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="text-red-500"
            >
              <circle cx="12" cy="12" r="8" />
            </svg>
          </Button>

          <!-- Stop button -->
          <Button
            v-else
            @click="stopRecording"
            variant="destructive"
            size="lg"
            class="w-16 h-16 rounded-full p-0 animate-pulse"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </Button>
        </div>

        <p class="text-center text-sm text-muted-foreground">
          <span v-if="isRecording" class="text-red-500 font-medium"
            >Enregistrement en cours...</span
          >
          <span v-else-if="!hasRecording"
            >Cliquez pour enregistrer</span
          >
          <span v-else>Enregistrement terminé</span>
        </p>

        <!-- Audio player -->
        <div v-if="hasRecording && audioUrl" class="space-y-3">
          <audio :src="audioUrl" controls class="w-full" />
          <Button
            variant="ghost"
            size="sm"
            @click="resetRecording"
            class="w-full"
          >
            Recommencer
          </Button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <Button
          @click="handleSubmit"
          :disabled="!hasRecording || isSubmitting"
          class="flex-1"
        >
          {{ isSubmitting ? "Envoi en cours..." : "Envoyer" }}
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
    </div>
  </div>
</template>
