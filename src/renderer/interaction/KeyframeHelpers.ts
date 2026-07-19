/**
 * KeyframeHelpers — utility functions for auto-keyframing transforms.
 */
import { useKeyframeStore } from '../../state/keyframeStore';
import type { Layer } from '../../types/layer';

function kfId(): string {
  return `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * If the layer's current transform differs from the start snapshot,
 * insert or update keyframes for the changed properties.
 */
export function autoKeyTransform(
  layerId: string,
  currentTransform: Layer['transform'],
  startTransform: { pos: { x: number; y: number }; scale: { x: number; y: number }; rotation: number },
  currentFrame: number,
): void {
  const store = useKeyframeStore.getState();
  const { engine } = store;

  const changedProps: Array<{ prop: string; value: number | number[] }> = [];
  const t = currentTransform;

  if (t.position.x !== startTransform.pos.x || t.position.y !== startTransform.pos.y) {
    changedProps.push({ prop: 'transform.position', value: [t.position.x, t.position.y] });
  }
  if (t.scale.x !== startTransform.scale.x || t.scale.y !== startTransform.scale.y) {
    changedProps.push({ prop: 'transform.scale', value: [t.scale.x, t.scale.y] });
  }
  if (t.rotation !== startTransform.rotation) {
    changedProps.push({ prop: 'transform.rotation', value: t.rotation });
  }

  for (const { prop, value } of changedProps) {
    // Enable animated property if not already
    if (!store.isPropertyAnimated(layerId, prop)) {
      store.toggleAnimatedProperty(layerId, prop);
    }

    // Update existing keyframe at this frame, or add a new one
    const existing = engine.getKeyframesForProperty(layerId, prop)
      .find(k => k.time === currentFrame);
    if (existing) {
      store.updateKeyframe(existing.id, { value });
    } else {
      store.addKeyframe(layerId, {
        id: kfId(),
        property: prop,
        layerId,
        time: currentFrame,
        value,
        interpolation: 'linear',
      });
    }
  }
}
