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
import { ContextMenu, type ContextMenuItem } from '../../common/ContextMenu';
import { useContextMenu } from '../../common/useContextMenu';
import type { EffectInstance, EffectType, EffectCategory, EffectParameter } from '../../../types/effect';
import type { Layer } from '../../../types/layer';
import { confirm } from '../../common/ConfirmDialog';

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
      <div className="space-y-1">
        {effects.length === 0 && (
          <div className="text-ui-xs text-text-disabled py-2 italic">No effects on this layer</div>
        )}
        {effects.map((effect, idx) => (
          <EffectItem key={effect.id} effect={effect} index={idx} total={effects.length}
            currentFrame={currentFrame} layerId={layer.id} compId={compId}
            onToggle={() => toggleEffect(layer.id, effect.id)}
            onRemove={async () => {
              const yes = await confirm(`Remove effect "${effect.name}"?`, 'Remove Effect', { confirmLabel: 'Remove' });
              if (yes) removeEffect(layer.id, effect.id);
            }}
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
        <div className="relative pt-1">
          <button
            className="w-full text-left px-2 py-1.5 text-ui-xs text-accent hover:bg-panel-hover border border-dashed border-border rounded-sm cursor-pointer flex items-center gap-1.5 bg-transparent"
            onClick={() => setShowAddMenu(!showAddMenu)}
          >
            <svg width="11" height="11" viewBox="0 0 10 10" fill="currentColor">
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
            <div className="flex items-center gap-2 px-1 pt-1.5">
              <button className="text-[10px] text-text-disabled hover:text-text-secondary border-0 bg-transparent cursor-pointer"
                onClick={() => copyEffects(layer.id)} title="Copy effects">Copy</button>
              <span className="text-text-disabled text-[10px]">·</span>
              <button className="text-[10px] text-text-disabled hover:text-text-secondary border-0 bg-transparent cursor-pointer"
                onClick={() => pasteEffects(layer.id)} title="Paste effects">Paste</button>
              <span className="text-text-disabled text-[10px]">·</span>
              <button className="text-[10px] text-text-disabled hover:text-danger border-0 bg-transparent cursor-pointer"
                onClick={async () => {
                  const yes = await confirm('Remove all effects from this layer?', 'Clear Effects', { confirmLabel: 'Clear All' });
                  if (yes) removeAllEffects(layer.id);
                }} title="Remove all">Clear</button>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
};

/** Helper: strip all keyframes for a specific effect param property path. */
function clearParamKeyframes(layerId: string, effectId: string, paramId: string): void {
  const kf = useKeyframeStore.getState();
  const propPath = `effect.${effectId}.${paramId}`;
  const engine = kf.engine;
  const kfs = engine.getKeyframesForProperty(layerId, propPath);
  for (const k of kfs) engine.removeKeyframe(k.id);
  // Also clear the animated flag
  if (kf.isPropertyAnimated(layerId, propPath)) {
    kf.toggleAnimatedProperty(layerId, propPath);
  }
  useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
}

/** Helper: reset a single param to its default value from the registry. */
function resetParamToDefault(
  layerId: string, effectId: string, paramId: string,
  effect: EffectInstance,
): any | null {
  const def = effectRegistry.get(effect.type);
  if (!def) return null;
  const defaults = def.createDefaultParameters();
  const p = defaults.find(dp => dp.id === paramId);
  if (!p) return null;
  useEffectsStore.getState().updateParameter(layerId, effectId, paramId, p.defaultValue);
  return p.defaultValue;
}

/** Helper: reset ALL params on an effect to defaults. */
function resetEffectToDefaults(layerId: string, effect: EffectInstance): void {
  const def = effectRegistry.get(effect.type);
  if (!def) return;
  const defaults = def.createDefaultParameters();
  const store = useEffectsStore.getState();
  for (const p of defaults) {
    store.updateParameter(layerId, effect.id, p.id, p.defaultValue);
  }
}

/** Helper: clear all keyframes across all params of an effect. */
function clearAllKeyframesForEffect(layerId: string, effect: EffectInstance): void {
  for (const p of effect.parameters) {
    clearParamKeyframes(layerId, effect.id, p.id);
  }
}

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
      const param = effect.parameters.find(p => p.id === paramId);
      const interp: 'linear' | 'hold' =
        param?.type === 'boolean' || param?.type === 'select' ? 'hold' : 'linear';
      kfStore.addKeyframe(layerId, {
        id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        property: propPath, layerId, time: currentFrame, value, interpolation: interp,
      });
    }
  };

  const [collapsed, setCollapsed] = React.useState(effect.collapsed);

  const handleHeaderContext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ctxMenu.open(e, [
      { id: 'efx.rename', label: 'Rename', onClick: () => { const n = prompt('Effect name:', effect.name); if (n) onDuplicate(); /* simplified */ } },
      { id: 'efx.dup', label: 'Duplicate', onClick: onDuplicate },
      { id: 'efx.sep1', divider: true },
      { id: 'efx.resetAll', label: 'Reset All to Defaults', onClick: () => resetEffectToDefaults(layerId, effect) },
      { id: 'efx.clearKfs', label: 'Clear All Keyframes', onClick: () => clearAllKeyframesForEffect(layerId, effect) },
      { id: 'efx.sep2', divider: true },
      { id: 'efx.savePreset', label: 'Save as Preset...', onClick: () => { setSaving(true); setPresetName(effect.name); } },
      { id: 'efx.sep3', divider: true },
      { id: 'efx.remove', label: 'Remove Effect', onClick: onRemove },
    ]);
  };

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-panel)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1"
        style={{
          height: 26, padding: '0 6px',
          background: 'var(--color-panel-raised, var(--color-panel-hover))',
          borderBottom: collapsed ? 'none' : '1px solid var(--color-border)',
        }}
        onContextMenu={handleHeaderContext}
      >
        <button
          className="w-4 h-4 flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
          style={{ color: 'var(--color-text-secondary)' }}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg width="9" height="9" viewBox="0 0 8 8" fill="currentColor"
            className={`transition-transform ${collapsed ? '' : 'rotate-90'}`}>
            <polygon points="2,0 6,4 2,8" />
          </svg>
        </button>
        <input
          type="checkbox"
          checked={effect.enabled}
          onChange={onToggle}
          className="w-3 h-3 accent-accent cursor-pointer shrink-0"
          onClick={(e) => e.stopPropagation()}
          title={effect.enabled ? 'Disable effect' : 'Enable effect'}
        />
        <span
          className="text-ui-sm truncate flex-1 select-none"
          style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}
        >
          {effect.name}
        </span>
        {index > 0 && (
          <button onClick={onMoveUp} className="w-4 h-4 border-0 bg-transparent cursor-pointer flex items-center justify-center"
            style={{ color: 'var(--color-text-disabled)' }} title="Move up">
            <svg width="9" height="9" viewBox="0 0 8 8" fill="currentColor"><polygon points="4,0 8,6 0,6" /></svg>
          </button>
        )}
        {index < total - 1 && (
          <button onClick={onMoveDown} className="w-4 h-4 border-0 bg-transparent cursor-pointer flex items-center justify-center"
            style={{ color: 'var(--color-text-disabled)' }} title="Move down">
            <svg width="9" height="9" viewBox="0 0 8 8" fill="currentColor"><polygon points="0,0 8,0 4,8" /></svg>
          </button>
        )}
        <button onClick={onDuplicate} className="w-4 h-4 border-0 bg-transparent cursor-pointer flex items-center justify-center"
          style={{ color: 'var(--color-text-disabled)' }} title="Duplicate effect">
          <svg width="9" height="9" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="1" y="1" width="5" height="5" /><rect x="3" y="3" width="5" height="5" />
          </svg>
        </button>
        <button onClick={onRemove} className="w-4 h-4 border-0 bg-transparent cursor-pointer flex items-center justify-center"
          style={{ color: 'var(--color-text-disabled)' }} title="Remove effect"
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)'}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-disabled)'}
        >
          <svg width="9" height="9" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
          </svg>
        </button>
      </div>

      {/* Preset save */}
      {saving && (
        <div className="px-2 py-1.5 flex items-center gap-2" style={{ background: 'var(--color-panel-hover)' }}>
          <input type="text" value={presetName} autoFocus
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && presetName.trim()) { onSavePreset(presetName.trim()); setSaving(false); }
              if (e.key === 'Escape') setSaving(false);
            }}
            className="flex-1 text-ui-xs px-2 py-1 outline-none focus:border-accent"
            style={{
              height: 22, background: 'var(--color-input-bg)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-primary)',
            }}
            placeholder="Preset name..." />
          <button className="text-ui-xs text-accent border-0 bg-transparent cursor-pointer font-semibold px-2"
            onClick={() => { if (presetName.trim()) { onSavePreset(presetName.trim()); setSaving(false); } }}>Save</button>
        </div>
      )}

      {/* Params */}
      {!collapsed && effect.parameters.length > 0 && (
        <div className="px-2 py-2 space-y-1.5">
          {effect.parameters.map((param) => (
            <EffectParamRow
              key={param.id}
              param={param}
              effect={effect}
              currentFrame={currentFrame}
              layerId={layerId}
              effectId={effect.id}
              onChange={(value) => { onParamChange(param.id, value); autoKeyframe(param.id, value); }}
            />
          ))}
        </div>
      )}

      {ctxMenu.menu && <ContextMenu items={ctxMenu.menu.items} position={ctxMenu.menu.position} onClose={ctxMenu.close} />}
    </div>
  );
};

