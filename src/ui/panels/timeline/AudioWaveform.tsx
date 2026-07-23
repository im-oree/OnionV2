/**
 * AudioWaveform — renders a waveform visualization inside an audio/video layer bar.
 * Uses Web Audio API's decodeAudioData to extract peak amplitude data,
 * then draws it as a canvas overlay on the layer bar.
 *
 * Optional `sourceStart` / `sourceEnd` props (0-1) render only a slice of
 * the source waveform, mapped to fill `width`. Used by segment pills so each
 * segment shows the correct portion of the source audio.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../../state/projectStore';
import { assetManager } from '../../../storage/AssetManager';

interface Props {
  assetId: string;
  width: number;
  height: number;
  color: string;
  /** If set, only render this slice of the source (as a fraction 0-1) */
  sourceStart?: number;  // 0..1
  sourceEnd?: number;    // 0..1
}

/** Cache decoded peak data by asset ID to avoid re-decoding on every render. */
const peakCache = new Map<string, Float32Array>();
const PEAK_RESOLUTION = 500;

/**
 * Decode audio file and extract peak amplitude data.
 * Returns an array of peak values (0-1) for rendering.
 */
async function decodePeaks(assetId: string): Promise<Float32Array> {
  if (peakCache.has(assetId)) return peakCache.get(assetId)!;

  // Resolve the audio URL
  let url: string | null = null;
  const fromManager = assetManager.getAsset(assetId);
  if (fromManager?.url) url = fromManager.url;
  if (!url) {
    const pa = useProjectStore.getState().project.assets.find(a => a.id === assetId);
    if (pa?.path) url = pa.path;
  }
  if (!url) return new Float32Array(PEAK_RESOLUTION).fill(0);

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const resp = await fetch(url);
    const arrayBuffer = await resp.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const rawData = audioBuffer.getChannelData(0);
    const peaks = new Float32Array(PEAK_RESOLUTION);
    const samplesPerBin = Math.max(1, Math.floor(rawData.length / PEAK_RESOLUTION));

    for (let i = 0; i < PEAK_RESOLUTION; i++) {
      let max = 0;
      const start = i * samplesPerBin;
      const end = Math.min(start + samplesPerBin, rawData.length);
      for (let j = start; j < end; j++) {
        const abs = Math.abs(rawData[j]);
        if (abs > max) max = abs;
      }
      peaks[i] = max;
    }

    peakCache.set(assetId, peaks);
    return peaks;
  } catch (err) {
    console.warn('[AudioWaveform] Failed to decode audio:', err);
    return new Float32Array(PEAK_RESOLUTION).fill(0);
  } finally {
    audioCtx.close();
  }
}

export const AudioWaveform: React.FC<Props> = React.memo(({
  assetId, width, height, color,
  sourceStart = 0,
  sourceEnd = 1,
}) => {
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    decodePeaks(assetId).then(data => {
      if (!cancelled) setPeaks(data);
    });
    return () => { cancelled = true; };
  }, [assetId]);

  useEffect(() => {
    if (!peaks || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (width <= 0) return;

    const midY = height / 2;
    const totalBins = peaks.length;

    // Compute which slice of peaks to render
    const startFrac = Math.max(0, Math.min(1, sourceStart));
    const endFrac = Math.max(startFrac, Math.min(1, sourceEnd));
    const binStart = Math.floor(startFrac * totalBins);
    const binEnd = Math.min(totalBins, Math.floor(endFrac * totalBins));
    const sliceBins = Math.max(1, binEnd - binStart);

    // Draw waveform as a mirrored shape — sample the slice into `width` pixels
    ctx.beginPath();
    ctx.moveTo(0, midY);

    // Top half (going right)
    for (let x = 0; x < width; x++) {
      const fractionAlongSlice = x / width;
      const binIdx = binStart + Math.floor(fractionAlongSlice * sliceBins);
      const amp = (peaks[binIdx] ?? 0) * midY * 0.9;
      ctx.lineTo(x, midY - amp);
    }

    // Bottom half (going left, mirrored)
    for (let x = width - 1; x >= 0; x--) {
      const fractionAlongSlice = x / width;
      const binIdx = binStart + Math.floor(fractionAlongSlice * sliceBins);
      const amp = (peaks[binIdx] ?? 0) * midY * 0.9;
      ctx.lineTo(x, midY + amp);
    }

    ctx.closePath();

    // Fill with semi-transparent white
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();

    // Stroke with slightly brighter white
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Draw center line
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }, [peaks, width, height, sourceStart, sourceEnd]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
});

AudioWaveform.displayName = 'AudioWaveform';
