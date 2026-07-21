/**
 * KeyframeHelpers — utility functions for auto-keyframing transforms.
 * Now also handles 3D transform properties (transform3D.*).
 */
import { useKeyframeStore } from '../../state/keyframeStore';
import type { Layer } from '../../types/layer';

function kfId(): string {
  return `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * If the layer's current transform differs from the start snapshot,
 * insert or update keyframes for the changed properties.
 * Also handles 3D transform properties when startTransform3D is provided.
 */
export function autoKeyTransform(
  layerId: string,
  currentTransform: Layer['transform'],
  startTransform: { pos: { x: number; y: number }; scale: { x: number; y: number }; rotation: number },
  currentFrame: number,
  startTransform3D?: { pos3d?: { x: number; y: number; z: number }; scale3d?: { x: number; y: number; z: number }; rotX?: number; rotY?: number; rotZ?: number } | null,
  currentTransform3D?: { position: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number }; rotationX: number; rotationY: number; rotationZ: number } | null,
): void {
  const store = useKeyframeStore.getState();
  const { engine } = store;

  const changedProps: Array<{ prop: string; value: number | number[] }> = [];
  const t = currentTransform;

  // 2D changes
  if (t.position.x !== startTransform.pos.x || t.position.y !== startTransform.pos.y) {
    changedProps.push({ prop: 'transform.position', value: [t.position.x, t.position.y] });
  }
  if (t.scale.x !== startTransform.scale.x || t.scale.y !== startTransform.scale.y) {
    changedProps.push({ prop: 'transform.scale', value: [t.scale.x, t.scale.y] });
  }
  if (t.rotation !== startTransform.rotation) {
    changedProps.push({ prop: 'transform.rotation', value: t.rotation });
  }

  // 3D changes — compare current vs start snapshot
  if (currentTransform3D && startTransform3D) {
    if (startTransform3D.rotZ !== undefined && currentTransform3D.rotationZ !== startTransform3D.rotZ) {
      changedProps.push({ prop: 'transform3D.rotationZ', value: currentTransform3D.rotationZ });
    }
    if (startTransform3D.pos3d && currentTransform3D.position.z !== startTransform3D.pos3d.z) {
      changedProps.push({ prop: 'transform3D.position.z', value: currentTransform3D.position.z });
    }
    if (startTransform3D.scale3d && currentTransform3D.scale.z !== startTransform3D.scale3d.z) {
      changedProps.push({ prop: 'transform3D.scale.z', value: currentTransform3D.scale.z });
    }
    if (startTransform3D.rotX !== undefined && currentTransform3D.rotationX !== startTransform3D.rotX) {
      changedProps.push({ prop: 'transform3D.rotationX', value: currentTransform3D.rotationX });
    }
    if (startTransform3D.rotY !== undefined && currentTransform3D.rotationY !== startTransform3D.rotY) {
      changedProps.push({ prop: 'transform3D.rotationY', value: currentTransform3D.rotationY });
    }
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
