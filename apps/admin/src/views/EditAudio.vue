<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick } from "vue";
import { toast } from "vue-sonner";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, {
  type Region,
} from "wavesurfer.js/dist/plugins/regions.js";
import {
  Circle,
  Square,
  Play,
  Pause,
  RotateCcw,
  Search,
} from "lucide-vue-next";
import { getItemsWithAudio, uploadItemAudio } from "@/lib/api";
import { normalizeAudio, cropAudio } from "@/lib/audio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CDN_URL = import.meta.env.VITE_CDN_URL || "https://cdn.aslema.app";

type ItemWithAudio = {
  id: number;
  tunisian: string;
  audioFile: string;
  translation?: string;
};

const searchQuery = ref("");
const items = ref<ItemWithAudio[]>([]);
const isLoadingItems = ref(false);
const selectedItem = ref<ItemWithAudio | null>(null);
const isSubmitting = ref(false);

// Edit mode: 'existing' to crop existing audio, 'record' for new recording
const editMode = ref<"existing" | "record" | null>(null);
const isLoadingExisting = ref(false);
const existingAudioBlob = ref<Blob | null>(null);

// Audio recording state
const isRecording = ref(false);
const audioBlob = ref<Blob | null>(null);
const mediaRecorder = ref<MediaRecorder | null>(null);

// Wavesurfer state
const waveformContainer = ref<HTMLElement | null>(null);
const wavesurfer = ref<WaveSurfer | null>(null);
const regionsPlugin = ref<RegionsPlugin | null>(null);
const activeRegion = ref<Region | null>(null);
const regionStart = ref(0);
const regionEnd = ref(0);
const isPlaying = ref(false);

const hasAudioLoaded = computed(() => audioBlob.value !== null || editMode.value === "existing");
const hasCropRegion = computed(() => activeRegion.value !== null);

async function loadItems() {
  isLoadingItems.value = true;
  try {
    items.value = await getItemsWithAudio(searchQuery.value || undefined);
  } catch (error) {
    console.error("Failed to load items:", error);
    toast.error("Erreur lors du chargement des items");
  } finally {
    isLoadingItems.value = false;
  }
}

async function selectItem(item: ItemWithAudio) {
  resetAll();
  selectedItem.value = item;
  // Auto-load existing audio
  await loadExistingAudio();
}

function deselectItem() {
  resetAll();
  selectedItem.value = null;
}

function resetAll() {
  destroyWavesurfer();
  audioBlob.value = null;
  existingAudioBlob.value = null;
  isRecording.value = false;
  editMode.value = null;
  isLoadingExisting.value = false;
}

function destroyWavesurfer() {
  if (wavesurfer.value) {
    wavesurfer.value.destroy();
    wavesurfer.value = null;
    regionsPlugin.value = null;
    activeRegion.value = null;
    regionStart.value = 0;
    regionEnd.value = 0;
    isPlaying.value = false;
  }
}

function resetRecording() {
  destroyWavesurfer();
  audioBlob.value = null;
  isRecording.value = false;
  editMode.value = null;
}

function initWavesurfer(source: Blob | string) {
  if (!waveformContainer.value) return;

  destroyWavesurfer();

  const regions = RegionsPlugin.create();
  regionsPlugin.value = regions;

  const ws = WaveSurfer.create({
    container: waveformContainer.value,
    waveColor: "#a1a1aa",
    progressColor: "#3b82f6",
    cursorColor: "#3b82f6",
    height: 80,
    normalize: true,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    sampleRate: 48000,
    plugins: [regions],
  });

  if (typeof source === "string") {
    ws.load(source);
  } else {
    ws.loadBlob(source);
  }

  ws.on("ready", () => {
    const duration = ws.getDuration();
    const region = regions.addRegion({
      start: 0,
      end: duration,
      color: "rgba(59, 130, 246, 0.2)",
      drag: true,
      resize: true,
    });
    activeRegion.value = region;
    regionStart.value = 0;
    regionEnd.value = duration;
    isLoadingExisting.value = false;
  });

  ws.on("play", () => {
    isPlaying.value = true;
  });

  ws.on("pause", () => {
    isPlaying.value = false;
  });

  ws.on("finish", () => {
    isPlaying.value = false;
  });

  ws.on("timeupdate", (currentTime: number) => {
    if (isPlaying.value && currentTime >= regionEnd.value) {
      ws.pause();
      ws.setTime(regionStart.value);
    }
  });

  regions.on("region-updated", (region: Region) => {
    activeRegion.value = region;
    regionStart.value = region.start;
    regionEnd.value = region.end;
  });

  wavesurfer.value = ws;
}

