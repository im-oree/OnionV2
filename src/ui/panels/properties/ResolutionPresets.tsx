/**
 * ResolutionPresets — visual preset browser for composition resolution + fps.
 * Shows thumbnail previews with aspect ratio boxes, platform labels, and category tabs.
 */
import React, { useState, useMemo } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import {
  COMPOSITION_PRESETS,
  PRESET_CATEGORIES,
  type CompPreset,
  type PresetCategory,
} from '../../../config/compositionPresets';

/** Compute aspect ratio box dimensions that fit inside a fixed container */
function aspectBox(
  w: number,
  h: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  const ratio = w / h;
  if (ratio >= 1) {
    const width = maxW;
    const height = Math.round(maxW / ratio);
    return height > maxH ? { width: Math.round(maxH * ratio), height: maxH } : { width, height };
  } else {
    const height = maxH;
    const width = Math.round(maxH * ratio);
    return width > maxW ? { width: maxW, height: Math.round(maxW / ratio) } : { width, height };
  }
}

/** Platform-specific accent colors for thumbnails */
const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  Facebook: '#1877F2',
  TikTok: '#000000',
  YouTube: '#FF0000',
  LinkedIn: '#0A66C2',
  Pinterest: '#BD081C',
  X: '#8899A6',
};

const THUMB_W = 56;
const THUMB_H = 48;

interface Props {
  /** Called when a preset is applied */
  onApply?: (preset: CompPreset) => void;
}

export const ResolutionPresets: React.FC<Props> = ({ onApply }) => {
  const [activeCategory, setActiveCategory] = useState<PresetCategory>('social');
  const [expanded, setExpanded] = useState(true);

  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });

  const filteredPresets = useMemo(
    () => COMPOSITION_PRESETS.filter((p) => p.category === activeCategory),
    [activeCategory],
  );

  const applyPreset = (preset: CompPreset) => {
    if (!comp) return;
    useCompositionStore.getState().updateComposition(comp.id, {
      width: preset.width,
      height: preset.height,
      fps: preset.fps,
    });
    onApply?.(preset);
  };

  const isCurrent = (p: CompPreset) =>
    comp && comp.width === p.width && comp.height === p.height && comp.fps === p.fps;

  if (!comp) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
          color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', fontWeight: 500,
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}
      >
        <span>Presets</span>
        <svg width={10} height={10} viewBox="0 0 10 10" style={{
          transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms',
        }}>
          <path d="M3 1L7 5L3 9" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </button>

      {expanded && (
        <div style={{ padding: '0 8px 4px' }}>
          {/* Category tabs */}
          <div style={{
            display: 'flex', gap: 2, padding: '2px 4px', marginBottom: 6,
            background: 'rgba(0,0,0,0.15)', borderRadius: 6,
          }}>
            {(Object.keys(PRESET_CATEGORIES) as PresetCategory[]).filter(c => c !== 'custom').map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  flex: 1, padding: '3px 0', border: 'none', borderRadius: 4,
                  background: activeCategory === cat ? 'var(--color-accent)' : 'transparent',
                  color: activeCategory === cat ? '#fff' : 'var(--color-text-tertiary)',
                  fontSize: 9, fontWeight: 600, cursor: 'pointer', transition: 'all 120ms',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}
              >
                {PRESET_CATEGORIES[cat].label}
              </button>
            ))}
          </div>

          {/* Preset grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
            maxHeight: 200, overflowY: 'auto', overflowX: 'hidden',
          }}>
            {filteredPresets.map((preset) => {
              const active = isCurrent(preset);
              const box = aspectBox(preset.width, preset.height, THUMB_W, THUMB_H);
              const accent = PLATFORM_COLORS[preset.platform ?? ''] ?? 'var(--color-accent)';
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '6px 4px', border: 'none', borderRadius: 6, cursor: 'pointer',
                    background: active ? 'var(--color-accent-muted)' : 'rgba(255,255,255,0.03)',
                    outline: active ? `1.5px solid var(--color-accent)` : '1.5px solid transparent',
                    transition: 'all 120ms',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                >
                  {/* Thumbnail: aspect ratio box */}
                  <div style={{
                    width: THUMB_W, height: THUMB_H,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: box.width, height: box.height,
                      border: `1.5px solid ${active ? accent : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: 3, background: active ? `${accent}15` : 'rgba(255,255,255,0.04)',
                      transition: 'all 150ms', position: 'relative', overflow: 'hidden',
                    }}>
                      {/* Platform badge */}
                      {preset.platform && (
                        <div style={{
                          position: 'absolute', top: 1, left: 2,
                          fontSize: 6, fontWeight: 700, color: accent,
                          letterSpacing: '0.03em', lineHeight: 1,
                        }}>
                          {preset.platform}
                        </div>
                      )}
                      {/* Active checkmark */}
                      {active && (
                        <div style={{
                          position: 'absolute', bottom: 1, right: 2,
                          fontSize: 7, color: accent, fontWeight: 700,
                        }}>✓</div>
                      )}
                    </div>
                  </div>
                  {/* Label */}
                  <span style={{
                    fontSize: 9, fontWeight: active ? 600 : 400,
                    color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    lineHeight: 1.1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden',
                    textOverflow: 'ellipsis', maxWidth: '100%',
                  }}>
                    {preset.label}
                  </span>
                  {/* Dimensions */}
                  <span style={{
                    fontSize: 8, color: 'var(--color-text-disabled)',
                    fontFamily: 'var(--font-family-mono)', lineHeight: 1,
                  }}>
                    {preset.width}×{preset.height} · {preset.fps}fps
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
