/**
 * AudioEncoders — WAV (hand-written PCM) + WebCodecs AAC/Opus.
 * MP3 is in a separate file (Mp3Encoder.ts) since it needs a WASM library.
 */

export interface AudioEncodeOptions {
  sampleRate: number;
  channels: number;
  bitrate?: number;  // kbps, for AAC/Opus
}

// ── WAV ─────────────────────────────────────────────────────────

/**
 * Encode an AudioBuffer to a 16-bit PCM WAV blob.
 * Manual header + PCM writer — no dependencies.
 */
export function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const fileSize = 44 + dataSize;

  const ab = new ArrayBuffer(fileSize);
  const view = new DataView(ab);
  let off = 0;
  const writeStr = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off++, s.charCodeAt(i));
  };

  // RIFF header
  writeStr('RIFF');
  view.setUint32(off, fileSize - 8, true); off += 4;
  writeStr('WAVE');

  // fmt chunk
  writeStr('fmt ');
  view.setUint32(off, 16, true); off += 4;          // subchunk size
  view.setUint16(off, 1, true); off += 2;           // PCM format
  view.setUint16(off, numChannels, true); off += 2;
  view.setUint32(off, sampleRate, true); off += 4;
  view.setUint32(off, byteRate, true); off += 4;
  view.setUint16(off, blockAlign, true); off += 2;
  view.setUint16(off, 16, true); off += 2;          // bits per sample

  // data chunk
  writeStr('data');
  view.setUint32(off, dataSize, true); off += 4;

  // Interleave channels + convert float → int16
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) channelData.push(buffer.getChannelData(ch));

  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channelData[ch][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }

  return new Blob([ab], { type: 'audio/wav' });
}

// ── WebCodecs AAC / Opus ────────────────────────────────────────

export type WebCodecsAudioCodec = 'aac' | 'opus';

export interface EncodedAudioChunkOut {
  chunk: EncodedAudioChunk;
  meta?: EncodedAudioChunkMetadata;
}

export interface WebCodecsAudioResult {
  chunks: EncodedAudioChunkOut[];
  codecString: string;
}

/**
 * Encode an AudioBuffer with WebCodecs AudioEncoder.
 * Returns raw EncodedAudioChunks (for muxing) — no container.
 *
 * For a container-wrapped file (e.g. .m4a), use the mp4-muxer output-only
 * path in ExportEngine (Stage F wires this up).
 */
export async function encodeWithWebCodecs(
  buffer: AudioBuffer,
  codec: WebCodecsAudioCodec,
  opts: AudioEncodeOptions,
): Promise<WebCodecsAudioResult> {
  if (typeof (globalThis as any).AudioEncoder === 'undefined') {
    throw new Error(
      `WebCodecs AudioEncoder is not available in this browser. ` +
      `Try MP3 or WAV instead.`,
    );
  }

  const codecString = codec === 'aac' ? 'mp4a.40.2' : 'opus';

  const support = await AudioEncoder.isConfigSupported({
    codec: codecString,
    sampleRate: opts.sampleRate,
    numberOfChannels: opts.channels,
    bitrate: (opts.bitrate ?? 128) * 1000,
  });
  if (!support.supported) {
    throw new Error(
      `${codec.toUpperCase()} @ ${opts.sampleRate}Hz, ${opts.channels}ch not supported on this browser`,
    );
  }

  const chunks: EncodedAudioChunkOut[] = [];
  let encodeError: Error | null = null;

  const encoder = new AudioEncoder({
    output: (chunk, meta) => {
      chunks.push({ chunk, meta });
    },
    error: (err) => {
      encodeError = new Error(`AudioEncoder error: ${err.message}`);
    },
  });

  encoder.configure({
    codec: codecString,
    sampleRate: opts.sampleRate,
    numberOfChannels: opts.channels,
    bitrate: (opts.bitrate ?? 128) * 1000,
  });

  // Break the AudioBuffer into ~10ms chunks and feed to encoder
  const chunkSize = Math.floor(opts.sampleRate * 0.01);  // 10ms
  const totalFrames = buffer.length;

  // Interleave into Float32
  const interleaved = new Float32Array(totalFrames * opts.channels);
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < opts.channels; ch++) {
    channelData.push(buffer.numberOfChannels > ch ? buffer.getChannelData(ch) : buffer.getChannelData(0));
  }
  for (let i = 0; i < totalFrames; i++) {
    for (let ch = 0; ch < opts.channels; ch++) {
      interleaved[i * opts.channels + ch] = channelData[ch][i];
    }
  }

  let offset = 0;
  let timestampUs = 0;
  const usPerFrame = 1_000_000 / opts.sampleRate;

  while (offset < totalFrames) {
    if (encodeError) throw encodeError;

    const framesThisChunk = Math.min(chunkSize, totalFrames - offset);
    const slice = new Float32Array(framesThisChunk * opts.channels);
    slice.set(interleaved.subarray(offset * opts.channels, (offset + framesThisChunk) * opts.channels));

    const audioData = new AudioData({
      format: 'f32',
      sampleRate: opts.sampleRate,
      numberOfFrames: framesThisChunk,
      numberOfChannels: opts.channels,
      timestamp: timestampUs,
      data: slice,
    });

    encoder.encode(audioData);
    audioData.close();

    offset += framesThisChunk;
    timestampUs = Math.round(offset * usPerFrame);

    // Yield occasionally so main thread stays responsive
    if (offset % (chunkSize * 100) === 0) await new Promise(r => setTimeout(r, 0));
  }

  await encoder.flush();
  encoder.close();

  if (encodeError) throw encodeError;

  return { chunks, codecString };
}

/**
 * Convenience: WebCodecs Opus in an Ogg container.
 * (Simple wrapper — for muxing into WebM/MP4 use encodeWithWebCodecs directly.)
 *
 * Currently: not implemented as a standalone .opus file since Ogg-Opus
 * container writing is 200+ lines. Users get Opus inside .webm via video
 * export. For a standalone Opus file, we'd need an Ogg muxer. Stage F+.
 */