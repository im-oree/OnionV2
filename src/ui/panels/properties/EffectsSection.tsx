/**
 * EffectsSection — UI for managing the effect stack on a layer.
 * Shows effects list with enable toggle, parameter editors, reordering, preset
 * save/load, and per-parameter keyframe integration (stopwatch + diamond).
 */
import React, { useState, useCallback } from 'react';
import { useEffectsStore } from '../../../state/effectsStore';
import { usePresetsStore } from '../../../state/presetsStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { effectRegistry } from '../../../renderer/effects/EffectRegistry';
import { Section } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { ColorInput } from './inputs/ColorInput';
import { SelectInput } from './inputs/SelectInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import { ContextMenu } from '../../common/ContextMenu';
import { useContextMenu } from '../../common/useContextMenu';
import type { EffectInstance, EffectType, EffectCategory } from '../../../types/effect';
import type { Layer } from '../../../types/layer';

interface Props { layer: Layer; compId: string; }

export const EffectsSection: React.FC<Props> = ({ layer, compId }) => {
  const effects = useEffectsStore((s) => s.effectsByLayer[layer.id] ?? []);
  const addEffect = useEffectsStore((s) => s.addEffect);
  const removeEffect = useEffectsStore((s) => s.removeEffect);
  const reorderEffect = useEffectsStore((s) => s.reorderEffect);
  const updateParameter = useEffectsStore((s) => s.updateParameter);
  const toggleEffect = useEffectsStore((s) => s.toggleEffect);
  const duplicateEffect = useEffectsStore((s) => s.duplicateEffect);
  const copyEffects = useEffectsStore((s) => s.copyEffects);
  const pasteEffects = useEffectsStore((s) => s.pasteEffects);
  const removeAllEffects = useEffectsStore((s) => s.removeAllEffects);
  const presets = usePresetsStore((s) => s.presets);
  const addPreset = usePresetsStore((s) => s.addPreset);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const comp = useCompositionStore((s) => s.activeCompositionId
    ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  const currentFrame = comp ? Math.floor(comp.currentTime * comp.fps) : 0;
  const categories = effectRegistry.listCategories();

  const handleAddEffectWithPreset = useCallback((type: EffectType, presetId?: string) => {
    addEffect(layer.id, type);
    if (presetId) {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        const effects = useEffectsStore.getState().effectsByLayer[layer.id] ?? [];
        const added = effects[effects.length - 1];
        if (added) {
          for (const [paramId, value] of Object.entries(preset.parameters)) {
            updateParameter(layer.id, added.id, paramId, value);
          }
        }
      }
    }
    setShowAddMenu(false);
  }, [layer.id, addEffect, updateParameter, presets]);

  return (
    <Section label="Effects">
      <div className="space-y-0.5">
        {effects.length === 0 && <div className="text-ui-xs text-text-disabled py-1">No effects</div>}
        {effects.map((effect, idx) => (
          <EffectItem key={effect.id} effect={effect} index={idx} total={effects.length}
            currentFrame={currentFrame} layerId={layer.id} compId={compId}
            onToggle={() => toggleEffect(layer.id, effect.id)}
            onRemove={() => removeEffect(layer.id, effect.id)}
            onDuplicate={() => duplicateEffect(layer.id, effect.id)}
            onMoveUp={() => reorderEffect(layer.id, effect.id, idx - 1)}
            onMoveDown={() => reorderEffect(layer.id, effect.id, idx + 1)}
            onParamChange={(paramId, value) => updateParameter(layer.id, effect.id, paramId, value)}
            onSavePreset={(name) => {
              const efx = useEffectsStore.getState().effectsByLayer[layer.id]?.find(e => e.id === effect.id);
              if (efx) {
                const params: Record<string, any> = {};
                for (const p of efx.parameters) params[p.id] = p.value;
                addPreset(name, efx.type, params);
              }
            }}
          />
        ))}
        <div className="relative">
          <button className="w-full text-left px-2 py-1 text-ui-xs text-text-secondary hover:bg-panel-hover border-0 bg-transparent cursor-pointer rounded-sm flex items-center gap-1"
            onClick={() => setShowAddMenu(!showAddMenu)}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <line x1="5" y1="1" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" />
              <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span>Add Effect</span>
          </button>
          {showAddMenu && (
            <AddEffectDropdown categories={categories} presets={presets}
              onSelect={handleAddEffectWithPreset}
              onClose={() => setShowAddMenu(false)} />
          )}
          {effects.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5">
              <button className="text-[9px] text-text-disabled hover:text-text-secondary border-0 bg-transparent cursor-pointer"
                onClick={() => copyEffects(layer.id)} title="Copy effects">Copy</button>
              <span className="text-text-disabled">·</span>
              <button className="text-[9px] text-text-disabled hover:text-text-secondary border-0 bg-transparent cursor-pointer"
                onClick={() => pasteEffects(layer.id)} title="Paste effects">Paste</button>
              <span className="text-text-disabled">·</span>
              <button className="text-[9px] text-text-disabled hover:text-text-secondary border-0 bg-transparent cursor-pointer"
                onClick={() => removeAllEffects(layer.id)} title="Remove all">Clear</button>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
};

/** Single effect item with preset save support */
const EffectItem: React.FC<{
  effect: EffectInstance; index: number; total: number; currentFrame: number;
  layerId: string; compId: string;
  onToggle: () => void; onRemove: () => void; onDuplicate: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
  onParamChange: (paramId: string, value: any) => void;
  onSavePreset: (name: string) => void;
}> = ({ effect, index, total, currentFrame, layerId, onToggle, onRemove, onDuplicate, onMoveUp, onMoveDown, onParamChange, onSavePreset }) => {
  const ctxMenu = useContextMenu();
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState('');

  const autoKeyframe = (paramId: string, value: any) => {
    const propPath = `effect.${effect.id}.${paramId}`;
    const kfStore = useKeyframeStore.getState();
    if (!kfStore.isPropertyAnimated(layerId, propPath)) return;
    const kfs = kfStore.engine.getKeyframesForProperty(layerId, propPath);
    const atFrame = kfs.some((k) => k.time === currentFrame);
    if (!atFrame) {
      kfStore.addKeyframe(layerId, { id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, property: propPath, layerId, time: currentFrame, value, interpolation: 'linear' });
    }
  };

  const [collapsed, setCollapsed] = React.useState(effect.collapsed);

  const handleContext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ctxMenu.open(e, [
      { id: 'efx.rename', label: 'Rename', onClick: () => { const n = prompt('Effect name:', effect.name); if (n) onDuplicate(); /* simplified */ } },
      { id: 'efx.dup', label: 'Duplicate', onClick: onDuplicate },
      { id: 'efx.sep1', label: '', divider: true, onClick: () => {} },
      { id: 'efx.savePreset', label: 'Save as Preset...', onClick: () => { setSaving(true); setPresetName(effect.name); } },
      { id: 'efx.sep2', label: '', divider: true, onClick: () => {} },
      { id: 'efx.remove', label: 'Remove', onClick: onRemove },
    ]);
  };

  return (
    <div className="border border-border-light rounded-sm overflow-hidden">
      <div className="flex items-center h-[22px] px-1 gap-0.5 bg-surface-alt" onContextMenu={handleContext}>
        <button className="w-[14px] h-[14px] flex items-center justify-center border-0 bg-transparent cursor-pointer text-text-disabled shrink-0"
          onClick={() => setCollapsed(!collapsed)}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className={`transition-transform ${collapsed ? '' : 'rotate-90'}`}>
            <polygon points="2,0 6,4 2,8" />
          </svg>
        </button>
        <label className="flex items-center gap-1 cursor-pointer shrink-0" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          <input type="checkbox" checked={effect.enabled} onChange={onToggle} className="w-2.5 h-2.5 accent-accent cursor-pointer" />
        </label>
        <span className="text-ui-xs text-text-primary truncate flex-1">{effect.name}</span>
        {index > 0 && (
          <button onClick={onMoveUp} className="w-3 h-3 border-0 bg-transparent cursor-pointer text-text-disabled hover:text-text-secondary" title="Move up">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><polygon points="4,0 8,6 0,6" /></svg>
          </button>
        )}
        {index < total - 1 && (
          <button onClick={onMoveDown} className="w-3 h-3 border-0 bg-transparent cursor-pointer text-text-disabled hover:text-text-secondary" title="Move down">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><polygon points="0,0 8,0 4,8" /></svg>
          </button>
        )}
        <button onClick={onDuplicate} className="w-3 h-3 border-0 bg-transparent cursor-pointer text-text-disabled hover:text-text-secondary" title="Duplicate effect">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="0.8">
            <rect x="1" y="1" width="5" height="5" /><rect x="3" y="3" width="5" height="5" />
          </svg>
        </button>
        <button onClick={onRemove} className="w-3 h-3 border-0 bg-transparent cursor-pointer text-text-disabled hover:text-danger" title="Remove effect">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="0.8">
            <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
          </svg>
        </button>
      </div>

      {/* Inline preset save input */}
      {saving && (
        <div className="px-1.5 py-1 flex items-center gap-1 bg-panel-hover">
          <input type="text" value={presetName} autoFocus
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && presetName.trim()) { onSavePreset(presetName.trim()); setSaving(false); }
              if (e.key === 'Escape') setSaving(false);
            }}
            className="flex-1 h-[18px] text-ui-xs px-1 bg-surface border border-border rounded-sm text-text-primary outline-none focus:border-accent"
            placeholder="Preset name..." />
          <button className="text-[9px] text-accent border-0 bg-transparent cursor-pointer font-semibold"
            onClick={() => { if (presetName.trim()) { onSavePreset(presetName.trim()); setSaving(false); } }}>Save</button>
        </div>
      )}

      {!collapsed && effect.parameters.length > 0 && (
        <div className="px-1.5 py-1 space-y-1">
          {effect.parameters.map((param) => (
            <EffectParamRow key={param.id} param={param} currentFrame={currentFrame} layerId={layerId} effectId={effect.id}
              onChange={(value) => { onParamChange(param.id, value); autoKeyframe(param.id, value); }} />
          ))}
        </div>
      )}

      {ctxMenu.menu && <ContextMenu items={ctxMenu.menu.items} position={ctxMenu.menu.position} onClose={ctxMenu.close} />}
    </div>
  );
};

