/**
 * AudioWaveform — renders a waveform visualization inside an audio layer bar.
 * Uses Web Audio API's decodeAudioData to extract peak amplitude data,
 * then draws it as an SVG path overlay on the layer bar.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../../state/projectStore';
import { assetManager } from '../../../storage/AssetManager';

interface Props {
  assetId: string;
  width: number;
  height: number;
  color: string;
}

/** Cache decoded peak data by asset ID to avoid re-decoding on every render. */
const peakCache = new Map<string, Float32Array>();

/**
 * Decode audio file and extract peak amplitude data.
 * Returns an array of peak values (0-1) for rendering.
 */
async function decodePeaks(assetId: string, numBins: number): Promise<Float32Array> {
  if (peakCache.has(assetId)) return peakCache.get(assetId)!;

  // Resolve the audio URL
  let url: string | null = null;
  const fromManager = assetManager.getAsset(assetId);
  if (fromManager?.url) url = fromManager.url;
  if (!url) {
    const pa = useProjectStore.getState().project.assets.find(a => a.id === assetId);
    if (pa?.path) url = pa.path;
  }
  if (!url) return new Float32Array(numBins).fill(0);

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const resp = await fetch(url);
    const arrayBuffer = await resp.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const rawData = audioBuffer.getChannelData(0); // mono or first channel
    const peaks = new Float32Array(numBins);
    const samplesPerBin = Math.max(1, Math.floor(rawData.length / numBins));

    for (let i = 0; i < numBins; i++) {
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
    return new Float32Array(numBins).fill(0);
  } finally {
    audioCtx.close();
  }
}

export const AudioWaveform: React.FC<Props> = React.memo(({ assetId, width, height, color }) => {
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    // Use a fixed bin count for decoding (500 peaks) — don't re-decode on resize.
    // The canvas drawing scales these peaks to the actual width.
    decodePeaks(assetId, 500).then(data => {
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

    const midY = height / 2;
    const numBins = peaks.length;

    // Draw waveform as a mirrored shape
    ctx.beginPath();
    ctx.moveTo(0, midY);

    // Top half (going right)
    for (let i = 0; i < numBins; i++) {
      const x = (i / numBins) * width;
      const amp = peaks[i] * midY * 0.9;
      ctx.lineTo(x, midY - amp);
    }

    // Bottom half (going left, mirrored)
    for (let i = numBins - 1; i >= 0; i--) {
      const x = (i / numBins) * width;
      const amp = peaks[i] * midY * 0.9;
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
  }, [peaks, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
});

AudioWaveform.displayName = 'AudioWaveform';
