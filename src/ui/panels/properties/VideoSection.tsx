import React, { useCallback } from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { SelectInput } from './inputs/SelectInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import { Button } from '../../common/Button';
import type { Layer, VideoData } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';

interface Props {
  layer: Layer;
  compId: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.round((seconds % 1) * 30);
  return `${mins}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

export const VideoSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as VideoData | undefined;
  const comp = useCompositionStore(s => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find(c => c.id === id) ?? null : null;
  });
  const currentFrame = comp ? Math.round(comp.currentTime * comp.fps) : 0;

  const updateData = useCallback((updates: Partial<VideoData>) => {
    if (!data) return;
    const newData = { ...data, ...updates };
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData });
    // Apply audio changes directly to video element for instant feedback
    const renderer = (window as any).__renderer;
    if (renderer?.layerSync) {
      const videoRenderer = renderer.layerSync.getRenderer(layer.id);
      if (videoRenderer?.videoElement) {
        const video = videoRenderer.videoElement;
        if (updates.volume !== undefined) video.volume = updates.volume;
        if (updates.muted !== undefined) video.muted = updates.muted;
        if (updates.playbackRate !== undefined) video.playbackRate = updates.playbackRate;
      }
    }
  }, [data, compId, layer.id]);

  if (!data) return null;

  return (
    <>
      <Section label="Video">
        {/* Volume Slider */}
        <PropRow label="Volume">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(data.volume * 100)}
              onChange={(e) => {
                const vol = Number(e.target.value);
                updateData({ volume: vol / 100 });
              }}
              className="flex-1 min-w-0"
              style={{
                height: 4,
                accentColor: 'var(--color-accent)',
                cursor: 'pointer',
              }}
              title={`Volume: ${Math.round(data.volume * 100)}%`}
            />
            <span style={{
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'var(--font-family-mono)',
              color: 'var(--color-text-secondary)',
              minWidth: 32,
              textAlign: 'right',
            }}>
              {Math.round(data.volume * 100)}%
            </span>
          </div>
        </PropRow>

        {/* Mute Toggle */}
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
            onMouseEnter={(e) => {
              if (!data.muted) e.currentTarget.style.background = 'var(--color-panel-hover)';
            }}
            onMouseLeave={(e) => {
              if (!data.muted) e.currentTarget.style.background = 'var(--color-input-bg)';
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

        {/* Playback Rate */}
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

        <PropRow label="Duration">
          <span style={{
            fontSize: 'var(--font-size-xs)',
            fontFamily: 'var(--font-family-mono)',
            color: 'var(--color-text-tertiary)',
          }}>
            {formatDuration(data.duration)}
          </span>
        </PropRow>
      </Section>

      {/* Time Remapping */}
      <Section label="Time Remapping" defaultOpen={false}>
        <PropRow label="Enable">
          <CheckboxInput
            value={data.timeRemap ?? false}
            onChange={v => {
              const ks = useKeyframeStore.getState();
              if (v) {
                const fps = comp?.fps ?? 30;
                const totalFrames = Math.floor(data.duration * fps);
                const kf1 = { id: `kf_tr_${Date.now()}_0`, property: 'timeRemap', layerId: layer.id, time: 0, value: 0, interpolation: 'linear' as const };
                const kf2 = { id: `kf_tr_${Date.now()}_1`, property: 'timeRemap', layerId: layer.id, time: totalFrames, value: totalFrames, interpolation: 'linear' as const };
                ks.engine.removeAllForProperty(layer.id, 'timeRemap');
                ks.addKeyframe(layer.id, kf1);
                ks.addKeyframe(layer.id, kf2);
                updateData({ timeRemap: true, timeRemapKeyframes: [{ time: 0, sourceFrame: 0 }, { time: totalFrames, sourceFrame: totalFrames }] });
              } else {
                ks.engine.removeAllForProperty(layer.id, 'timeRemap');
                // Remove only the timeRemap property (not the whole layer!)
                useKeyframeStore.setState(s => {
                  const m = new Map(s.animatedProperties);
                  const layerProps = m.get(layer.id);
                  if (layerProps) {
                    layerProps.delete('timeRemap');
                    if (layerProps.size === 0) m.delete(layer.id);
                    else m.set(layer.id, new Set(layerProps));
                  }
                  return { animatedProperties: m, revision: s.revision + 1 };
                });
                updateData({ timeRemap: false, timeRemapKeyframes: undefined });
              }
            }}
          />
        </PropRow>
        {data.timeRemap && (
          <>
            <PropRow label="Add KF">
              <Button onClick={() => {
                const ks = useKeyframeStore.getState();
                const existing_kfs = ks.engine.getKeyframesForProperty(layer.id, 'timeRemap');
                let sourceVal: number;
                if (existing_kfs.length >= 2) {
                  const result = ks.engine.evaluate(layer.id, 'timeRemap', currentFrame);
                  sourceVal = typeof result.value === 'number' ? result.value : currentFrame;
                } else {
                  sourceVal = currentFrame;
                }
                const kf = { id: `kf_tr_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, property: 'timeRemap', layerId: layer.id, time: currentFrame, value: Math.round(sourceVal), interpolation: 'linear' as const };
                ks.addKeyframe(layer.id, kf);
                // Sync to layer data for renderer fallback
                const allKfs = ks.engine.getKeyframesForProperty(layer.id, 'timeRemap');
                const remapKfs = allKfs.map(k => ({ time: k.time, sourceFrame: typeof k.value === 'number' ? k.value : k.time }));
                updateData({ timeRemapKeyframes: remapKfs });
              }} size="sm">+ KF</Button>
            </PropRow>
            {(() => {
              // Read from KeyframeEngine for consistency
              const ks = useKeyframeStore.getState();
              const engineKfs = ks.engine.getKeyframesForProperty(layer.id, 'timeRemap');
              return engineKfs.map((kf, i) => (
                <PropRow key={kf.id} label={`Kf${i+1}`}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center', flex: 1 }}>
                    <NumberInput value={kf.time} min={0} max={9999} step={1} precision={0}
                      onChange={v => {
                        const store = useKeyframeStore.getState();
                        store.updateKeyframe(kf.id, { time: v });
                        const allKfs = store.engine.getKeyframesForProperty(layer.id, 'timeRemap');
                        const remapKfs = allKfs.map(k => ({ time: k.time, sourceFrame: typeof k.value === 'number' ? k.value : k.time }));
                        updateData({ timeRemapKeyframes: remapKfs });
                      }} label="T" />
                    <NumberInput value={typeof kf.value === 'number' ? kf.value : 0} min={0} max={9999} step={1} precision={0}
                      onChange={v => {
                        const store = useKeyframeStore.getState();
                        store.updateKeyframe(kf.id, { value: v });
                        const allKfs = store.engine.getKeyframesForProperty(layer.id, 'timeRemap');
                        const remapKfs = allKfs.map(k => ({ time: k.time, sourceFrame: typeof k.value === 'number' ? k.value : k.time }));
                        updateData({ timeRemapKeyframes: remapKfs });
                      }} label="F" />
                    <button onClick={() => {
                      const store = useKeyframeStore.getState();
                      store.removeKeyframe(kf.id);
                      const allKfs = store.engine.getKeyframesForProperty(layer.id, 'timeRemap');
                      const remapKfs = allKfs.map(k => ({ time: k.time, sourceFrame: typeof k.value === 'number' ? k.value : k.time }));
                      updateData({ timeRemapKeyframes: remapKfs.length > 0 ? remapKfs : undefined });
                    }} style={{ background: 'none', border: 'none', color: 'var(--color-danger)',
                      cursor: 'pointer', fontSize: 10, padding: 0 }}>×</button>
                  </div>
                </PropRow>
              ));
            })()}
          </>
        )}
      </Section>

      {/* Frame Blending */}
      <Section label="Frame Blending" defaultOpen={false}>
        <PropRow label="Enable">
          <CheckboxInput
            value={data.frameBlending ?? false}
            onChange={v => updateData({ frameBlending: v })}
          />
        </PropRow>
        {data.frameBlending && (
          <PropRow label="Type">
            <SelectInput
              value={data.frameBlendingType ?? 'frameMix'}
              onChange={v => updateData({ frameBlendingType: v as any })}
              options={[
                { label: 'Frame Mix', value: 'frameMix' },
                { label: 'Pixel Motion', value: 'pixelMotion' },
              ]}
            />
          </PropRow>
        )}
      </Section>
    </>
  );
};
