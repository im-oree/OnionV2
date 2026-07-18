import React, { useCallback } from 'react';
import { Section, PropRow } from './Section';
import { Vector2Input } from './inputs/Vector2Input';
import { NumberInput } from './inputs/NumberInput';
import type { Layer } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useTimelineStore } from '../../../state/timelineStore';

interface Props { layer: Layer; compId: string; }

function kfId(): string {
  return `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

export const TransformSection: React.FC<Props> = ({ layer, compId }) => {
  const t = layer.transform;

  const currentFrame = useCompositionStore((s) => {
    const comp = s.activeCompositionId ? s.compositions.find(c => c.id === s.activeCompositionId) : null;
    return comp ? Math.round(comp.currentTime * comp.fps) : 0;
  });

  const isPropertyAnimated = useKeyframeStore(s => s.isPropertyAnimated);
  const addKeyframe = useKeyframeStore(s => s.addKeyframe);
  const engine = useKeyframeStore(s => s.engine);

  const insertOrUpdateKf = useCallback((prop: string, value: number | number[]) => {
    const store = useKeyframeStore.getState();
    if (!store.isPropertyAnimated(layer.id, prop)) {
      store.toggleAnimatedProperty(layer.id, prop);
    }
    const existing = engine.getKeyframesForProperty(layer.id, prop).find(k => k.time === currentFrame);
    if (existing) store.updateKeyframe(existing.id, { value });
    else addKeyframe(layer.id, {
      id: kfId(), property: prop, layerId: layer.id,
      time: currentFrame, value, interpolation: 'linear',
    });
  }, [layer.id, currentFrame, engine, addKeyframe]);

  const autoOrExistingKf = useCallback((prop: string, value: number | number[]) => {
    const autoKey = useTimelineStore.getState().autoKey;
    if (autoKey) { insertOrUpdateKf(prop, value); return; }
    if (!isPropertyAnimated(layer.id, prop)) return;
    const existing = engine.getKeyframesForProperty(layer.id, prop).find(k => k.time === currentFrame);
    if (existing) useKeyframeStore.getState().updateKeyframe(existing.id, { value });
    else addKeyframe(layer.id, {
      id: kfId(), property: prop, layerId: layer.id,
      time: currentFrame, value, interpolation: 'linear',
    });
  }, [layer.id, currentFrame, isPropertyAnimated, engine, addKeyframe, insertOrUpdateKf]);

  const updateTransform = useCallback((patch: Partial<Layer['transform']>, prop?: string) => {
    const nt = { ...layer.transform, ...patch };
    useCompositionStore.getState().updateLayer(compId, layer.id, { transform: nt });
    if (prop) autoOrExistingKf(prop, getTransformValue(prop, nt));
  }, [layer, compId, autoOrExistingKf]);

  const updateOpacity = useCallback((v: number) => {
    useCompositionStore.getState().updateLayer(compId, layer.id, { opacity: v });
    autoOrExistingKf('opacity', v);
  }, [layer.id, compId, autoOrExistingKf]);

  return (
    <Section label="Transform">
      <PropRow label="Anchor" animatable="transform.anchorPoint" layer={layer} currentFrame={currentFrame} compId={compId}>
        <Vector2Input x={t.anchorPoint.x} y={t.anchorPoint.y}
          onChange={(x, y) => updateTransform({ anchorPoint: { x, y } }, 'transform.anchorPoint')}
          step={1} precision={1} />
      </PropRow>
      <PropRow label="Position" animatable="transform.position" layer={layer} currentFrame={currentFrame} compId={compId}>
        <Vector2Input x={t.position.x} y={t.position.y}
          onChange={(x, y) => updateTransform({ position: { x, y } }, 'transform.position')}
          step={1} precision={1} />
      </PropRow>
      <PropRow label="Scale" animatable="transform.scale" layer={layer} currentFrame={currentFrame} compId={compId}>
        <Vector2Input x={t.scale.x} y={t.scale.y}
          onChange={(x, y) => updateTransform({ scale: { x, y } }, 'transform.scale')}
          min={-10000} max={10000} step={1} precision={1} />
      </PropRow>
      <PropRow label="Rotation" animatable="transform.rotation" layer={layer} currentFrame={currentFrame} compId={compId}>
        <NumberInput value={t.rotation}
          onChange={(v) => updateTransform({ rotation: v }, 'transform.rotation')}
          step={1} precision={1} label="°" />
      </PropRow>
      <PropRow label="Opacity" animatable="opacity" layer={layer} currentFrame={currentFrame} compId={compId}>
        <NumberInput value={layer.opacity} onChange={updateOpacity}
          min={0} max={100} step={1} precision={0} label="%" />
      </PropRow>
    </Section>
  );
};

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