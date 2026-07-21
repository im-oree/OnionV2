import React, { useState, useRef, useEffect } from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { SelectInput } from './inputs/SelectInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import { Button } from '../../common/Button';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useCompositionStore } from '../../../state/compositionStore';
import { defaultModifier, type ModifierInstance, type ModifierType } from '../../../types/modifier';

const MODIFIER_TYPES: { type: ModifierType; label: string; desc: string }[] = [
  { type: 'noise', label: 'Noise', desc: 'Procedural Perlin-like noise' },
  { type: 'generator', label: 'Generator', desc: 'Waveform generator (sine/square/etc)' },
  { type: 'cycles', label: 'Cycles', desc: 'Cycle animation repeat modes' },
  { type: 'steppedInterpolation', label: 'Stepped', desc: 'Quantize to stepped values' },
  { type: 'limits', label: 'Limits', desc: 'Clamp values to min/max range' },
  { type: 'envelope', label: 'Envelope', desc: 'Amplitude envelope ramp' },
  { type: 'cameraNoise', label: 'Camera Noise', desc: 'Adds noise to camera transforms' },
  { type: 'wiggle', label: 'Wiggle', desc: 'Randomized oscillation' },
  { type: 'delay', label: 'Delay', desc: 'Time-offset animation' },
];

const BLEND_MODES = [
  { label: 'Replace', value: 'replace' },
  { label: 'Add', value: 'add' },
  { label: 'Multiply', value: 'multiply' },
  { label: 'Subtract', value: 'subtract' },
];

const AXIS_OPTIONS_2D = [
  { label: 'Position X', value: 'transform.position.x' },
  { label: 'Position Y', value: 'transform.position.y' },
  { label: 'Rotation', value: 'transform.rotation' },
  { label: 'Scale X', value: 'transform.scale.x' },
  { label: 'Scale Y', value: 'transform.scale.y' },
];

const AXIS_OPTIONS_3D = [
  ...AXIS_OPTIONS_2D,
  { label: 'Position Z', value: 'transform3D.position.z' },
  { label: 'Rotation X', value: 'transform3D.rotationX' },
  { label: 'Rotation Y', value: 'transform3D.rotationY' },
  { label: 'Rotation Z', value: 'transform3D.rotationZ' },
  { label: 'Scale Z', value: 'transform3D.scale.z' },
];

const CAMERA_AXES = [
  { label: 'Camera X', value: 'cameraPositionX' },
  { label: 'Camera Y', value: 'cameraPositionY' },
  { label: 'Camera Z', value: 'cameraPositionZ' },
  { label: 'Camera Rot X', value: 'cameraRotationX' },
  { label: 'Camera Rot Y', value: 'cameraRotationY' },
  { label: 'FOV', value: 'cameraFOV' },
];

/** Mini graph preview for a modifier — not drawn unless shown (saves resources) */
const MiniGraphPreview: React.FC<{ modifier: ModifierInstance }> = React.memo(({ modifier }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < w; i++) {
      const t = (i / w) * 4;
      let val = 0;

      if (modifier.type === 'noise') {
        const strength = (modifier.params.strength as number) ?? 0.3;
        val = Math.sin(t * 7.3 + Math.sin(t * 2.1) * 5) * strength * 0.8;
      } else if (modifier.type === 'generator') {
        const freq = (modifier.params.frequency as number) ?? 1;
        const wave = (modifier.params.waveform as string) ?? 'sine';
        if (wave === 'sine') val = Math.sin(t * freq * Math.PI * 2) * 0.8;
        else if (wave === 'square') val = (Math.sin(t * freq * Math.PI * 2) > 0 ? 0.8 : -0.8);
        else if (wave === 'triangle') val = (2 / Math.PI) * Math.asin(Math.sin(t * freq * Math.PI * 2)) * 0.8;
        else val = (2 * (t * freq - Math.floor(t * freq + 0.5))) * 0.8;
      } else if (modifier.type === 'wiggle' || modifier.type === 'cameraNoise') {
        const freq = (modifier.params.frequency as number) ?? 3;
        val = Math.sin(t * freq * 7.3 + Math.sin(t * 2.1) * 5) * 0.7;
      } else if (modifier.type === 'cycles') {
        val = Math.sin(((t * 2) % 1) * Math.PI * 2) * 0.8;
      } else {
        val = Math.sin(t * 3 * Math.PI * 2) * 0.5;
      }

      const y = h / 2 - val * (h / 2 - 4);
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }, [modifier]);

  return (
    <canvas ref={canvasRef} width={120} height={36}
      style={{ borderRadius: 3, background: 'rgba(0,0,0,0.2)' }} />
  );
});