async function loadExistingAudio() {
  if (!selectedItem.value) return;

  isLoadingExisting.value = true;
  editMode.value = "existing";

  try {
    // Fetch audio manually to handle CORS properly
    // Add cache-busting param to bypass CDN cache without CORS headers
    const url = `${CDN_URL}/audio/${selectedItem.value.audioFile}?v=${Date.now()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch audio");
    }
    const blob = await response.blob();
    existingAudioBlob.value = blob;

    await nextTick();
    setTimeout(() => {
      if (waveformContainer.value) {
        initWavesurfer(blob);
      }
    }, 10);
  } catch (error) {
    console.error("Failed to load existing audio:", error);
    toast.error("Erreur lors du chargement de l'audio");
    isLoadingExisting.value = false;
    editMode.value = null;
  }
}

watch(audioBlob, async (blob) => {
  if (blob) {
    editMode.value = "record";
    await nextTick();
    setTimeout(() => {
      if (waveformContainer.value) {
        initWavesurfer(blob);
      }
    }, 10);
  }
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: true,
        autoGainControl: false,
        sampleRate: 48000,
      },
    });
    const recorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      audioBlob.value = await normalizeAudio(blob);
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

function togglePlayback() {
  if (!wavesurfer.value) return;

  if (isPlaying.value) {
    wavesurfer.value.pause();
  } else {
    wavesurfer.value.setTime(regionStart.value);
    wavesurfer.value.play();
  }
}

async function handleSubmit() {
  if (!selectedItem.value || !editMode.value) {
    toast.error("Veuillez charger ou enregistrer un audio");
    return;
  }

  isSubmitting.value = true;
  try {
    let processedBlob: Blob;

    if (editMode.value === "record") {
      // Use the recorded blob
      if (!audioBlob.value) {
        toast.error("Veuillez enregistrer un audio");
        return;
      }
      processedBlob = audioBlob.value;
    } else {
      // Use the already loaded existing audio blob
      if (!existingAudioBlob.value) {
        toast.error("Audio non chargé");
        return;
      }
      processedBlob = existingAudioBlob.value;
    }

    // Crop if needed
    if (wavesurfer.value) {
      const duration = wavesurfer.value.getDuration();

      if (regionStart.value > 0.01 || regionEnd.value < duration - 0.01) {
        processedBlob = await cropAudio(
          processedBlob,
          regionStart.value,
          regionEnd.value,
        );
      }
    }

    const normalizedBlob = await normalizeAudio(processedBlob);
    await uploadItemAudio(selectedItem.value.id, normalizedBlob);
    toast.success("Audio mis à jour avec succès");

    // Refresh items list and deselect
    await loadItems();
    deselectItem();
  } catch (error) {
    console.error("Failed to upload audio:", error);
    toast.error("Erreur lors de l'envoi de l'audio");
  } finally {
    isSubmitting.value = false;
  }
}

// Search with debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadItems();
  }, 300);
});

onUnmounted(() => {
  destroyWavesurfer();
  if (searchTimeout) clearTimeout(searchTimeout);
});

// Load items on mount
loadItems();
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-8">Éditer les audios</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Items list -->
      <div class="space-y-4">
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <Input
            v-model="searchQuery"
            placeholder="Rechercher un item..."
            class="pl-10"
          />
        </div>

        <div
          v-if="isLoadingItems"
          class="text-center py-8 text-muted-foreground"
        >
          Chargement...
        </div>

        <div
          v-else-if="items.length === 0"
          class="text-center py-8 text-muted-foreground"
        >
          Aucun item avec audio trouvé
        </div>

        <div v-else class="space-y-2 max-h-[600px] overflow-y-auto">
          <button
            v-for="item in items"
            :key="item.id"
            @click="selectItem(item)"
            class="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            :class="{
              'border-primary bg-primary/5': selectedItem?.id === item.id,
            }"
          >
            <div class="font-medium">{{ item.tunisian }}</div>
            <div
              v-if="item.translation"
              class="text-sm text-muted-foreground"
            >
              {{ item.translation }}
            </div>
            <div class="text-xs text-muted-foreground mt-1">
              {{ item.audioFile }}
            </div>
          </button>
        </div>
      </div>

      <!-- Edit panel -->
      <div>
        <div
          v-if="!selectedItem"
          class="text-center py-12 border rounded-lg bg-muted/30"
        >
          <p class="text-muted-foreground">
            Sélectionnez un item pour éditer son audio
          </p>
        </div>

        <div v-else class="space-y-6">
          <!-- Item display -->
          <div class="p-6 border rounded-lg bg-muted/30">
            <div class="space-y-2">
              <div>
                <span class="text-sm text-muted-foreground">Tunisien:</span>
                <p class="text-2xl font-bold">{{ selectedItem.tunisian }}</p>
              </div>
              <div v-if="selectedItem.translation">
                <span class="text-sm text-muted-foreground">Traduction:</span>
                <p class="text-lg">{{ selectedItem.translation }}</p>
              </div>
            </div>

              <p class="text-xs text-muted-foreground mt-2">
              {{ selectedItem.audioFile }}
            </p>
          </div>

          <!-- Audio editor -->
          <div v-if="editMode" class="p-6 border rounded-lg space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-medium">
                {{ editMode === "existing" ? "Recropper l'audio" : "Nouvel enregistrement" }}
              </h3>
              <Button
                v-if="editMode === 'existing'"
                @click="resetAll(); editMode = 'record'"
                variant="ghost"
                size="sm"
                class="gap-2"
              >
                <Circle class="size-3 fill-red-500 text-red-500" />
                Réenregistrer
              </Button>
            </div>

            <!-- Recording controls (only for record mode without recording yet) -->
            <div
              v-if="editMode === 'record' && !audioBlob"
              class="flex items-center justify-center gap-4"
            >
              <Button
                v-if="!isRecording"
                @click="startRecording"
                variant="outline"
                size="lg"
                class="size-16 rounded-full p-0"
                :disabled="isSubmitting"
              >
                <Circle class="size-6 fill-red-500 text-red-500" />
              </Button>

              <Button
                v-else
                @click="stopRecording"
                variant="destructive"
                size="lg"
                class="size-16 rounded-full p-0 animate-pulse"
              >
                <Square class="size-6 fill-current" />
              </Button>
            </div>

            <p v-if="editMode === 'record' && !audioBlob" class="text-center text-sm text-muted-foreground">
              <span v-if="isRecording" class="text-red-500 font-medium"
                >Enregistrement en cours...</span
              >
              <span v-else>Cliquez pour enregistrer</span>
            </p>

            <!-- Loading state for existing audio -->
            <p v-if="isLoadingExisting" class="text-center text-muted-foreground py-4">
              Chargement de l'audio...
            </p>

            <!-- Waveform visualization -->
            <div v-if="editMode === 'existing' || audioBlob" class="space-y-3">
              <div
                ref="waveformContainer"
                class="waveform-container w-full bg-muted/50 rounded-lg overflow-hidden"
                :class="{ 'opacity-50': isLoadingExisting }"
              />

              <template v-if="!isLoadingExisting">
                <p class="text-center text-sm text-muted-foreground">
                  Glissez les bords pour ajuster la sélection
                </p>

                <div class="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="togglePlayback"
                    class="gap-2"
                  >
                    <Play v-if="!isPlaying" class="size-4" />
                    <Pause v-else class="size-4" />
                    {{ isPlaying ? "Pause" : "Écouter" }}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    @click="resetRecording"
                    class="gap-2"
                  >
                    <RotateCcw class="size-4" />
                    Recommencer
                  </Button>
                </div>

                <p
                  v-if="hasCropRegion"
                  class="text-center text-xs text-muted-foreground"
                >
                  Sélection: {{ regionStart.toFixed(2) }}s -
                  {{ regionEnd.toFixed(2) }}s
                </p>
              </template>
            </div>
          </div>

          <!-- Actions -->
          <div v-if="hasAudioLoaded && !isLoadingExisting" class="flex gap-3">
            <Button
              @click="handleSubmit"
              :disabled="!hasCropRegion || isSubmitting"
              class="flex-1"
            >
              {{ isSubmitting ? "Envoi en cours..." : "Sauvegarder" }}
            </Button>
            <Button
              type="button"
              variant="outline"
              @click="deselectItem"
              :disabled="isSubmitting"
            >
              Annuler
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.waveform-container {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: none;
}

.waveform-container > div::part(region-handle) {
  width: 10px !important;
  border-width: 3px !important;
}
</style>
