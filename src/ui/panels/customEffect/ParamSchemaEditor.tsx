/**
 * ParamSchemaEditor — visual builder for effect parameter schemas.
 * Users add/remove/reorder params, choose type, set defaults and ranges.
 */
import React, { useCallback } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { EffectParameter } from '../../../types/effect';

interface Props {
  parameters: EffectParameter[];
  onChange: (params: EffectParameter[]) => void;
}

const PARAM_TYPES: { label: string; value: EffectParameter['type'] }[] = [
  { label: 'Number',    value: 'number' },
  { label: 'Percent',   value: 'percent' },
  { label: 'Angle',     value: 'angle' },
  { label: 'Color',     value: 'color' },
  { label: 'Boolean',   value: 'boolean' },
  { label: 'Vector2',   value: 'vector2' },
  { label: 'Select',    value: 'select' },
];

function genParamId(): string {
  return `p_${Math.random().toString(36).slice(2, 7)}`;
}

function uniformFromName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '');
  if (!clean) return 'uParam';
  return 'u' + clean.charAt(0).toUpperCase() + clean.slice(1);
}

function makeDefaultParam(index: number): EffectParameter {
  const name = `Param ${index + 1}`;
  return {
    id: genParamId(),
    name,
    type: 'number',
    value: 0,
    defaultValue: 0,
    min: 0,
    max: 100,
    step: 1,
    uniform: uniformFromName(name),
  };
}

export const ParamSchemaEditor: React.FC<Props> = ({ parameters, onChange }) => {
  const addParam = useCallback(() => {
    onChange([...parameters, makeDefaultParam(parameters.length)]);
  }, [parameters, onChange]);

  const removeParam = useCallback((idx: number) => {
    const next = [...parameters];
    next.splice(idx, 1);
    onChange(next);
  }, [parameters, onChange]);

  const moveParam = useCallback((idx: number, dir: -1 | 1) => {
    const next = [...parameters];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }, [parameters, onChange]);

  const updateParam = useCallback((idx: number, patch: Partial<EffectParameter>) => {
    const next = parameters.map((p, i) => {
      if (i !== idx) return p;
      const merged = { ...p, ...patch };
      // Auto-update uniform name when user changes the param name
      if (patch.name && !patch.uniform) {
        merged.uniform = uniformFromName(patch.name);
      }
      // When type changes, reset value to type-appropriate default
      if (patch.type && patch.type !== p.type) {
        switch (patch.type) {
          case 'color': merged.value = '#ffffff'; merged.defaultValue = '#ffffff'; break;
          case 'boolean': merged.value = false; merged.defaultValue = false; break;
          case 'vector2': merged.value = [0, 0]; merged.defaultValue = [0, 0]; break;
          case 'select': merged.value = 0; merged.defaultValue = 0; merged.options = [{ label: 'Option 1', value: 0 }]; break;
          case 'angle': merged.value = 0; merged.defaultValue = 0; merged.min = -360; merged.max = 360; merged.step = 1; break;
          case 'percent': merged.value = 100; merged.defaultValue = 100; merged.min = 0; merged.max = 100; merged.step = 1; break;
          default: merged.value = 0; merged.defaultValue = 0; merged.min = 0; merged.max = 100; merged.step = 1; break;
        }
      }
      return merged;
    });
    onChange(next);
  }, [parameters, onChange]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Parameters ({parameters.length})
        </span>
        <button
          onClick={addParam}
          className="border-0 bg-transparent cursor-pointer flex items-center gap-1"
          style={{ fontSize: 11, color: 'var(--color-accent)' }}
        >
          <Plus size={11} /> Add
        </button>
      </div>

      {parameters.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--color-text-disabled)', padding: '8px 0' }}>
          No parameters. Click "Add" to create one.<br />
          Each parameter becomes a uniform in your shader.
        </div>
      )}

      <div className="space-y-2">
        {parameters.map((p, idx) => (
          <ParamRow
            key={p.id}
            param={p}
            index={idx}
            total={parameters.length}
            onUpdate={(patch) => updateParam(idx, patch)}
            onRemove={() => removeParam(idx)}
            onMove={(dir) => moveParam(idx, dir)}
          />
        ))}
      </div>
    </div>
  );
};

