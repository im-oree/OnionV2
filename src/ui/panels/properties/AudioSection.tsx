import React, { useCallback, useState } from 'react';
import { Section } from './Section';
import { SelectInput } from './inputs/SelectInput';
import { PropRowWithKF } from './PropRowWithKF';
import { AudioEffectsSection } from './AudioEffectsSection';
import { AudioEQSection } from './AudioEQSection';
import type { Layer, VideoData, AudioData, FadeCurve } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';

interface Props {
  layer: Layer;
  compId: string;
}

type SubTab = 'basic' | 'effects' | 'eq';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'effects', label: 'Effects' },
  { id: 'eq', label: 'EQ' },
];

export const AudioSection: React.FC<Props> = ({ layer, compId }) => {
  const [subTab, setSubTab] = useState<SubTab>('basic');
  const data = layer.data as (VideoData | AudioData) | undefined;

  const updateData = useCallback((updates: any) => {
    if (!data) return;
    const newData = { ...data, ...updates };
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData });
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

  // Volume is stored as 0–1 normalized (0% – 100% baseline, up to 200% boost).
  // Older projects may have stored it as 0–100 or higher — normalize once.
  const rawVol = typeof data.volume === 'number' ? data.volume : 1;
  // If value looks like a percentage (> 2), assume old format and divide.
  const normalizedVol = rawVol > 2 ? rawVol / 100 : rawVol;
  const volumePct = Math.round(normalizedVol * 100);
  const pan = (data as any).pan ?? 0;
  const fadeIn = (data as any).fadeIn ?? 0;
  const fadeOut = (data as any).fadeOut ?? 0;
  const fadeInCurve = (data as any).fadeInCurve ?? 'linear';
  const fadeOutCurve = (data as any).fadeOutCurve ?? 'linear';

  return (
    <>
      {/* ── Horizontal sub-tabs ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '6px 10px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface-alt)',
      }}>
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: subTab === tab.id ? 600 : 500,
              background: subTab === tab.id ? 'var(--color-accent-muted)' : 'transparent',
              color: subTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              border: 0,
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
            onMouseEnter={(e) => {
              if (subTab !== tab.id) (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
            }}
            onMouseLeave={(e) => {
              if (subTab !== tab.id) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── BASIC TAB ── */}
      {subTab === 'basic' && (
        <>
          <Section label="Basic">
            <PropRowWithKF
              label="Volume"
              value={volumePct}
              min={0} max={200} step={1}
              defaultValue={100}
              formatValue={(v) => `${Math.round(v)}%`}
              layerId={layer.id}
              propertyPath="volume"
              onChange={(v) => updateData({ volume: v / 100 })}
            />
            <PropRowWithKF
              label="Fade in"
              value={fadeIn}
              min={0} max={10} step={0.1}
              defaultValue={0}
              formatValue={(v) => `${v.toFixed(1)}s`}
              onChange={(v) => updateData({ fadeIn: Math.max(0, v) })}
            />
            <PropRowWithKF
              label="Fade out"
              value={fadeOut}
              min={0} max={10} step={0.1}
              defaultValue={0}
              formatValue={(v) => `${v.toFixed(1)}s`}
              onChange={(v) => updateData({ fadeOut: Math.max(0, v) })}
            />

            {fadeIn > 0 && (
              <div style={{ padding: '4px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', minWidth: 70 }}>Fade in curve</span>
                <div style={{ flex: 1 }}>
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
              </div>
            )}
            {fadeOut > 0 && (
              <div style={{ padding: '4px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', minWidth: 70 }}>Fade out curve</span>
                <div style={{ flex: 1 }}>
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
              </div>
            )}
          </Section>

          <Section label="Pan & Playback">
            <PropRowWithKF
              label="Pan"
              value={Math.round(pan * 100)}
              min={-100} max={100} step={1}
              defaultValue={0}
              formatValue={(v) => v === 0 ? 'Center' : (v < 0 ? `${Math.abs(v)}L` : `${v}R`)}
              layerId={layer.id}
              propertyPath="pan"
              onChange={(v) => updateData({ pan: v / 100 })}
            />
            <div style={{ padding: '6px 10px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', minWidth: 40 }}>Mute</span>
              <button
                onClick={() => updateData({ muted: !data.muted })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 22, padding: '0 10px',
                  border: `1px solid ${data.muted ? 'rgba(255,80,80,0.3)' : 'var(--color-border)'}`,
                  borderRadius: 3,
                  background: data.muted ? 'rgba(255,80,80,0.14)' : 'var(--color-input-bg)',
                  color: data.muted ? '#ff6060' : 'var(--color-text-secondary)',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                <span>{data.muted ? 'Muted' : 'Unmuted'}</span>
              </button>
            </div>
            <div style={{ padding: '6px 10px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', minWidth: 40 }}>Speed</span>
              <div style={{ flex: 1 }}>
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
              </div>
            </div>
          </Section>
        </>
      )}

      {/* ── EFFECTS TAB ── */}
      {subTab === 'effects' && (
        <AudioEffectsSection layer={layer} compId={compId} />
      )}

      {/* ── EQ TAB ── */}
      {subTab === 'eq' && (
        <AudioEQSection layer={layer} compId={compId} />
      )}
    </>
  );
};

export default AudioSection;