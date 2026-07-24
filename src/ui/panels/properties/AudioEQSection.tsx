/**
 * AudioEQSection — 5-band EQ with visual response curve.
 * All band params (gain, frequency, Q) are keyframeable via property path
 * `eq.<bandIdx>.<field>`.
 */
import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Section } from './Section';
import { PropRowWithKF } from './PropRowWithKF';
import { CheckboxInput } from './inputs/CheckboxInput';
import type { Layer, AudioEQ, EQBand, VideoData, AudioData } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';

interface Props {
  layer: Layer;
  compId: string;
}

const DEFAULT_EQ: AudioEQ = {
  enabled: true,
  bands: [
    { frequency: 80,    gain: 0, q: 0.7, type: 'lowshelf' },
    { frequency: 250,   gain: 0, q: 1,   type: 'peaking' },
    { frequency: 1000,  gain: 0, q: 1,   type: 'peaking' },
    { frequency: 4000,  gain: 0, q: 1,   type: 'peaking' },
    { frequency: 12000, gain: 0, q: 0.7, type: 'highshelf' },
  ],
};

const BAND_LABELS = ['Low', 'Low-Mid', 'Mid', 'High-Mid', 'High'];

const bandPath = (idx: number, field: 'gain' | 'frequency' | 'q') =>
  `eq.${idx}.${field}`;

export const AudioEQSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as (VideoData | AudioData) | undefined;
  const eq: AudioEQ = (data as any)?.eq ?? DEFAULT_EQ;

  const updateData = useCallback((updates: Partial<VideoData & AudioData>) => {
    if (!data) return;
    const newData = { ...data, ...updates };
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData });
  }, [data, compId, layer.id]);

  const updateBand = useCallback((idx: number, updates: Partial<EQBand>) => {
    const newBands = eq.bands.map((b, i) => i === idx ? { ...b, ...updates } : b);
    updateData({ eq: { ...eq, bands: newBands } } as any);
  }, [eq, updateData]);

  const setEnabled = useCallback((enabled: boolean) => {
    updateData({ eq: { ...eq, enabled } } as any);
  }, [eq, updateData]);

  const resetEQ = useCallback(() => {
    updateData({ eq: DEFAULT_EQ } as any);
  }, [updateData]);

  return (
    <>
      <Section label="Equalizer">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px',
        }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, color: 'var(--color-text-primary)', cursor: 'pointer',
          }}>
            <CheckboxInput value={eq.enabled} onChange={setEnabled} />
            <span>EQ Enabled</span>
          </label>
          <button
            onClick={resetEQ}
            style={{
              padding: '3px 8px', fontSize: 9,
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 3, color: 'var(--color-text-secondary)', cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>

        {eq.enabled && (
          <div style={{ padding: '4px 10px 8px' }}>
            <EQResponseCurve bands={eq.bands} />
          </div>
        )}

        {eq.enabled && eq.bands.map((band, idx) => (
          <div key={idx} style={{
            borderTop: idx === 0 ? '1px solid var(--color-divider)' : undefined,
            borderBottom: '1px solid var(--color-divider)',
            padding: '6px 0 4px',
          }}>
            <div style={{
              padding: '2px 10px', fontSize: 10, fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {BAND_LABELS[idx]} · {formatFreq(band.frequency)}
            </div>
            <PropRowWithKF
              label="Gain"
              value={band.gain}
              min={-24} max={24} step={0.1}
              defaultValue={0}
              formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`}
              layerId={layer.id}
              propertyPath={bandPath(idx, 'gain')}
              onChange={(v) => updateBand(idx, { gain: v })}
            />
            <PropRowWithKF
              label="Frequency"
              value={band.frequency}
              min={20} max={20000} step={10}
              defaultValue={DEFAULT_EQ.bands[idx].frequency}
              formatValue={formatFreq}
              layerId={layer.id}
              propertyPath={bandPath(idx, 'frequency')}
              onChange={(v) => updateBand(idx, { frequency: v })}
            />
            {band.type === 'peaking' && (
              <PropRowWithKF
                label="Q"
                value={band.q}
                min={0.1} max={20} step={0.1}
                defaultValue={1}
                layerId={layer.id}
                propertyPath={bandPath(idx, 'q')}
                onChange={(v) => updateBand(idx, { q: v })}
              />
            )}
          </div>
        ))}
      </Section>
    </>
  );
};

function formatFreq(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)}kHz`;
  return `${Math.round(hz)}Hz`;
}

// ── Visual response curve (unchanged) ──────────────────

const EQResponseCurve: React.FC<{ bands: EQBand[] }> = ({ bands }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(200);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setWidth(entries[0]?.contentRect.width ?? 200);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = width;
    const h = 80;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const samples = 200;
    const points: [number, number][] = [];
    for (let i = 0; i < samples; i++) {
      const f = 20 * Math.pow(1000, i / (samples - 1));
      let totalGainDb = 0;
      for (const band of bands) totalGainDb += simulateBandResponse(band, f);
      const x = (i / (samples - 1)) * w;
      const y = h / 2 - (totalGainDb / 24) * (h / 2);
      points.push([x, Math.max(2, Math.min(h - 2, y))]);
    }

    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.lineTo(w, h / 2);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(88,101,255,0.35)');
    grad.addColorStop(0.5, 'rgba(88,101,255,0.15)');
    grad.addColorStop(1, 'rgba(88,101,255,0.35)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(120,140,255,0.95)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (const band of bands) {
      const logPos = Math.log(band.frequency / 20) / Math.log(1000);
      const x = logPos * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [bands, width]);

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block', borderRadius: 3,
          border: '1px solid var(--color-border)',
        }}
      />
    </div>
  );
};

function simulateBandResponse(band: EQBand, freq: number): number {
  const ratio = freq / band.frequency;
  const logRatio = Math.log2(ratio);
  if (band.type === 'peaking') {
    const width = 1 / band.q;
    const falloff = Math.exp(-Math.pow(logRatio / width, 2) * 2);
    return band.gain * falloff;
  } else if (band.type === 'lowshelf') {
    if (logRatio < -1) return band.gain;
    if (logRatio > 1) return 0;
    return band.gain * (1 - (logRatio + 1) / 2);
  } else {
    if (logRatio > 1) return band.gain;
    if (logRatio < -1) return 0;
    return band.gain * ((logRatio + 1) / 2);
  }
}

export default AudioEQSection;