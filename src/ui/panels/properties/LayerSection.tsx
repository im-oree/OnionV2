import React from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { SelectInput } from './inputs/SelectInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import type { Layer } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';
import { BLEND_MODES } from '../../../renderer/blending/BlendModes';

interface Props {
  layer: Layer;
  compId: string;
}

/** Layer types that render visible content in the viewport. */
const VISIBLE_LAYER_TYPES: ReadonlySet<string> = new Set([
  'solid', 'shape', 'text', 'image', 'video', 'comp',
]);

/** Properties shown only for layers that produce visible content. */
const VisibleContent: React.FC<{ layer: Layer; compId: string }> = ({ layer, compId }) => {
  const currentFrame = useCompositionStore((s) => {
    const comp = s.activeCompositionId ? s.compositions.find(c => c.id === s.activeCompositionId) : null;
    return comp ? Math.round(comp.currentTime * comp.fps) : 0;
  });

  const blendOptions = BLEND_MODES.map((bm) => ({
    label: bm.label,
    value: bm.id,
  }));

  return (
    <>
      <PropRow label="Opacity" animatable="opacity" layer={layer} compId={compId} currentFrame={currentFrame}>
        <NumberInput
          value={layer.opacity}
          onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { opacity: v })}
          min={0} max={100} step={1} precision={0} label="%"
        />
      </PropRow>

      <PropRow label="Blend" animatable="blendMode" layer={layer} compId={compId} currentFrame={currentFrame}>
        <SelectInput
          value={layer.blendMode}
          onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { blendMode: v as any })}
          options={blendOptions}
        />
      </PropRow>

      <PropRow label="Start">
        <NumberInput
          value={layer.startFrame}
          onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { startFrame: v })}
          step={1} precision={0}
        />
      </PropRow>
      <PropRow label="End">
        <NumberInput
          value={layer.endFrame}
          onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { endFrame: v })}
          step={1} precision={0}
        />
      </PropRow>
      <PropRow label="Visible" animatable="visible" layer={layer} compId={compId} currentFrame={currentFrame}>
        <CheckboxInput
          value={layer.visible}
          onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { visible: v })}
        />
      </PropRow>
      <PropRow label="Locked">
        <CheckboxInput
          value={layer.locked}
          onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { locked: v })}
        />
      </PropRow>
      <PropRow label="Motion Blur">
        <CheckboxInput
          value={layer.motionBlur ?? false}
          onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { motionBlur: v })}
        />
      </PropRow>
    </>
  );
};

/** Minimal properties for non-visual layer types (audio, null, adjustment, camera, light). */
const NonVisibleContent: React.FC<{ layer: Layer; compId: string }> = ({ layer, compId }) => {
  const upd = (patch: Partial<Layer>) =>
    useCompositionStore.getState().updateLayer(compId, layer.id, patch);

  return (
    <>
      <PropRow label="Start">
        <NumberInput value={layer.startFrame} onChange={v => upd({ startFrame: v })} step={1} precision={0} />
      </PropRow>
      <PropRow label="End">
        <NumberInput value={layer.endFrame} onChange={v => upd({ endFrame: v })} step={1} precision={0} />
      </PropRow>
      <PropRow label="Visible">
        <CheckboxInput value={layer.visible} onChange={v => upd({ visible: v })} />
      </PropRow>
      <PropRow label="Locked">
        <CheckboxInput value={layer.locked} onChange={v => upd({ locked: v })} />
      </PropRow>

      {/* Camera properties */}
      {layer.type === 'camera' && layer.cameraData && (
        <>
          <PropRow label="Focal Length">
            <NumberInput value={layer.cameraData.focalLength} min={8} max={300} step={1} precision={0}
              onChange={v => upd({ cameraData: { ...layer.cameraData!, focalLength: v } })} />
          </PropRow>
          <PropRow label="Aperture">
            <NumberInput value={layer.cameraData.aperture} min={0} max={100} step={0.1}
              onChange={v => upd({ cameraData: { ...layer.cameraData!, aperture: v } })} />
          </PropRow>
          <PropRow label="Focus Distance">
            <NumberInput value={layer.cameraData.focusDistance} min={1} max={5000} step={1} precision={0}
              onChange={v => upd({ cameraData: { ...layer.cameraData!, focusDistance: v } })} />
          </PropRow>
          <PropRow label="Zoom">
            <NumberInput value={layer.cameraData.zoom} min={0.1} max={10} step={0.1}
              onChange={v => upd({ cameraData: { ...layer.cameraData!, zoom: v } })} />
          </PropRow>
        </>
      )}

      {/* Light properties */}
      {layer.type === 'light' && layer.lightData && (
        <>
          <PropRow label="Type">
            <select value={layer.lightData.lightType} onChange={e => upd({ lightData: { ...layer.lightData!, lightType: e.target.value as any } })}
              style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-xs)', height: 24, padding: '0 4px' }}>
              <option value="parallel">Parallel</option>
              <option value="spot">Spot</option>
              <option value="point">Point</option>
              <option value="ambient">Ambient</option>
            </select>
          </PropRow>
          <PropRow label="Intensity">
            <NumberInput value={layer.lightData.intensity} min={0} max={500} step={1} precision={0}
              onChange={v => upd({ lightData: { ...layer.lightData!, intensity: v } })} />
          </PropRow>
          <PropRow label="Cast Shadows">
            <CheckboxInput value={layer.lightData.castsShadows}
              onChange={v => upd({ lightData: { ...layer.lightData!, castsShadows: v } })} />
          </PropRow>
          {layer.lightData.lightType === 'spot' && (
            <PropRow label="Cone Angle">
              <NumberInput value={layer.lightData.coneAngle} min={1} max={179} step={1} precision={0}
                onChange={v => upd({ lightData: { ...layer.lightData!, coneAngle: v } })} />
            </PropRow>
          )}
        </>
      )}

      {/* 3D Transform (for layers with is3D enabled) */}
      {layer.is3D && layer.transform3D && (
        <>
          <PropRow label="Z Position">
            <NumberInput value={layer.transform3D.position.z} step={1} precision={0}
              onChange={v => upd({ transform3D: { ...layer.transform3D!, position: { ...layer.transform3D!.position, z: v } } })} />
          </PropRow>
          <PropRow label="X Rotation">
            <NumberInput value={layer.transform3D.rotationX} min={-360} max={360} step={1} precision={0}
              onChange={v => upd({ transform3D: { ...layer.transform3D!, rotationX: v } })} />
          </PropRow>
          <PropRow label="Y Rotation">
            <NumberInput value={layer.transform3D.rotationY} min={-360} max={360} step={1} precision={0}
              onChange={v => upd({ transform3D: { ...layer.transform3D!, rotationY: v } })} />
          </PropRow>
          <PropRow label="Z Rotation">
            <NumberInput value={layer.transform3D.rotationZ} min={-360} max={360} step={1} precision={0}
              onChange={v => upd({ transform3D: { ...layer.transform3D!, rotationZ: v } })} />
          </PropRow>
        </>
      )}
    </>
  );
};

export const LayerSection: React.FC<Props> = ({ layer, compId }) => {
  const isVisible = VISIBLE_LAYER_TYPES.has(layer.type);

  return (
    <Section label="Layer">
      {isVisible
        ? <VisibleContent layer={layer} compId={compId} />
        : <NonVisibleContent layer={layer} compId={compId} />
      }
    </Section>
  );
};
