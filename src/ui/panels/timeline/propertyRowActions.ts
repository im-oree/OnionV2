/**
 * propertyRowActions — reusable insert/delete keyframe actions for a
 * (layerId, propertyPath) at the current playhead frame.
 */
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useNotificationStore } from '../../../state/notificationStore';
import type { Keyframe, InterpolationType } from '../../../types/keyframe';

/** Get the current global playhead frame for the active comp. */
function currentGlobalFrame(): { frame: number; fps: number; compId: string | null } | null {
  const cs = useCompositionStore.getState();
  const compId = cs.activeCompositionId;
  if (!compId) return null;
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return null;
  return {
    frame: Math.round(comp.currentTime * comp.fps),
    fps: comp.fps,
    compId,
  };
}

/** Compute local layer frame from global frame. */
function toLocalFrame(layerId: string, globalFrame: number): number {
  const cs = useCompositionStore.getState();
  const comp = cs.activeCompositionId
    ? cs.compositions.find(c => c.id === cs.activeCompositionId)
    : null;
  const layer = comp?.layers.find(l => l.id === layerId);
  if (!layer) return globalFrame;
  return Math.max(0, globalFrame - layer.startFrame);
}

/**
 * Read the current value of a property from the layer/composition data.
 * Used when inserting a new keyframe so it takes the "current" value.
 */
function readCurrentValue(layerId: string, propertyPath: string): number | number[] | string | boolean {
  const cs = useCompositionStore.getState();
  const comp = cs.activeCompositionId
    ? cs.compositions.find(c => c.id === cs.activeCompositionId)
    : null;

  // Camera pseudo-layer
  if (layerId === '__camera__' && comp) {
    const field = propertyPath.replace('camera.', '');
    const c: any = comp;
    switch (field) {
      case 'positionX': return c.cameraPositionX ?? 0;
      case 'positionY': return c.cameraPositionY ?? 0;
      case 'positionZ': return c.cameraPositionZ ?? 1000;
      case 'rotationX': return c.cameraRotationX ?? 0;
      case 'rotationY': return c.cameraRotationY ?? 0;
      case 'rotationZ': return c.cameraRotationZ ?? 0;
      case 'fov': return c.cameraFOV ?? 50;
      case 'zoom': return c.cameraZoom ?? 1;
      default: return 0;
    }
  }

  const layer = comp?.layers.find(l => l.id === layerId);
  if (!layer) return 0;

  // transform.*
  if (propertyPath === 'transform.position') return [layer.transform.position.x, layer.transform.position.y];
  if (propertyPath === 'transform.position.x') return layer.transform.position.x;
  if (propertyPath === 'transform.position.y') return layer.transform.position.y;
  if (propertyPath === 'transform.scale') return [layer.transform.scale.x, layer.transform.scale.y];
  if (propertyPath === 'transform.scale.x') return layer.transform.scale.x;
  if (propertyPath === 'transform.scale.y') return layer.transform.scale.y;
  if (propertyPath === 'transform.rotation') return layer.transform.rotation;
  if (propertyPath === 'transform.anchorPoint') return [layer.transform.anchorPoint.x, layer.transform.anchorPoint.y];
  if (propertyPath === 'transform.anchorPoint.x') return layer.transform.anchorPoint.x;
  if (propertyPath === 'transform.anchorPoint.y') return layer.transform.anchorPoint.y;
  if (propertyPath === 'opacity') return layer.opacity;

  // transform3D.*
  if (propertyPath.startsWith('transform3D.') && layer.transform3D) {
    const t3d: any = layer.transform3D;
    const field = propertyPath.slice('transform3D.'.length);
    if (field === 'position.x') return t3d.position.x;
    if (field === 'position.y') return t3d.position.y;
    if (field === 'position.z') return t3d.position.z;
    if (field === 'scale.x') return t3d.scale.x;
    if (field === 'scale.y') return t3d.scale.y;
    if (field === 'scale.z') return t3d.scale.z;
    if (field === 'rotationX') return t3d.rotationX;
    if (field === 'rotationY') return t3d.rotationY;
    if (field === 'rotationZ') return t3d.rotationZ;
  }

  // audio / video volume
  if (propertyPath === 'volume') {
    const d: any = layer.data;
    let v = d?.volume ?? 1;
    if (v > 1) v = v / 100;
    return v;
  }

  // Time remap
  if (propertyPath === 'timeRemap') {
    const engine = useKeyframeStore.getState().engine;
    const kfs = engine.getKeyframesForProperty(layerId, 'timeRemap');
    if (kfs.length >= 2) {
      const gf = currentGlobalFrame();
      if (gf) {
        const local = toLocalFrame(layerId, gf.frame);
        const r = engine.evaluate(layerId, 'timeRemap', local);
        if (typeof r.value === 'number') return r.value;
      }
    }
    // Default identity: current local frame
    const gf = currentGlobalFrame();
    return gf ? toLocalFrame(layerId, gf.frame) : 0;
  }

  // effect.<effectId>.<paramId>
  if (propertyPath.startsWith('effect.')) {
    const parts = propertyPath.split('.');
    if (parts.length >= 3) {
      const effectsStore = (window as any).__effectsStore?.getState?.();
      if (!effectsStore) return 0;
      const effects = effectsStore.getEffects?.(layerId) ?? [];
      const eff = effects.find((e: any) => e.id === parts[1]);
      const v = eff?.params?.[parts.slice(2).join('.')];
      return v ?? 0;
    }
  }

  return 0;
}

/**
 * Insert a keyframe for (layerId, propertyPath) at the playhead.
 * Uses the current property value. If a keyframe already exists at that
 * frame it's updated to the current value.
 */
export function insertKeyframeAtPlayhead(layerId: string, propertyPath: string): void {
  const gf = currentGlobalFrame();
  if (!gf) return;

  const engine = useKeyframeStore.getState().engine;
  const localFrame = layerId === '__camera__' ? gf.frame : toLocalFrame(layerId, gf.frame);
  const value = readCurrentValue(layerId, propertyPath);

  const existing = engine.getKeyframesForProperty(layerId, propertyPath).find(k => k.time === localFrame);
  const store = useKeyframeStore.getState();

  if (existing) {
    store.updateKeyframe(existing.id, { value });
    useNotificationStore.getState().addNotification({
      type: 'info', message: `Updated keyframe at frame ${localFrame}`, autoDismiss: 1500,
    });
  } else {
    const kf: Keyframe = {
      id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      layerId,
      property: propertyPath,
      time: localFrame,
      value,
      interpolation: 'linear' as InterpolationType,
    };
    store.addKeyframe(layerId, kf);
    // Also mark property as animated so the timeline row shows
    if (!store.isPropertyAnimated?.(layerId, propertyPath)) {
      store.toggleAnimatedProperty?.(layerId, propertyPath);
    }
  }
}

/**
 * Delete keyframe at playhead (exact frame match).
 * If none exists, no-op with a subtle notification.
 */
export function deleteKeyframeAtPlayhead(layerId: string, propertyPath: string): void {
  const gf = currentGlobalFrame();
  if (!gf) return;

  const localFrame = layerId === '__camera__' ? gf.frame : toLocalFrame(layerId, gf.frame);
  const engine = useKeyframeStore.getState().engine;
  const existing = engine.getKeyframesForProperty(layerId, propertyPath).find(k => k.time === localFrame);
  if (!existing) {
    useNotificationStore.getState().addNotification({
      type: 'info', message: `No keyframe at frame ${localFrame} to delete`, autoDismiss: 1500,
    });
    return;
  }
  useKeyframeStore.getState().removeKeyframe(existing.id);
}
