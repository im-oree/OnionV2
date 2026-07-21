import React, { useState } from 'react';
import { usePresetsStore } from '../../../state/presetsStore';
import { useEffectsStore } from '../../../state/effectsStore';
import { Button } from '../../common/Button';

interface Props {
  layerId: string;
}

export const EffectPresetsPanel: React.FC<Props> = ({ layerId }) => {
  const presets = usePresetsStore(s => s.presets);
  const addPreset = usePresetsStore(s => s.addPreset);
  const removePreset = usePresetsStore(s => s.removePreset);
  const applyPreset = usePresetsStore(s => s.applyPreset);
  const effects = useEffectsStore(s => s.effectsByLayer[layerId] ?? []);
  const [newName, setNewName] = useState('');

  const savePreset = () => {
    if (!newName.trim() || effects.length === 0) return;
    addPreset(newName.trim(), effects);
    setNewName('');
  };

  return (
    <div style={{ padding: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          Presets ({presets.length})
        </span>
      </div>

      {/* Save input */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Preset name..."
          onKeyDown={e => e.key === 'Enter' && savePreset()}
          style={{
            flex: 1, height: 24, padding: '0 6px', fontSize: 10,
            background: 'var(--color-input-bg)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)',
          }}
        />
        <Button
          onClick={savePreset}
          disabled={!newName.trim() || effects.length === 0}
          size="sm"
        >
          Save
        </Button>
      </div>

      {presets.length === 0 ? (
        <div style={{ fontSize: 10, color: 'var(--color-text-disabled)', textAlign: 'center', padding: 8 }}>
          Save the current effect stack as a reusable preset.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto' }}>
          {presets.map(p => (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 6px', borderRadius: 'var(--radius-sm)',
                background: 'var(--color-input-bg)', cursor: 'pointer',
              }}
              onClick={() => {
                const cloned = applyPreset(p.id);
                if (!cloned) return;
                const store = useEffectsStore.getState();
                for (const e of cloned) {
                  // addEffect only takes (layerId, effectType) — creates effect with defaults
                  store.addEffect(layerId, e.type);
                  // Get the newly added effect and apply saved parameter values
                  const effects = useEffectsStore.getState().effectsByLayer[layerId] ?? [];
                  const added = effects[effects.length - 1];
                  if (added && e.parameters) {
                    for (const p of e.parameters) {
                      store.updateParameter(layerId, added.id, p.id, p.value);
                    }
                  }
                }
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-panel-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-input-bg)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--color-accent)', flexShrink: 0 }}>
                  <rect x="1" y="1" width="8" height="8" rx="1.5" />
                  <circle cx="5" cy="5" r="2" />
                </svg>
                <span style={{ fontSize: 10, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 8, color: 'var(--color-text-disabled)' }}>
                  {p.effects.length} fx
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removePreset(p.id); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-text-disabled)',
                    fontSize: 10, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-disabled)')}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
