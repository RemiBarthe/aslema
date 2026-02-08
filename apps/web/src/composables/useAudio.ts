import { ref } from "vue";

const CDN_URL = import.meta.env.VITE_CDN_URL || "https://cdn.aslema.app";

// Singleton audio element for playing sounds
let audioElement: HTMLAudioElement | null = null;

const isPlaying = ref(false);
const currentAudioFile = ref<string | null>(null);

export function useAudio() {
  function playAudio(audioFile: string | null) {
    if (!audioFile) return;

    // Create audio element if it doesn't exist
    if (!audioElement) {
      audioElement = new Audio();
      audioElement.addEventListener("ended", () => {
        isPlaying.value = false;
        currentAudioFile.value = null;
      });
      audioElement.addEventListener("error", () => {
        isPlaying.value = false;
        currentAudioFile.value = null;
      });
    }

    // Stop current audio if playing
    if (isPlaying.value) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    // Play new audio from CDN
    const audioUrl = `${CDN_URL}/audio/${audioFile}`;
    audioElement.src = audioUrl;
    currentAudioFile.value = audioFile;
    isPlaying.value = true;
    audioElement.play().catch(() => {
      isPlaying.value = false;
      currentAudioFile.value = null;
    });
  }

  function isPlayingFile(audioFile: string | null): boolean {
    return isPlaying.value && currentAudioFile.value === audioFile;
  }

  return {
    playAudio,
    isPlaying,
    isPlayingFile,
    currentAudioFile,
  };
}
