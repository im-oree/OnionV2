/**
 * ExportEstimator — quick math for pre-flight estimates shown in the dialog.
 * These are approximations; actual output size depends on codec efficiency.
 */
import type { ExportSettings } from './types';
import { formatCategory, formatSupportsAudio } from './types';

export function estimateFileSize(settings: ExportSettings): number {
  const durationSec = Math.max(0.001,
    (settings.range.endFrame - settings.range.startFrame + 1) / settings.fps,
  );
  const cat = formatCategory(settings.format);

  let bytes = 0;

  if (cat === 'video') {
    // Video: bitrate * duration / 8
    bytes += (settings.bitrate * durationSec) / 8;
    // Audio (if included and supported)
    if (settings.includeAudio && formatSupportsAudio(settings.format)) {
      bytes += (settings.audioBitrate * 1000 * durationSec) / 8;
    }
    // Container overhead ~2%
    bytes *= 1.02;
  } else if (cat === 'sequence') {
    // PNG/JPG per frame estimate
    const frameCount = settings.range.endFrame - settings.range.startFrame + 1;
    const pixelCount = settings.width * settings.height;
    // Rough: PNG ~3 bytes/pixel with typical compression; JPG scales with quality
    const bytesPerFrame = settings.format === 'jpg-sequence'
      ? pixelCount * (0.1 + (settings.quality / 100) * 0.4)
      : pixelCount * 2.5;
    bytes = frameCount * bytesPerFrame;
    // ZIP compression ~10% for already-compressed images
    bytes *= 1.05;
  } else if (cat === 'frame') {
    const pixelCount = settings.width * settings.height;
    if (settings.format === 'frame-png') bytes = pixelCount * 3;
    else if (settings.format === 'frame-jpg') bytes = pixelCount * (0.1 + (settings.quality / 100) * 0.4);
    else bytes = pixelCount * 1.5; // webp
  } else if (cat === 'audio') {
    if (settings.format === 'audio-wav') {
      // PCM: sampleRate * channels * bytesPerSample * duration
      bytes = settings.audioSampleRate * settings.audioChannels * 2 * durationSec;
    } else {
      bytes = (settings.audioBitrate * 1000 * durationSec) / 8;
    }
  }

  return Math.round(bytes);
}

/**
 * Estimate render time (ms) based on frame count and complexity.
 * Very rough: assumes ~40ms per frame at 1080p for a moderate comp.
 * The engine will refine this after the first few frames render.
 */
export function estimateRenderTime(settings: ExportSettings): number {
  const frameCount = settings.range.endFrame - settings.range.startFrame + 1;
  const pixelCount = settings.width * settings.height;
  const complexityFactor = pixelCount / (1920 * 1080);

  // Base 35ms/frame at 1080p, scale by resolution
  let msPerFrame = 35 * complexityFactor;

  // Encoder speed modifier
  const cat = formatCategory(settings.format);
  if (cat === 'video') {
    if (settings.encoder === 'ffmpeg') msPerFrame *= 4;      // WASM is slow
    else if (settings.encoder === 'webcodecs') msPerFrame *= 0.8; // GPU accelerated
  } else if (cat === 'sequence') {
    msPerFrame *= 1.5; // PNG encoding is slower
  }

  // Priority modifier
  if (settings.priority === 'best') msPerFrame *= 2;
  else if (settings.priority === 'fast') msPerFrame *= 0.6;

  return Math.round(frameCount * msPerFrame);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  const h = Math.floor(m / 60);
  if (h === 0) return `${m}m ${s}s`;
  return `${h}h ${m % 60}m ${s}s`;
}