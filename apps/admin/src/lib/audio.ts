import { Mp3Encoder } from "@breezystack/lamejs";

/**
 * Normalize audio volume and encode to MP3
 */
export async function normalizeAudio(audioBlob: Blob): Promise<Blob> {
  const audioContext = new AudioContext();

  // Decode audio data
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Find peak amplitude
  let maxAmplitude = 0;
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < channelData.length; i++) {
      const absValue = Math.abs(channelData[i]);
      if (absValue > maxAmplitude) {
        maxAmplitude = absValue;
      }
    }
  }

  // Calculate normalization gain (target: 0.9 to avoid clipping)
  const targetPeak = 0.9;
  const gain = maxAmplitude > 0 ? targetPeak / maxAmplitude : 1;

  // Apply gain if needed (only if audio is too quiet)
  if (gain > 1.1) {
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] *= gain;
      }
    }
  }

  // Encode to MP3
  const mp3Blob = encodeToMp3(audioBuffer);

  await audioContext.close();

  return mp3Blob;
}

/**
 * Encode AudioBuffer to MP3 using lamejs
 */
function encodeToMp3(audioBuffer: AudioBuffer): Blob {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;

  // Convert to 16-bit PCM
  const left = convertTo16Bit(audioBuffer.getChannelData(0));
  const right =
    numChannels > 1
      ? convertTo16Bit(audioBuffer.getChannelData(1))
      : left;

  // Create MP3 encoder (128 kbps)
  const mp3Encoder = new Mp3Encoder(numChannels, sampleRate, 128);
  const mp3Data: Uint8Array[] = [];

  // Encode in chunks
  const chunkSize = 1152;
  for (let i = 0; i < left.length; i += chunkSize) {
    const leftChunk = left.subarray(i, i + chunkSize);
    const rightChunk = right.subarray(i, i + chunkSize);

    const mp3buf =
      numChannels === 1
        ? mp3Encoder.encodeBuffer(leftChunk)
        : mp3Encoder.encodeBuffer(leftChunk, rightChunk);

    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  // Flush remaining data
  const mp3End = mp3Encoder.flush();
  if (mp3End.length > 0) {
    mp3Data.push(mp3End);
  }

  return new Blob(mp3Data as BlobPart[], { type: "audio/mp3" });
}

/**
 * Convert Float32Array to Int16Array for MP3 encoding
 */
function convertTo16Bit(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const sample = float32Array[i] ?? 0;
    const s = Math.max(-1, Math.min(1, sample));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}