/** Single effect parameter row */
const EffectParamRow: React.FC<{
  param: EffectParameter;
  effect: EffectInstance;
  currentFrame: number;
  layerId: string;
  effectId: string;
  onChange: (value: any) => void;
}> = ({ param, effect, currentFrame, layerId, effectId, onChange }) => {
  const propPath = `effect.${effectId}.${param.id}`;
  const isAnimated = useKeyframeStore((s) => s.isPropertyAnimated(layerId, propPath));
  const hasKeyframe = useKeyframeStore((s) => {
    if (!isAnimated) return false;
    const kfs = s.engine.getKeyframesForProperty(layerId, propPath);
    return kfs.some((k) => k.time === currentFrame);
  });
  const kfCount = useKeyframeStore((s) => {
    if (!isAnimated) return 0;
    return s.engine.getKeyframesForProperty(layerId, propPath).length;
  });

  const rowCtx = useContextMenu();

  const pv: any = param.value;

  const defaultInterp = (): 'linear' | 'hold' => {
    if (param.type === 'boolean' || param.type === 'select') return 'hold';
    return 'linear';
  };

  const enableAnim = () => {
    const store = useKeyframeStore.getState();
    if (!store.isPropertyAnimated(layerId, propPath)) {
      store.toggleAnimatedProperty(layerId, propPath);
      store.addKeyframe(layerId, {
        id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        property: propPath, layerId, time: currentFrame, value: pv, interpolation: defaultInterp(),
      });
    }
  };

  const disableAnim = () => {
    const store = useKeyframeStore.getState();
    if (store.isPropertyAnimated(layerId, propPath)) {
      // Remove all keyframes and toggle off
      const kfs = store.engine.getKeyframesForProperty(layerId, propPath);
      for (const k of kfs) store.engine.removeKeyframe(k.id);
      store.toggleAnimatedProperty(layerId, propPath);
      useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
    }
  };

  const toggleStopwatch = () => {
    if (isAnimated) disableAnim();
    else enableAnim();
  };

  const addKeyframeHere = () => {
    const store = useKeyframeStore.getState();
    if (!store.isPropertyAnimated(layerId, propPath)) {
      store.toggleAnimatedProperty(layerId, propPath);
    }
    // Replace or add at currentFrame
    const kfs = store.engine.getKeyframesForProperty(layerId, propPath);
    const existing = kfs.find(k => k.time === currentFrame);
    if (existing) store.removeKeyframe(existing.id);
    store.addKeyframe(layerId, {
      id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      property: propPath, layerId, time: currentFrame, value: pv, interpolation: defaultInterp(),
    });
  };

  const removeKeyframeHere = () => {
    const store = useKeyframeStore.getState();
    const kfs = store.engine.getKeyframesForProperty(layerId, propPath);
    const existing = kfs.find(k => k.time === currentFrame);
    if (existing) store.removeKeyframe(existing.id);
  };

  const toggleDiamond = () => {
    if (hasKeyframe) removeKeyframeHere();
    else addKeyframeHere();
  };

  const goToPrevKf = () => {
    const store = useKeyframeStore.getState();
    const kfs = store.engine.getKeyframesForProperty(layerId, propPath);
    const prev = [...kfs].reverse().find(k => k.time < currentFrame);
    if (prev) {
      document.dispatchEvent(new CustomEvent('playback:seekToFrame', { detail: { frame: prev.time } }));
    }
  };
  const goToNextKf = () => {
    const store = useKeyframeStore.getState();
    const kfs = store.engine.getKeyframesForProperty(layerId, propPath);
    const next = kfs.find(k => k.time > currentFrame);
    if (next) {
      document.dispatchEvent(new CustomEvent('playback:seekToFrame', { detail: { frame: next.time } }));
    }
  };

  const openRowContext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const items: ContextMenuItem[] = [
      {
        id: 'p.stopwatch',
        label: isAnimated ? 'Disable Animation' : 'Enable Animation',
        onClick: toggleStopwatch,
      },
      { id: 'p.d0', divider: true },
      {
        id: 'p.addKf',
        label: hasKeyframe ? 'Update Keyframe Here' : 'Add Keyframe Here',
        onClick: addKeyframeHere,
      },
      {
        id: 'p.rmKf',
        label: 'Remove Keyframe Here',
        disabled: !hasKeyframe,
        onClick: removeKeyframeHere,
      },
      { id: 'p.d1', divider: true },
      {
        id: 'p.prevKf',
        label: 'Go To Previous Keyframe',
        disabled: kfCount === 0,
        onClick: goToPrevKf,
      },
      {
        id: 'p.nextKf',
        label: 'Go To Next Keyframe',
        disabled: kfCount === 0,
        onClick: goToNextKf,
      },
      { id: 'p.d2', divider: true },
      {
        id: 'p.clearAll',
        label: `Clear All Keyframes (${kfCount})`,
        disabled: kfCount === 0,
        onClick: () => clearParamKeyframes(layerId, effectId, param.id),
      },
      { id: 'p.d3', divider: true },
      {
        id: 'p.reset',
        label: 'Reset to Default',
        onClick: () => {
          const dv = resetParamToDefault(layerId, effectId, param.id, effect);
          // If animated at this frame, also update the keyframe value
          if (dv !== null && isAnimated && hasKeyframe) {
            const store = useKeyframeStore.getState();
            const kfs = store.engine.getKeyframesForProperty(layerId, propPath);
            const existing = kfs.find(k => k.time === currentFrame);
            if (existing) store.updateKeyframe(existing.id, { value: dv });
          }
        },
      },
    ];
    rowCtx.open(e, items);
  };

  return (
    <div
      className="flex items-center gap-1.5 group"
      style={{ minHeight: 22 }}
      onContextMenu={openRowContext}
    >
      {/* Stopwatch */}
      <button
        className="flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
        style={{
          width: 14, height: 14,
          color: isAnimated ? 'var(--color-accent)' : 'var(--color-text-disabled)',
          opacity: isAnimated ? 1 : 0.4,
        }}
        onClick={toggleStopwatch}
        onMouseEnter={(e) => { if (!isAnimated) (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
        onMouseLeave={(e) => { if (!isAnimated) (e.currentTarget as HTMLElement).style.opacity = '0.4'; }}
        title={isAnimated ? 'Animation enabled — click to disable' : 'Enable animation for this property'}
      >
        <svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="5" cy="5" r="4" />
          <line x1="5" y1="2" x2="5" y2="5" />
          <line x1="5" y1="5" x2="7" y2="6" />
        </svg>
      </button>

      {/* Label */}
      <span
        className="text-ui-sm truncate select-none shrink-0"
        style={{ color: 'var(--color-text-secondary)', width: 78 }}
        title={param.name}
      >
        {param.name}
      </span>

      {/* Input */}
      <div className="flex-1 min-w-0" onContextMenu={(e) => e.stopPropagation() /* let browser handle inside text inputs */}>
        <ParamInputSlot param={param} onChange={onChange} onWrapperContextMenu={openRowContext} />
      </div>

      {/* Diamond (only when animated) */}
      {isAnimated && (
        <button
          className="flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
          style={{
            width: 14, height: 14,
            color: hasKeyframe ? 'var(--color-accent)' : 'var(--color-text-disabled)',
          }}
          onClick={toggleDiamond}
          title={hasKeyframe ? 'Remove keyframe at current time' : 'Add keyframe at current time'}
        >
          <svg width="9" height="9" viewBox="0 0 8 8" fill={hasKeyframe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2">
            <polygon points="4,0 8,4 4,8 0,4" />
          </svg>
        </button>
      )}

      {rowCtx.menu && <ContextMenu items={rowCtx.menu.items} position={rowCtx.menu.position} onClose={rowCtx.close} />}
    </div>
  );
};

/**
 * Wraps a ParamInput but intercepts right-click on non-text inputs (color
 * swatch, checkbox, select) so the effect param context menu opens instead
 * of the browser context menu. Text/number inputs pass through so users can
 * still copy/paste text.
 */
function ParamInputSlot({
  param, onChange, onWrapperContextMenu,
}: {
  param: EffectParameter;
  onChange: (value: any) => void;
  onWrapperContextMenu: (e: React.MouseEvent) => void;
}) {
  // For non-text inputs, forward right-click to the effect context menu.
  // For text/number inputs, do NOT intercept — user may want native copy/paste.
  const passthroughTypes: EffectParameter['type'][] = ['number', 'percent', 'angle'];
  const isText = passthroughTypes.includes(param.type);

  if (isText) {
    // Wrap in a div that captures right-click at the row level via parent.
    return <ParamInput param={param} onChange={onChange} />;
  }

  return (
    <div onContextMenu={onWrapperContextMenu} style={{ width: '100%' }}>
      <ParamInput param={param} onChange={onChange} />
    </div>
  );
}

/** Input widget router */
function ParamInput({ param, onChange }: { param: EffectParameter; onChange: (value: any) => void }) {
  switch (param.type) {
    case 'number':
    case 'percent':
    case 'angle':
      return (
        <NumberInput
          value={Number(param.value)}
          onChange={(v: number) => onChange(v)}
          min={param.min} max={param.max}
          step={param.step ?? 1}
          precision={param.type === 'angle' ? 0 : 1}
          label={param.type === 'percent' ? '%' : param.type === 'angle' ? '°' : ''}
        />
      );
    case 'color':
      return <ColorInput value={param.value as string} onChange={onChange} />;
    case 'boolean':
      return <CheckboxInput value={param.value as boolean} onChange={onChange} />;
    case 'select': {
      const raw = param.options ?? [];
      const opts = raw.map((o: any) =>
        typeof o === 'string' ? { label: o, value: o } : o
      );
      return <SelectInput value={param.value as string} options={opts} onChange={onChange} />;
    }
    case 'vector2': {
      const v = param.value as [number, number];
      const stepVal = param.step ?? 1;
      return (
        <div className="flex gap-1">
          <NumberInput value={v[0]} onChange={(x: number) => onChange([x, v[1]])} step={stepVal} precision={1} label="X" />
          <NumberInput value={v[1]} onChange={(y: number) => onChange([v[0], y])} step={stepVal} precision={1} label="Y" />
        </div>
      );
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
    <div className="absolute top-full left-0 mt-1 min-w-[220px] bg-panel border border-border rounded-md shadow-dropdown z-50 py-1" onMouseLeave={onClose}>
      <div className="px-2 pb-1">
        <input type="text" placeholder="Search effects..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-ui-xs px-2 py-1 outline-none focus:border-accent"
          style={{
            height: 22, background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
          }}
          autoFocus />
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
            <button key={def.type} className="w-full text-left px-3 py-1 text-ui-xs text-text-secondary hover:bg-panel-hover border-0 bg-transparent cursor-pointer"
              onClick={() => onSelect(def.type)}>{def.displayName}</button>
          ))}
        </div>
      ))}
    </div>
  );
};