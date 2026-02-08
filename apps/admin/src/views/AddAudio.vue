<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick } from "vue";
import { toast } from "vue-sonner";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, {
  type Region,
} from "wavesurfer.js/dist/plugins/regions.js";
import { Circle, Square, Play, Pause, RotateCcw } from "lucide-vue-next";
import { getRandomItemWithoutAudio, uploadItemAudio } from "@/lib/api";
import { normalizeAudio, cropAudio } from "@/lib/audio";
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
const mediaRecorder = ref<MediaRecorder | null>(null);

// Wavesurfer state
const waveformContainer = ref<HTMLElement | null>(null);
const wavesurfer = ref<WaveSurfer | null>(null);
const regionsPlugin = ref<RegionsPlugin | null>(null);
const activeRegion = ref<Region | null>(null);
const regionStart = ref(0);
const regionEnd = ref(0);
const isPlaying = ref(false);

const hasRecording = computed(() => audioBlob.value !== null);
const hasCropRegion = computed(() => activeRegion.value !== null);

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
}

function initWavesurfer(blob: Blob) {
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
    sampleRate: 48000, // Force consistent sample rate
    plugins: [regions],
  });

  ws.loadBlob(blob);

  ws.on("ready", () => {
    // Create initial region covering full audio
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

  // Stop playback when reaching the end of the region
  ws.on("timeupdate", (currentTime: number) => {
    if (isPlaying.value && currentTime >= regionEnd.value) {
      ws.pause();
      ws.setTime(regionStart.value);
    }
  });

  // Update region values when it changes
  regions.on("region-updated", (region: Region) => {
    activeRegion.value = region;
    regionStart.value = region.start;
    regionEnd.value = region.end;
  });

  wavesurfer.value = ws;
}

// Watch for blob changes to init wavesurfer
watch(audioBlob, async (blob) => {
  if (blob) {
    // Wait for DOM to update (v-if="hasRecording" to render the container)
    await nextTick();
    // Additional small delay for browser rendering
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

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      audioBlob.value = blob;
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
    // Start from region start
    wavesurfer.value.setTime(regionStart.value);
    wavesurfer.value.play();
  }
}

async function handleSubmit() {
  if (!currentItem.value || !audioBlob.value) {
    toast.error("Veuillez enregistrer un audio");
    return;
  }

  isSubmitting.value = true;
  try {
    let processedBlob = audioBlob.value;

    // Crop audio if region is selected and not the full audio
    if (wavesurfer.value) {
      const duration = wavesurfer.value.getDuration();

      // Only crop if the region is different from full audio
      if (regionStart.value > 0.01 || regionEnd.value < duration - 0.01) {
        processedBlob = await cropAudio(
          processedBlob,
          regionStart.value,
          regionEnd.value,
        );
      }
    }

    // Normalize audio volume before upload
    const normalizedBlob = await normalizeAudio(processedBlob);
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

onUnmounted(() => {
  destroyWavesurfer();
});
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
            <Circle class="w-6 h-6 fill-red-500 text-red-500" />
          </Button>

          <!-- Stop button -->
          <Button
            v-else
            @click="stopRecording"
            variant="destructive"
            size="lg"
            class="w-16 h-16 rounded-full p-0 animate-pulse"
          >
            <Square class="w-6 h-6 fill-current" />
          </Button>
        </div>

        <p class="text-center text-sm text-muted-foreground">
          <span v-if="isRecording" class="text-red-500 font-medium"
            >Enregistrement en cours...</span
          >
          <span v-else-if="!hasRecording">Cliquez pour enregistrer</span>
          <span v-else>Glissez les bords pour ajuster la sélection</span>
        </p>

        <!-- Waveform visualization -->
        <div v-if="hasRecording" class="space-y-3">
          <div
            ref="waveformContainer"
            class="w-full bg-muted/50 rounded-lg overflow-hidden"
          />

          <div class="flex items-center justify-center gap-2">
            <!-- Play/Pause button -->
            <Button
              variant="outline"
              size="sm"
              @click="togglePlayback"
              class="gap-2"
            >
              <Play v-if="!isPlaying" class="w-4 h-4" />
              <Pause v-else class="w-4 h-4" />
              {{ isPlaying ? "Pause" : "Écouter" }}
              <span v-if="hasCropRegion" class="text-xs text-muted-foreground">
                (sélection)
              </span>
            </Button>

            <!-- Reset button -->
            <Button
              variant="ghost"
              size="sm"
              @click="resetRecording"
              class="gap-2"
            >
              <RotateCcw class="w-4 h-4" />
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
