/**
 * AudioEffectsSection — preset library + active audio effects with customizable params.
 */
import React, { useState, useCallback } from 'react';
import { Trash2, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Section } from './Section';
import { PropRowWithKF } from './PropRowWithKF';
import type { Layer, AudioEffectInstance, VideoData, AudioData } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';
import { AUDIO_PRESETS, type PresetCategory, type AudioPreset } from '../../../renderer/audio/audioPresets';
import { EFFECT_METADATA } from '../../../renderer/audio/audioEffects';

interface Props {
  layer: Layer;
  compId: string;
}

type CategoryTab = 'voice-filter' | 'voice-character' | 'speech-to-song';

function genEffectId(): string {
  return `fx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const AudioEffectsSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as (VideoData | AudioData) | undefined;
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('voice-filter');
  const [expandedFxIds, setExpandedFxIds] = useState<Set<string>>(new Set());

  const effects: AudioEffectInstance[] = (data as any)?.audioEffects ?? [];

  const updateData = useCallback((updates: Partial<VideoData & AudioData>) => {
    if (!data) return;
    const newData = { ...data, ...updates };
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData });
  }, [data, compId, layer.id]);

  const applyPreset = useCallback((preset: AudioPreset) => {
    // A preset can be a chain of multiple effects — add all of them
    const newEffects: AudioEffectInstance[] = preset.effects.map((fx, idx) => ({
      id: genEffectId(),
      baseType: fx.baseType,
      name: preset.effects.length === 1
        ? preset.name
        : `${preset.name} (${idx + 1}/${preset.effects.length})`,
      presetId: preset.id,
      presetCategory: preset.category,
      enabled: true,
      mix: fx.mix,
      params: { ...fx.params },
    }));
    updateData({ audioEffects: [...effects, ...newEffects] } as any);
  }, [effects, updateData]);

  const removeEffect = useCallback((id: string) => {
    updateData({ audioEffects: effects.filter(e => e.id !== id) } as any);
  }, [effects, updateData]);

  const toggleEffect = useCallback((id: string) => {
    updateData({
      audioEffects: effects.map(e =>
        e.id === id ? { ...e, enabled: !e.enabled } : e,
      ),
    } as any);
  }, [effects, updateData]);

  const updateEffectParam = useCallback((id: string, paramKey: string, value: number) => {
    updateData({
      audioEffects: effects.map(e =>
        e.id === id ? { ...e, params: { ...e.params, [paramKey]: value } } : e,
      ),
    } as any);
  }, [effects, updateData]);

  const updateEffectMix = useCallback((id: string, mix: number) => {
    updateData({
      audioEffects: effects.map(e =>
        e.id === id ? { ...e, mix } : e,
      ),
    } as any);
  }, [effects, updateData]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedFxIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const presetsInCategory = AUDIO_PRESETS.filter(p => p.category === activeCategory);

  return (
    <>
      {/* ── Active Effects List ── */}
      <Section label={`Active Effects (${effects.length})`} defaultOpen={effects.length > 0}>
        {effects.length === 0 ? (
          <div style={{
            padding: '12px 10px',
            fontSize: 11,
            color: 'var(--color-text-tertiary)',
            fontStyle: 'italic',
            textAlign: 'center',
          }}>
            No effects yet. Pick a preset below or add a custom effect.
          </div>
        ) : (
          effects.map((fx) => {
            const meta = EFFECT_METADATA[fx.baseType];
            const isExpanded = expandedFxIds.has(fx.id);
            return (
              <div key={fx.id} style={{
                borderBottom: '1px solid var(--color-divider)',
              }}>
                {/* Effect header row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  background: fx.enabled ? 'transparent' : 'rgba(0,0,0,0.15)',
                  opacity: fx.enabled ? 1 : 0.5,
                }}>
                  <button
                    onClick={() => toggleExpanded(fx.id)}
                    style={{
                      border: 0, background: 'transparent',
                      color: 'var(--color-text-tertiary)',
                      cursor: 'pointer', padding: 0,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {isExpanded
                      ? <ChevronDown size={12} strokeWidth={2} />
                      : <ChevronRight size={12} strokeWidth={2} />
                    }
                  </button>

                  <input
                    type="checkbox"
                    checked={fx.enabled}
                    onChange={() => toggleEffect(fx.id)}
                    style={{
                      accentColor: 'var(--color-accent)',
                      cursor: 'pointer',
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                    }}>
                      {fx.name}
                    </div>
                    <div style={{
                      fontSize: 9,
                      color: 'var(--color-text-tertiary)',
                    }}>
                      {meta?.displayName ?? fx.baseType}
                    </div>
                  </div>

                  <button
                    onClick={() => removeEffect(fx.id)}
                    style={{
                      border: 0, background: 'transparent',
                      color: 'var(--color-text-disabled)',
                      cursor: 'pointer', padding: 3,
                      borderRadius: 3,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = '#ff6060';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,80,80,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--color-text-disabled)';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                    title="Remove effect"
                  >
                    <Trash2 size={11} strokeWidth={1.75} />
                  </button>
                </div>

                {/* Expanded param editors */}
                {isExpanded && meta && (
                  <div style={{
                    background: 'rgba(0,0,0,0.15)',
                    borderTop: '1px solid var(--color-border)',
                  }}>
                    {meta.hasMix && (
                      <PropRowWithKF
                        label="Mix"
                        value={Math.round((fx.mix ?? 1) * 100)}
                        min={0} max={100} step={1}
                        defaultValue={100}
                        formatValue={(v) => `${Math.round(v)}%`}
                        onChange={(v) => updateEffectMix(fx.id, v / 100)}
                      />
                    )}
                    {meta.params.map((p) => {
                      const value = fx.params[p.key] ?? p.default;
                      return (
                        <PropRowWithKF
                          key={p.key}
                          label={p.label}
                          value={value}
                          min={p.min}
                          max={p.max}
                          step={p.step}
                          defaultValue={p.default}
                          formatValue={p.format}
                          layerId={layer.id}
                          propertyPath={`audioEffects.${fx.id}.${p.key}`}
                          onChange={(v) => updateEffectParam(fx.id, p.key, v)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Section>

      {/* ── Preset Library ── */}
      <Section label="Preset Library">
        {/* Category tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: '6px 10px',
          borderBottom: '1px solid var(--color-divider)',
        }}>
          {([
            ['voice-filter', 'Voice Filters'],
            ['voice-character', 'Voice Characters'],
            ['speech-to-song', 'Speech to Song'],
          ] as const).map(([cat, label]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as CategoryTab)}
              style={{
                padding: '4px 10px',
                fontSize: 10,
                fontWeight: 500,
                background: activeCategory === cat
                  ? 'var(--color-accent-muted)'
                  : 'transparent',
                color: activeCategory === cat
                  ? 'var(--color-accent)'
                  : 'var(--color-text-secondary)',
                border: `1px solid ${activeCategory === cat ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Preset grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: 6,
          padding: '8px 10px',
        }}>
          {presetsInCategory.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              padding: 16,
              fontSize: 10,
              color: 'var(--color-text-tertiary)',
              textAlign: 'center',
              fontStyle: 'italic',
            }}>
              More presets coming soon
            </div>
          ) : presetsInCategory.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '10px 6px',
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                transition: 'all 120ms ease',
                minHeight: 60,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-accent-muted)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-input-bg)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
              }}
              title={`Add ${preset.name}`}
            >
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Custom Effects ── */}
      <Section label="Add Custom Effect" defaultOpen={false}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 6,
          padding: '8px 10px',
        }}>
          {Object.values(EFFECT_METADATA).map((meta) => (
            <button
              key={meta.type}
              onClick={() => {
                const defaultParams: Record<string, number> = {};
                for (const p of meta.params) defaultParams[p.key] = p.default;
                const newEffect: AudioEffectInstance = {
                  id: genEffectId(),
                  baseType: meta.type,
                  name: meta.displayName,
                  presetCategory: 'custom',
                  enabled: true,
                  mix: 1,
                  params: defaultParams,
                };
                updateData({ audioEffects: [...effects, newEffect] } as any);
              }}
              style={{
                padding: '6px 8px',
                fontSize: 10,
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 3,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 120ms',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-input-bg)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
              }}
            >
              + {meta.displayName}
            </button>
          ))}
        </div>
      </Section>
    </>
  );
};

export default AudioEffectsSection;