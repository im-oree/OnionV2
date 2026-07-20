import React, { useCallback } from 'react';
import { Section, PropRow } from './Section';
import { SelectInput } from './inputs/SelectInput';
import type { Layer, VideoData } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';

interface Props {
  layer: Layer;
  compId: string;
}

/** Apply volume/mute changes directly to the video element for instant feedback */
function applyVideoAudio(layerId: string, updates: Partial<Pick<VideoData, 'volume' | 'muted' | 'playbackRate'>>): void {
  const renderer = (window as any).__renderer;
  if (!renderer?.layerSync) return;
  const videoRenderer = renderer.layerSync.getRenderer(layerId);
  if (!videoRenderer?.videoElement) return;
  const video = videoRenderer.videoElement;
  if (updates.volume !== undefined) video.volume = updates.volume / 100;
  if (updates.muted !== undefined) video.muted = updates.muted;
  if (updates.playbackRate !== undefined) video.playbackRate = updates.playbackRate;
}

export const VideoSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as VideoData | undefined;
  const updateData = useCallback((updates: Partial<VideoData>) => {
    if (!data) return;
    const newData = { ...data, ...updates };
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData });
    // Apply audio changes directly to video element for instant feedback
    applyVideoAudio(layer.id, updates);
  }, [data, compId, layer.id]);

  if (!data) return null;

  return (
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

      {/* Duration info */}
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
  );
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.round((seconds % 1) * 30);
  return `${mins}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}
