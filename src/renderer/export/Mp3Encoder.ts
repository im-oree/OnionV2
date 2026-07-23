/**
 * Mp3Encoder — MP3 encoding via @breezystack/lamejs.
 * Feeds an AudioBuffer through lamejs and produces an MP3 Blob.
 */
import lamejs from '@breezystack/lamejs';

export interface Mp3EncodeOptions {
  bitrate: number;    // kbps (96, 128, 192, 256, 320)
  channels?: 1 | 2;   // derived from buffer if omitted
  sampleRate?: number; // derived from buffer if omitted
}

/**
 * Encode an AudioBuffer to MP3 Blob (blocks main thread briefly for short
 * clips; for very long audio consider chunking with await yields).
 */
export function encodeMp3(
  buffer: AudioBuffer,
  opts: Mp3EncodeOptions,
): Blob {
  const channels = opts.channels ?? (buffer.numberOfChannels >= 2 ? 2 : 1);
  const sampleRate = opts.sampleRate ?? buffer.sampleRate;
  const bitrate = opts.bitrate;

  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitrate);
  const numSamples = buffer.length;
  const samplesPerFrame = 1152;
  const parts: Uint8Array[] = [];

  // Convert Float32 [-1,1] → Int16 for lamejs
  const leftFloat = buffer.getChannelData(0);
  const rightFloat = channels === 2
    ? (buffer.numberOfChannels >= 2 ? buffer.getChannelData(1) : leftFloat)
    : null;

  const leftInt16 = new Int16Array(numSamples);
  const rightInt16 = rightFloat ? new Int16Array(numSamples) : null;
  for (let i = 0; i < numSamples; i++) {
    leftInt16[i] = Math.max(-32768, Math.min(32767, Math.round(leftFloat[i] * 32767)));
    if (rightInt16) {
      rightInt16[i] = Math.max(-32768, Math.min(32767, Math.round(rightFloat![i] * 32767)));
    }
  }

  for (let i = 0; i < numSamples; i += samplesPerFrame) {
    const end = Math.min(i + samplesPerFrame, numSamples);
    const l = leftInt16.subarray(i, end);
    const enc = rightInt16
      ? encoder.encodeBuffer(l, rightInt16.subarray(i, end))
      : encoder.encodeBuffer(l);
    if (enc.length > 0) parts.push(enc);
  }

  const flushed = encoder.flush();
  if (flushed.length > 0) parts.push(flushed);

  return new Blob(parts, { type: 'audio/mpeg' });
}