/** Single effect parameter row */
const EffectParamRow: React.FC<{
  param: EffectInstance['parameters'][0]; currentFrame: number; layerId: string; effectId: string; onChange: (value: any) => void;
}> = ({ param, currentFrame, layerId, effectId, onChange }) => {
  const propPath = `effect.${effectId}.${param.id}`;
  const isAnimated = useKeyframeStore((s) => s.isPropertyAnimated(layerId, propPath));
  const hasKeyframe = useKeyframeStore((s) => {
    if (!isAnimated) return false;
    const kfs = s.engine.getKeyframesForProperty(layerId, propPath);
    return kfs.some((k) => k.time === currentFrame);
  });
  const pv: number | number[] = (typeof param.value === 'number' ? param.value : Array.isArray(param.value) ? param.value : 0) as number | number[];
  const toggleStopwatch = () => {
    const store = useKeyframeStore.getState();
    store.toggleAnimatedProperty(layerId, propPath);
    if (!isAnimated) {
      store.addKeyframe(layerId, { id: `kf_${Date.now()}`, property: propPath, layerId, time: currentFrame, value: pv, interpolation: 'linear' });
    }
  };
  const toggleDiamond = () => {
    const store = useKeyframeStore.getState();
    if (hasKeyframe) { const kfs = store.engine.getKeyframesForProperty(layerId, propPath); const existing = kfs.find((k) => k.time === currentFrame); if (existing) store.removeKeyframe(existing.id); }
    else { store.addKeyframe(layerId, { id: `kf_${Date.now()}`, property: propPath, layerId, time: currentFrame, value: pv, interpolation: 'linear' }); }
  };
  return (
    <div className="flex items-center gap-1 min-h-[18px] group">
      <button className={`w-2.5 h-2.5 flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0 ${isAnimated ? 'text-accent' : 'text-text-disabled opacity-0 group-hover:opacity-40'}`}
        onClick={toggleStopwatch} title={isAnimated ? 'Disable animation' : 'Enable animation'}>
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="5" cy="5" r="4" /><line x1="5" y1="2" x2="5" y2="5" /><line x1="5" y1="5" x2="7" y2="6" />
        </svg>
      </button>
      <span className="text-ui-xs text-text-secondary w-14 truncate shrink-0">{param.name}</span>
      <div className="flex-1 min-w-0"><ParamInput param={param} onChange={onChange} /></div>
      {isAnimated && (
        <button className={`w-2.5 h-2.5 flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0 ${hasKeyframe ? 'text-accent' : 'text-text-disabled'}`}
          onClick={toggleDiamond} title={hasKeyframe ? 'Remove keyframe' : 'Add keyframe'}>
          <svg width="6" height="6" viewBox="0 0 8 8" fill={hasKeyframe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.8">
            <polygon points="4,0 8,4 4,8 0,4" />
          </svg>
        </button>
      )}
    </div>
  );
};

/** Input widget router */
function ParamInput({ param, onChange }: { param: any; onChange: (value: any) => void }) {
  switch (param.type) {
    case 'number':
    case 'percent':
    case 'angle':
      return <NumberInput value={Number(param.value)} onChange={(v: number) => onChange(v)} min={param.min} max={param.max} step={param.step ?? 1} precision={param.type === 'angle' ? 0 : 1} label={param.type === 'percent' ? '%' : param.type === 'angle' ? '°' : ''} />;
    case 'color':
      return <ColorInput value={param.value} onChange={onChange} />;
    case 'boolean':
      return <CheckboxInput value={param.value} onChange={onChange} />;
    case 'select':
      return <SelectInput value={param.value} options={(param.options ?? []).map((o: string) => ({ label: o, value: o }))} onChange={onChange} />;
    case 'vector2': {
      const v = param.value;
      const stepVal = param.step ?? 1;
      return <div className="flex gap-1">
        <NumberInput value={v[0]} onChange={(x: number) => onChange([x, v[1]])} step={stepVal} precision={1} label="X" />
        <NumberInput value={v[1]} onChange={(y: number) => onChange([v[0], y])} step={stepVal} precision={1} label="Y" />
      </div>;
    }
    default:
      return <span className="text-ui-xs text-text-disabled">—</span>;
  }
}

/** Dropdown for adding effects with preset support */
const AddEffectDropdown: React.FC<{
  categories: EffectCategory[];
  presets: { id: string; name: string; effectType: EffectType }[];
  onSelect: (type: EffectType, presetId?: string) => void;
  onClose: () => void;
}> = ({ categories, presets, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const hasPresets = presets.length > 0;

  return (
    <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-panel border border-border rounded-md shadow-dropdown z-50 py-1" onMouseLeave={onClose}>
      <div className="px-2 pb-1">
        <input type="text" placeholder="Search effects..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-[18px] text-ui-xs px-1 bg-surface border border-border rounded-sm text-text-primary outline-none focus:border-accent" autoFocus />
      </div>

      {hasPresets && (
        <>
          <div className="px-2 py-0.5 flex items-center gap-1 cursor-pointer text-text-secondary hover:text-text-primary"
            onClick={() => setShowPresets(!showPresets)}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className={`transition-transform ${showPresets ? 'rotate-90' : ''}`}>
              <polygon points="2,0 6,4 2,8" />
            </svg>
            <span className="text-[9px] uppercase tracking-wider text-text-disabled">Presets</span>
          </div>
          {showPresets && (
            <div className="mb-1">
              {presets.filter((p) => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase())).map((preset) => (
                <button key={preset.id}
                  className="w-full text-left px-3 py-0.5 text-ui-xs text-accent hover:bg-panel-hover border-0 bg-transparent cursor-pointer"
                  onClick={() => onSelect(preset.effectType, preset.id)}>
                  {preset.name}
                </button>
              ))}
            </div>
          )}
          <div className="border-t border-border my-1" />
        </>
      )}

      {categories.filter((cat) => !search.trim() || effectRegistry.listByCategory(cat).some((d) => d.displayName.toLowerCase().includes(search.toLowerCase()))).map((cat) => (
        <div key={cat}>
          <div className="px-2 py-0.5 text-[9px] text-text-disabled uppercase tracking-wider">{cat}</div>
          {effectRegistry.listByCategory(cat).filter((d) => !search.trim() || d.displayName.toLowerCase().includes(search.toLowerCase())).map((def) => (
            <button key={def.type} className="w-full text-left px-3 py-0.5 text-ui-xs text-text-secondary hover:bg-panel-hover border-0 bg-transparent cursor-pointer"
              onClick={() => onSelect(def.type)}>{def.displayName}</button>
          ))}
        </div>
      ))}
    </div>
  );
};
