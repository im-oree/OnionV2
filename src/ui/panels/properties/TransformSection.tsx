import React from 'react';
import { Section, PropRow } from './Section';
import { Vector2Input } from './inputs/Vector2Input';
import { NumberInput } from './inputs/NumberInput';
import type { Layer } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';

interface Props {
  layer: Layer;
  compId: string;
}

/**
 * Auto-keyframe helper: if animation is ON for this property and there's no
 * keyframe at the current frame, auto-create one with the new value.
 * This matches AE behavior (spec #10).
 */
function autoKeyframeIfNeeded(layerId: string, propPath: string, currentFrame: number, value: number | number[]) {
  const kfStore = useKeyframeStore.getState();
  if (!kfStore.isPropertyAnimated(layerId, propPath)) return;
  const kfs = kfStore.engine.getKeyframesForProperty(layerId, propPath);
  const atFrame = kfs.some((k) => k.time === currentFrame);
  if (!atFrame) {
    kfStore.addKeyframe(layerId, {
      id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      property: propPath,
      layerId,
      time: currentFrame,
      value,
      interpolation: 'linear',
    });
  } else {
    // Update existing keyframe's value
    const existing = kfs.find((k) => k.time === currentFrame);
    if (existing) kfStore.updateKeyframe(existing.id, { value });
  }
}

export const TransformSection: React.FC<Props> = ({ layer, compId }) => {
  const t = layer.transform;
  const comp = useCompositionStore((s) => s.activeCompositionId
    ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  const currentFrame = comp ? Math.floor(comp.currentTime * comp.fps) : 0;

  const update = (transform: Layer['transform'], propPath?: string) => {
    useCompositionStore.getState().updateLayer(compId, layer.id, { transform });
    // Auto-keyframe on change (spec #10)
    if (propPath) {
      const val = getTransformValue(propPath, transform);
      autoKeyframeIfNeeded(layer.id, propPath, currentFrame, val);
    }
  };

  return (
    <Section label="Transform">
      <PropRow label="Anchor" animatable="transform.anchorPoint" layer={layer} currentFrame={currentFrame} compId={compId}>
        <Vector2Input
          x={t.anchorPoint.x} y={t.anchorPoint.y}
          onChange={(x, y) => update({ ...t, anchorPoint: { x, y } }, 'transform.anchorPoint')}
          step={1} precision={1}
        />
      </PropRow>
      <PropRow label="Position" animatable="transform.position" layer={layer} currentFrame={currentFrame} compId={compId}>
        <Vector2Input
          x={t.position.x} y={t.position.y}
          onChange={(x, y) => update({ ...t, position: { x, y } }, 'transform.position')}
          step={1} precision={1}
        />
      </PropRow>
      <PropRow label="Scale" animatable="transform.scale" layer={layer} currentFrame={currentFrame} compId={compId}>
        <Vector2Input
          x={t.scale.x} y={t.scale.y}
          onChange={(x, y) => update({ ...t, scale: { x, y } }, 'transform.scale')}
          min={-10000} max={10000} step={1} precision={1}
        />
      </PropRow>
      <PropRow label="Rotation" animatable="transform.rotation" layer={layer} currentFrame={currentFrame} compId={compId}>
        <NumberInput value={t.rotation} onChange={(v) => update({ ...t, rotation: v }, 'transform.rotation')} step={1} precision={1} label="°" />
      </PropRow>
      <PropRow label="Opacity" animatable="opacity" layer={layer} currentFrame={currentFrame} compId={compId}>
        <NumberInput
          value={layer.opacity}
          onChange={(v) => {
            useCompositionStore.getState().updateLayer(compId, layer.id, { opacity: v });
            autoKeyframeIfNeeded(layer.id, 'opacity', currentFrame, v);
          }}
          min={0} max={100} step={1} precision={0} label="%"
        />
      </PropRow>
    </Section>
  );
};

/** Extract a single value from a Transform for a given property path */
function getTransformValue(path: string, transform: Layer['transform']): number | number[] {
  const field = path.replace('transform.', '');
  if (field === 'rotation') return transform.rotation;
  if (field === 'position') return [transform.position.x, transform.position.y];
  if (field === 'position.x') return transform.position.x;
  if (field === 'position.y') return transform.position.y;
  if (field === 'scale') return [transform.scale.x, transform.scale.y];
  if (field === 'scale.x') return transform.scale.x;
  if (field === 'scale.y') return transform.scale.y;
  if (field === 'anchorPoint') return [transform.anchorPoint.x, transform.anchorPoint.y];
  if (field === 'anchorPoint.x') return transform.anchorPoint.x;
  if (field === 'anchorPoint.y') return transform.anchorPoint.y;
  return 0;
}
