/**
 * AudioSection — audio properties for both audio layers and video layers.
 * Shows: Volume, Pan, Mute, Speed, Fade In/Out with curve selection.
 */
import React, { useCallback } from 'react';
import { Section, PropRow } from './Section';
import { SelectInput } from './inputs/SelectInput';
import type { Layer, VideoData, AudioData, FadeCurve } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';

interface Props {
  layer: Layer;
  compId: string;
}

type AudioLikeData = (VideoData | AudioData) & {
  fadeIn?: number;
  fadeOut?: number;
  fadeInCurve?: FadeCurve;
  fadeOutCurve?: FadeCurve;
  pan?: number;
};

export const AudioSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as AudioLikeData | undefined;

  const updateData = useCallback((updates: Partial<AudioLikeData>) => {
    if (!data) return;
    const newData = { ...data, ...updates };
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData });
    // Push to live media element for instant feedback
    const renderer = (window as any).__renderer;
    if (renderer?.layerSync) {
      const lr = renderer.layerSync.getRenderer(layer.id);
      if (lr?.videoElement) {
        const media = lr.videoElement;
        if (updates.volume !== undefined) media.volume = updates.volume;
        if (updates.muted !== undefined) media.muted = updates.muted;
        if (updates.playbackRate !== undefined) media.playbackRate = updates.playbackRate;
      }
    }
  }, [data, compId, layer.id]);

  if (!data) return null;

  const volume = typeof data.volume === 'number' ? data.volume : 1;
  const displayVol = volume > 1 ? Math.round(volume) : Math.round(volume * 100);
  const pan = data.pan ?? 0;
  const fadeIn = data.fadeIn ?? 0;
  const fadeOut = data.fadeOut ?? 0;
  const fadeInCurve = data.fadeInCurve ?? 'linear';
  const fadeOutCurve = data.fadeOutCurve ?? 'linear';

  return (
    <>
      {/* ── Volume & Pan ── */}
      <Section label="Volume & Pan">
        <PropRow label="Volume">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="range" min={0} max={100} step={1}
              value={displayVol}
              onChange={(e) => updateData({ volume: Number(e.target.value) / 100 })}
              className="flex-1 min-w-0"
              style={{
                height: 4,
                accentColor: 'var(--color-accent)',
                cursor: 'pointer',
              }}
              title={`Volume: ${displayVol}%`}
            />
            <span style={{
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'var(--font-family-mono)',
              color: 'var(--color-text-secondary)',
              minWidth: 36,
              textAlign: 'right',
            }}>
              {displayVol}%
            </span>
          </div>
        </PropRow>

        <PropRow label="Pan">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span style={{
              fontSize: 9,
              color: 'var(--color-text-tertiary)',
              minWidth: 8,
            }}>L</span>
            <input
              type="range" min={-100} max={100} step={1}
              value={Math.round(pan * 100)}
              onChange={(e) => updateData({ pan: Number(e.target.value) / 100 })}
              className="flex-1 min-w-0"
              style={{
                height: 4,
                accentColor: 'var(--color-accent)',
                cursor: 'pointer',
              }}
              title={`Pan: ${pan === 0 ? 'Center' : (pan < 0 ? `${Math.abs(Math.round(pan * 100))}% L` : `${Math.round(pan * 100)}% R`)}`}
            />
            <span style={{
              fontSize: 9,
              color: 'var(--color-text-tertiary)',
              minWidth: 8,
            }}>R</span>
            <span style={{
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'var(--font-family-mono)',
              color: 'var(--color-text-secondary)',
              minWidth: 46,
              textAlign: 'right',
            }}>
              {pan === 0 ? 'Center' : (pan < 0 ? `${Math.abs(Math.round(pan * 100))}L` : `${Math.round(pan * 100)}R`)}
            </span>
          </div>
        </PropRow>

        <PropRow label="Mute">
          <button
            onClick={() => updateData({ muted: !data.muted })}
            className="flex items-center gap-1.5 border-0 cursor-pointer transition-colors"
            style={{
              height: 24,
              padding: '0 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 500,
              background: data.muted ? 'rgba(255,80,80,0.14)' : 'var(--color-input-bg)',
              color: data.muted ? '#ff6060' : 'var(--color-text-secondary)',
              border: `1px solid ${data.muted ? 'rgba(255,80,80,0.3)' : 'var(--color-border)'}`,
            }}
          >
            {data.muted ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
            <span>{data.muted ? 'Muted' : 'Unmuted'}</span>
          </button>
        </PropRow>

        <PropRow label="Speed">
          <SelectInput
            value={String(data.playbackRate)}
            onChange={(v) => updateData({ playbackRate: Number(v) })}
            options={[
              { label: '0.25x', value: '0.25' },
              { label: '0.5x', value: '0.5' },
              { label: '1x', value: '1' },
              { label: '2x', value: '2' },
              { label: '4x', value: '4' },
            ]}
          />
        </PropRow>
      </Section>

      {/* ── Fade ── */}
      <Section label="Fade" defaultOpen={fadeIn > 0 || fadeOut > 0}>
        <PropRow label="Fade In">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="number" min={0} max={30} step={0.1}
              value={fadeIn}
              onChange={(e) => updateData({ fadeIn: Math.max(0, Number(e.target.value)) })}
              style={{
                width: 60,
                height: 22,
                padding: '0 6px',
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-xs)',
                fontFamily: 'var(--font-family-mono)',
                outline: 'none',
              }}
            />
            <span style={{
              fontSize: 10,
              color: 'var(--color-text-tertiary)',
            }}>sec</span>
            <SelectInput
              value={fadeInCurve}
              onChange={(v) => updateData({ fadeInCurve: v as FadeCurve })}
              options={[
                { label: 'Linear', value: 'linear' },
                { label: 'Ease In', value: 'easeIn' },
                { label: 'Ease Out', value: 'easeOut' },
                { label: 'Ease In-Out', value: 'easeInOut' },
                { label: 'Bezier', value: 'bezier' },
              ]}
            />
          </div>
        </PropRow>

        <PropRow label="Fade Out">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="number" min={0} max={30} step={0.1}
              value={fadeOut}
              onChange={(e) => updateData({ fadeOut: Math.max(0, Number(e.target.value)) })}
              style={{
                width: 60,
                height: 22,
                padding: '0 6px',
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-xs)',
                fontFamily: 'var(--font-family-mono)',
                outline: 'none',
              }}
            />
            <span style={{
              fontSize: 10,
              color: 'var(--color-text-tertiary)',
            }}>sec</span>
            <SelectInput
              value={fadeOutCurve}
              onChange={(v) => updateData({ fadeOutCurve: v as FadeCurve })}
              options={[
                { label: 'Linear', value: 'linear' },
                { label: 'Ease In', value: 'easeIn' },
                { label: 'Ease Out', value: 'easeOut' },
                { label: 'Ease In-Out', value: 'easeInOut' },
                { label: 'Bezier', value: 'bezier' },
              ]}
            />
          </div>
        </PropRow>

        {/* Visual fade preview */}
        {(fadeIn > 0 || fadeOut > 0) && (
          <PropRow label="Preview">
            <FadePreview
              fadeIn={fadeIn}
              fadeOut={fadeOut}
              fadeInCurve={fadeInCurve}
              fadeOutCurve={fadeOutCurve}
              duration={data.duration ?? 10}
            />
          </PropRow>
        )}
      </Section>
    </>
  );
};

