import React, { useState } from 'react';
import { EASING_PRESETS, PREVIEW_PATHS, PRESET_CATEGORIES, CATEGORY_PRESETS, PRESET_LABELS } from '../../../animation/EasingPresets';

interface Props {
  onSelect: (name: string, expression?: string) => void;
  onClose?: () => void;
}

export const PresetPicker: React.FC<Props> = ({ onSelect, onClose }) => {
  const [activeCat, setActiveCat] = useState('basic');
  const presets = CATEGORY_PRESETS[activeCat] ?? [];

  // Close on Escape key
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // Close on Escape key
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // Close on Escape key
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
      background: 'var(--color-panel-raised)', borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-dropdown)', width: 400, zIndex: 100,
    }}>
      {/* Category tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', overflow: 'auto' }}>
        {PRESET_CATEGORIES.map(cat => (
          <button key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            style={{
              flex: 1, padding: '6px 2px', fontSize: 10, cursor: 'pointer', border: 'none',
              background: activeCat === cat.id ? 'var(--color-accent-muted)' : 'transparent',
              color: activeCat === cat.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              borderBottom: activeCat === cat.id ? '2px solid var(--color-accent)' : '2px solid transparent',
              whiteSpace: 'nowrap',
            }}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Preset grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 8, maxHeight: 320, overflowY: 'auto' }}>
        {presets.map(name => {
          const preset = EASING_PRESETS[name];
          const preview = PREVIEW_PATHS[name] ?? 'M4,76 L144,4';
          if (!preset) return null;
          return (
            <button key={name}
              onClick={() => onSelect(name, preset.expression)}
              style={{
                padding: 4, cursor: 'pointer', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)', background: 'var(--color-input-bg)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              <svg width="100%" height={48} viewBox="0 0 148 80" style={{ display: 'block' }}>
                <rect width="148" height="80" fill="rgba(0,0,0,0.2)" rx="3" />
                <line x1="4" y1="76" x2="144" y2="4" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                <path d={preview} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
                {preset.expression && (
                  <text x="6" y="10" fill="#4A90E2" fontSize={7} fontFamily="monospace">
                    expr
                  </text>
                )}
              </svg>
              <div style={{ fontSize: 9, color: 'var(--color-text-secondary)', marginTop: 2, textAlign: 'center' }}>
                {PRESET_LABELS[name] ?? name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