const ParamRow: React.FC<{
  param: EffectParameter;
  index: number;
  total: number;
  onUpdate: (patch: Partial<EffectParameter>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}> = ({ param, index, total, onUpdate, onRemove, onMove }) => {
  const [expanded, setExpanded] = React.useState(false);
  const isNumeric = param.type === 'number' || param.type === 'percent' || param.type === 'angle';

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 4,
      background: 'var(--color-panel)',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        className="flex items-center gap-1"
        style={{ padding: '4px 6px', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical size={10} style={{ color: 'var(--color-text-disabled)', cursor: 'grab', flexShrink: 0 }} />

        {/* Name */}
        <input
          type="text"
          value={param.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="outline-none bg-transparent"
          style={{
            flex: 1, minWidth: 0,
            fontSize: 11, fontWeight: 500,
            color: 'var(--color-text-primary)',
            border: 'none', padding: '0 2px',
          }}
          placeholder="Param name"
        />

        {/* Type dropdown */}
        <select
          value={param.type}
          onChange={(e) => { e.stopPropagation(); onUpdate({ type: e.target.value as any }); }}
          onClick={(e) => e.stopPropagation()}
          className="outline-none cursor-pointer"
          style={{
            width: 70, height: 18,
            fontSize: 10,
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 3,
            color: 'var(--color-text-secondary)',
            padding: '0 2px',
          }}
        >
          {PARAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {/* Move buttons */}
        {index > 0 && (
          <button onClick={(e) => { e.stopPropagation(); onMove(-1); }}
            className="border-0 bg-transparent cursor-pointer"
            style={{ color: 'var(--color-text-disabled)', padding: 1 }}>
            <ChevronUp size={10} />
          </button>
        )}
        {index < total - 1 && (
          <button onClick={(e) => { e.stopPropagation(); onMove(1); }}
            className="border-0 bg-transparent cursor-pointer"
            style={{ color: 'var(--color-text-disabled)', padding: 1 }}>
            <ChevronDown size={10} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="border-0 bg-transparent cursor-pointer"
          style={{ color: 'var(--color-danger)', padding: 1 }}
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '6px 8px', borderTop: '1px solid var(--color-border)' }} className="space-y-1.5">
          {/* Uniform name */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', width: 52, flexShrink: 0 }}>Uniform</span>
            <input
              type="text"
              value={param.uniform}
              onChange={(e) => onUpdate({ uniform: e.target.value })}
              className="flex-1 outline-none"
              style={{
                height: 18, fontSize: 10, padding: '0 4px',
                fontFamily: 'var(--font-family-mono)',
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 3,
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Default value */}
          {isNumeric && (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', width: 52, flexShrink: 0 }}>Default</span>
              <input type="number" value={Number(param.defaultValue)} step={param.step}
                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onUpdate({ defaultValue: v, value: v }); }}
                className="flex-1 outline-none"
                style={{ height: 18, fontSize: 10, padding: '0 4px', background: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 3, color: 'var(--color-text-primary)' }}
              />
            </div>
          )}

          {/* Min / Max / Step (numeric only) */}
          {isNumeric && (
            <div className="flex items-center gap-1">
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', width: 52, flexShrink: 0 }}>Range</span>
              <input type="number" value={param.min ?? ''} placeholder="min"
                onChange={(e) => { const v = parseFloat(e.target.value); onUpdate({ min: isNaN(v) ? undefined : v }); }}
                className="outline-none"
                style={{ width: 42, height: 18, fontSize: 10, padding: '0 2px', background: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 3, color: 'var(--color-text-primary)', textAlign: 'center' }}
              />
              <span style={{ fontSize: 9, color: 'var(--color-text-disabled)' }}>–</span>
              <input type="number" value={param.max ?? ''} placeholder="max"
                onChange={(e) => { const v = parseFloat(e.target.value); onUpdate({ max: isNaN(v) ? undefined : v }); }}
                className="outline-none"
                style={{ width: 42, height: 18, fontSize: 10, padding: '0 2px', background: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 3, color: 'var(--color-text-primary)', textAlign: 'center' }}
              />
              <span style={{ fontSize: 9, color: 'var(--color-text-disabled)' }}>step</span>
              <input type="number" value={param.step ?? 1} min={0.001}
                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) onUpdate({ step: v }); }}
                className="outline-none"
                style={{ width: 36, height: 18, fontSize: 10, padding: '0 2px', background: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 3, color: 'var(--color-text-primary)', textAlign: 'center' }}
              />
            </div>
          )}

          {/* Color default */}
          {param.type === 'color' && (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', width: 52, flexShrink: 0 }}>Default</span>
              <input type="color" value={String(param.defaultValue || '#ffffff')}
                onChange={(e) => onUpdate({ defaultValue: e.target.value, value: e.target.value })}
                style={{ width: 24, height: 18, border: 'none', cursor: 'pointer', background: 'transparent' }}
              />
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>
                {String(param.defaultValue || '#ffffff')}
              </span>
            </div>
          )}

          {/* Boolean default */}
          {param.type === 'boolean' && (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', width: 52, flexShrink: 0 }}>Default</span>
              <input type="checkbox" checked={!!param.defaultValue}
                onChange={(e) => onUpdate({ defaultValue: e.target.checked, value: e.target.checked })}
                className="cursor-pointer"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};