// ── Visual preview of the fade envelope ─────────────────────

const FadePreview: React.FC<{
  fadeIn: number;
  fadeOut: number;
  fadeInCurve: FadeCurve;
  fadeOutCurve: FadeCurve;
  duration: number;
}> = ({ fadeIn, fadeOut, fadeInCurve, fadeOutCurve, duration }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = React.useState(200);

  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (parent) setWidth(parent.clientWidth);

    const dpr = window.devicePixelRatio || 1;
    const w = width;
    const h = 40;
    el.width = w * dpr;
    el.height = h * dpr;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;

    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, w, h);

    // Compute envelope path
    const samples = Math.max(60, w);
    const dur = Math.max(duration, fadeIn + fadeOut);
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * dur;
      const timeToEnd = dur - t;
      let env = 1;

      if (fadeIn > 0 && t < fadeIn) {
        env = Math.min(env, applyCurveInline(t / fadeIn, fadeInCurve));
      }
      if (fadeOut > 0 && timeToEnd < fadeOut) {
        env = Math.min(env, applyCurveInline(timeToEnd / fadeOut, fadeOutCurve));
      }

      const x = (i / samples) * w;
      const y = h - env * (h - 4) - 2;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();

    // Fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(88,101,255,0.4)');
    grad.addColorStop(1, 'rgba(88,101,255,0.05)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(120,140,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [fadeIn, fadeOut, fadeInCurve, fadeOutCurve, duration, width]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        borderRadius: 3,
        border: '1px solid var(--color-border)',
        flex: 1,
        minWidth: 0,
      }}
    />
  );
};

function applyCurveInline(t: number, curve: FadeCurve): number {
  t = Math.max(0, Math.min(1, t));
  switch (curve) {
    case 'linear': return t;
    case 'easeIn': return t * t;
    case 'easeOut': return 1 - (1 - t) * (1 - t);
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'bezier': return t * t * (3 - 2 * t); // smoothstep default
    default: return t;
  }
}

export default AudioSection;