/**
 * MetadataEditor — name, category, description, usesTime for a custom effect.
 */
import React from 'react';
import type { CustomEffectDefinition } from '../../../types/customEffect';
import type { EffectCategory } from '../../../types/effect';

const CATEGORIES: { label: string; value: EffectCategory }[] = [
  { label: 'Blur',       value: 'blur' },
  { label: 'Color',      value: 'color' },
  { label: 'Stylize',    value: 'stylize' },
  { label: 'Distort',    value: 'distort' },
  { label: 'Generate',   value: 'generate' },
  { label: 'Transition', value: 'transition' },
];

interface Props {
  def: CustomEffectDefinition;
  onChange: (patch: Partial<CustomEffectDefinition>) => void;
}

const fieldStyle: React.CSSProperties = {
  height: 22, fontSize: 11, padding: '0 6px',
  background: 'var(--color-input-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text-primary)',
  outline: 'none',
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10, color: 'var(--color-text-tertiary)',
  width: 60, flexShrink: 0, textAlign: 'right', paddingRight: 6,
};

export const MetadataEditor: React.FC<Props> = ({ def, onChange }) => {
  return (
    <div className="space-y-1.5">
      {/* Name */}
      <div className="flex items-center">
        <span style={labelStyle}>Name</span>
        <input
          type="text"
          value={def.displayName}
          onChange={(e) => onChange({ displayName: e.target.value })}
          style={fieldStyle}
          placeholder="Effect name"
        />
      </div>

      {/* Category */}
      <div className="flex items-center">
        <span style={labelStyle}>Category</span>
        <select
          value={def.category}
          onChange={(e) => onChange({ category: e.target.value as EffectCategory })}
          className="outline-none cursor-pointer"
          style={{ ...fieldStyle, appearance: 'auto' as any }}
        >
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Description */}
      <div className="flex items-start">
        <span style={{ ...labelStyle, paddingTop: 4 }}>Desc</span>
        <textarea
          value={def.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          style={{
            ...fieldStyle,
            height: 'auto',
            resize: 'vertical',
            minHeight: 36,
            lineHeight: '16px',
          }}
          placeholder="Short description..."
        />
      </div>

      {/* Uses Time toggle */}
      <div className="flex items-center">
        <span style={labelStyle}>Animated</span>
        <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          <input
            type="checkbox"
            checked={def.usesTime}
            onChange={(e) => onChange({ usesTime: e.target.checked })}
            className="cursor-pointer accent-accent"
            style={{ width: 13, height: 13 }}
          />
          Uses uTime (auto-inject time controls)
        </label>
      </div>

      {/* Info */}
      <div style={{ fontSize: 10, color: 'var(--color-text-disabled)', paddingLeft: 66 }}>
        v{def.version} · ID: {def.id}
      </div>
    </div>
  );
};