const ModifierRow: React.FC<{
  mod: ModifierInstance;
  layer: any;
  compId: string;
  index: number;
}> = ({ mod, layer, compId, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  const is3D = layer.is3D;
  const axisOptions = mod.type === 'cameraNoise' ? CAMERA_AXES
    : is3D ? AXIS_OPTIONS_3D : AXIS_OPTIONS_2D;

  const upd = (patch: Partial<ModifierInstance>) => {
    const mods = [...(layer.modifiers ?? [])];
    mods[index] = { ...mods[index], ...patch };
    useCompositionStore.getState().updateLayer(compId, layer.id, { modifiers: mods });
  };

  const typeDef = MODIFIER_TYPES.find(mt => mt.type === mod.type);

  return (
    <div style={{
      background: 'var(--color-panel-raised)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 4, overflow: 'hidden',
      opacity: mod.enabled ? 1 : 0.6,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 8px', cursor: 'pointer',
      }}
        onClick={() => setExpanded(!expanded)}>
        <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-tertiary)', fontSize: 10 }}>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <input type="checkbox" checked={mod.enabled}
          onChange={e => upd({ enabled: e.target.checked })}
          style={{ cursor: 'pointer' }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-primary)', flex: 1 }}>
          {typeDef?.label ?? mod.type}
        </span>
        {/* Graph preview toggle */}
        <button onClick={(e) => { e.stopPropagation(); setShowGraph(!showGraph); }}
          title="Toggle graph preview"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 10, color: showGraph ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
          📈
        </button>
        <button onClick={(e) => {
          e.stopPropagation();
          const mods = [...(layer.modifiers ?? [])];
          mods.splice(index, 1);
          useCompositionStore.getState().updateLayer(compId, layer.id, { modifiers: mods });
        }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-danger)' }}>
          <Trash2 size={12} />
        </button>
      </div>

      {/* Graph preview (collapsible — not drawn unless shown to save resources) */}
      {showGraph && (
        <div style={{ padding: '0 8px 4px' }}>
          <MiniGraphPreview modifier={mod} />
        </div>
      )}

      {/* Expanded properties */}
      {expanded && (
        <div style={{ padding: '0 8px 6px' }}>
          {/* Target axes */}
          <PropRow label="Target">
            <select multiple value={mod.targets}
              onChange={e => upd({ targets: Array.from(e.target.selectedOptions, o => o.value) })}
              style={{
                flex: 1, height: 60, fontSize: 10,
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
              }}>
              {axisOptions.map(opt => (
                <option key={opt.value} value={opt.value}
                  style={{ padding: '1px 2px' }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </PropRow>

          {/* Blend mode */}
          <PropRow label="Blend">
            <SelectInput value={mod.blendMode}
              onChange={v => upd({ blendMode: v as any })}
              options={BLEND_MODES} />
          </PropRow>

          {/* Influence */}
          <PropRow label="Influence">
            <NumberInput value={mod.influence}
              onChange={v => upd({ influence: v })}
              min={0} max={1} step={0.01} precision={2} />
          </PropRow>

          {/* Type-specific params */}
          {mod.type === 'noise' && <>
            <PropRow label="Scale">
              <NumberInput value={(mod.params.scale as number) ?? 33.6}
                onChange={v => upd({ params: { ...mod.params, scale: v } })}
                min={1} max={100} step={0.1} precision={1} />
            </PropRow>
            <PropRow label="Strength">
              <NumberInput value={(mod.params.strength as number) ?? 0.3}
                onChange={v => upd({ params: { ...mod.params, strength: v } })}
                min={0} max={3} step={0.01} precision={2} />
            </PropRow>
            <PropRow label="Phase">
              <NumberInput value={(mod.params.phase as number) ?? 1}
                onChange={v => upd({ params: { ...mod.params, phase: v } })}
                min={0.1} max={10} step={0.1} precision={1} />
            </PropRow>
            <PropRow label="Offset">
              <NumberInput value={(mod.params.offset as number) ?? 0}
                onChange={v => upd({ params: { ...mod.params, offset: v } })}
                min={0} max={100} step={0.1} precision={1} />
            </PropRow>
          </>}

          {mod.type === 'generator' && <>
            <PropRow label="Waveform">
              <SelectInput value={(mod.params.waveform as string) ?? 'sine'}
                onChange={v => upd({ params: { ...mod.params, waveform: v } })}
                options={[
                  { label: 'Sine', value: 'sine' },
                  { label: 'Square', value: 'square' },
                  { label: 'Triangle', value: 'triangle' },
                  { label: 'Sawtooth', value: 'sawtooth' },
                ]} />
            </PropRow>
            <PropRow label="Frequency">
              <NumberInput value={(mod.params.frequency as number) ?? 1}
                onChange={v => upd({ params: { ...mod.params, frequency: v } })}
                min={0.1} max={20} step={0.1} precision={1} />
            </PropRow>
            <PropRow label="Amplitude">
              <NumberInput value={(mod.params.amplitude as number) ?? 50}
                onChange={v => upd({ params: { ...mod.params, amplitude: v } })}
                min={0} max={500} step={1} precision={0} />
            </PropRow>
          </>}

          {mod.type === 'wiggle' && <>
            <PropRow label="Frequency">
              <NumberInput value={(mod.params.frequency as number) ?? 3}
                onChange={v => upd({ params: { ...mod.params, frequency: v } })}
                min={0.1} max={20} step={0.1} precision={1} />
            </PropRow>
            <PropRow label="Amplitude">
              <NumberInput value={(mod.params.amplitude as number) ?? 50}
                onChange={v => upd({ params: { ...mod.params, amplitude: v } })}
                min={0} max={500} step={1} precision={0} />
            </PropRow>
          </>}

          {mod.type === 'cameraNoise' && <>
            <PropRow label="Scale">
              <NumberInput value={(mod.params.scale as number) ?? 30}
                onChange={v => upd({ params: { ...mod.params, scale: v } })}
                min={1} max={100} step={0.1} precision={1} />
            </PropRow>
            <PropRow label="Strength">
              <NumberInput value={(mod.params.strength as number) ?? 0.5}
                onChange={v => upd({ params: { ...mod.params, strength: v } })}
                min={0} max={3} step={0.01} precision={2} />
            </PropRow>
          </>}

          {mod.type === 'cycles' && <>
            <PropRow label="Cycles">
              <NumberInput value={(mod.params.cycles as number) ?? 1}
                onChange={v => upd({ params: { ...mod.params, cycles: v } })}
                min={1} max={100} step={1} precision={0} />
            </PropRow>
          </>}

          {mod.type === 'steppedInterpolation' && <>
            <PropRow label="Step Size">
              <NumberInput value={(mod.params.stepSize as number) ?? 5}
                onChange={v => upd({ params: { ...mod.params, stepSize: v } })}
                min={1} max={100} step={1} precision={0} />
            </PropRow>
          </>}

          {mod.type === 'limits' && <>
            <PropRow label="Min X">
              <NumberInput value={(mod.params.minX as number) ?? -100}
                onChange={v => upd({ params: { ...mod.params, minX: v } })}
                min={-10000} max={0} step={1} precision={0} />
            </PropRow>
            <PropRow label="Max X">
              <NumberInput value={(mod.params.maxX as number) ?? 100}
                onChange={v => upd({ params: { ...mod.params, maxX: v } })}
                min={0} max={10000} step={1} precision={0} />
            </PropRow>
            <PropRow label="Min Y">
              <NumberInput value={(mod.params.minY as number) ?? -100}
                onChange={v => upd({ params: { ...mod.params, minY: v } })}
                min={-10000} max={0} step={1} precision={0} />
            </PropRow>
            <PropRow label="Max Y">
              <NumberInput value={(mod.params.maxY as number) ?? 100}
                onChange={v => upd({ params: { ...mod.params, maxY: v } })}
                min={0} max={10000} step={1} precision={0} />
            </PropRow>
          </>}

          {mod.type === 'envelope' && <>
            <PropRow label="Amplitude">
              <NumberInput value={(mod.params.amplitude as number) ?? 1}
                onChange={v => upd({ params: { ...mod.params, amplitude: v } })}
                min={0} max={5} step={0.1} precision={1} />
            </PropRow>
          </>}

          {mod.type === 'delay' && <>
            <PropRow label="Delay Frames">
              <NumberInput value={(mod.params.delayFrames as number) ?? 5}
                onChange={v => upd({ params: { ...mod.params, delayFrames: v } })}
                min={1} max={300} step={1} precision={0} />
            </PropRow>
            <PropRow label="Fade Length">
              <NumberInput value={(mod.params.fadeLength as number) ?? 10}
                onChange={v => upd({ params: { ...mod.params, fadeLength: v } })}
                min={0} max={100} step={1} precision={0} />
            </PropRow>
          </>}

          {/* Frame range restriction */}
          <PropRow label="Restrict Range">
            <CheckboxInput value={mod.restrictFrameRange}
              onChange={v => upd({ restrictFrameRange: v })} />
          </PropRow>
          {mod.restrictFrameRange && <>
            <PropRow label="Start">
              <NumberInput value={mod.frameStart}
                onChange={v => upd({ frameStart: v })}
                min={0} max={9999} step={1} precision={0} />
            </PropRow>
            <PropRow label="End">
              <NumberInput value={mod.frameEnd}
                onChange={v => upd({ frameEnd: v })}
                min={0} max={9999} step={1} precision={0} />
            </PropRow>
            <PropRow label="Blend In">
              <NumberInput value={mod.blendIn}
                onChange={v => upd({ blendIn: v })}
                min={0} max={100} step={1} precision={0} />
            </PropRow>
            <PropRow label="Blend Out">
              <NumberInput value={mod.blendOut}
                onChange={v => upd({ blendOut: v })}
                min={0} max={100} step={1} precision={0} />
            </PropRow>
          </>}
        </div>
      )}
    </div>
  );
};

export const ModifierSection: React.FC<{ layer: any; compId: string }> = ({ layer, compId }) => {
  const modifiers = layer.modifiers ?? [];
  const [showAdd, setShowAdd] = useState(false);

  const addModifier = (type: ModifierType) => {
    const mod = defaultModifier(type);
    useCompositionStore.getState().updateLayer(compId, layer.id, {
      modifiers: [...modifiers, mod],
    });
    setShowAdd(false);
  };

  return (
    <Section label="Modifiers">
      <Button onClick={() => setShowAdd(!showAdd)} className="w-full mb-2 text-ui-xs">
        <Plus size={14} /> Add Modifier
      </Button>

      {showAdd && (
        <div style={{
          background: 'var(--color-panel-raised)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)', marginBottom: 6, padding: 4,
        }}>
          {MODIFIER_TYPES.map(mt => (
            <button key={mt.type} onClick={() => addModifier(mt.type)}
              className="w-full text-left border-0 cursor-pointer transition-colors"
              style={{
                padding: '5px 8px', fontSize: 10,
                background: 'transparent', color: 'var(--color-text-primary)',
                borderRadius: 'var(--radius-sm)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-panel-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title={mt.desc}
            >
              {mt.label}
            </button>
          ))}
        </div>
      )}

      {modifiers.length === 0 ? (
        <div style={{ fontSize: 10, color: 'var(--color-text-disabled)', textAlign: 'center', padding: 4 }}>
          No modifiers
        </div>
      ) : (
        modifiers.map((mod: ModifierInstance, i: number) => (
          <ModifierRow key={mod.id} mod={mod} layer={layer} compId={compId} index={i} />
        ))
      )}
    </Section>
  );
};