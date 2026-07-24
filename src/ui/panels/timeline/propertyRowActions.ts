/**
 * propertyRowActions — reusable insert/delete keyframe actions for a
 * (layerId, propertyPath) at the current playhead frame.
 *
 * The `readCurrentValue` function is the source of truth for what value
 * gets stored when the user hits the "add keyframe" diamond. If it returns
 * 0 for a valid property, that keyframe will lock the slider at 0 forever.
 *
 * All property path patterns are handled here — audio pan, spatial audio,
 * mask props, camera props, effect params, everything.
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
 * Read the current value of a property. Covers ALL patterns:
 *   - transform.*                → layer.transform.*
 *   - transform3D.*              → layer.transform3D.*
 *   - opacity                    → layer.opacity
 *   - volume, pan, playbackRate  → layer.data.volume / pan / playbackRate
 *   - fadeIn, fadeOut            → layer.data.fadeIn / fadeOut
 *   - spatial.<field>            → layer.data.spatial<Field>
 *   - mask.<maskId>.<field>      → maskStore
 *   - effect.<effectId>.<param>  → effectsStore
 *   - audioEffect.<id>.<param>   → layer.data.audioEffects[id].params[param]
 *   - eq.<bandIdx>.<field>       → layer.data.eq.bands[i].<field>
 *   - camera.*                   → composition camera fields
 *   - timeRemap                  → engine evaluation
 *   - <arbitrary layer.data field> → falls back to reading layer.data[field]
 */
function readCurrentValue(layerId: string, propertyPath: string): number | number[] | string | boolean {
  const cs = useCompositionStore.getState();
  const comp = cs.activeCompositionId
    ? cs.compositions.find(c => c.id === cs.activeCompositionId)
    : null;

  // ── Camera pseudo-layer ─────────────────────────────────
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
  const d: any = layer.data ?? {};

  // ── Transform 2D ──────────────────────────────────────
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

  // ── Transform 3D ──────────────────────────────────────
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

  // ── Audio/video basic data ───────────────────────────
  if (propertyPath === 'volume') {
    let v = d?.volume ?? 1;
    if (v > 2) v = v / 100;    // legacy percent format
    return v;
  }
  if (propertyPath === 'pan')            return d?.pan ?? 0;
  if (propertyPath === 'playbackRate')   return d?.playbackRate ?? 1;
  if (propertyPath === 'fadeIn')         return d?.fadeIn ?? 0;
  if (propertyPath === 'fadeOut')        return d?.fadeOut ?? 0;

  // ── Spatial audio ────────────────────────────────────
  if (propertyPath.startsWith('spatial.')) {
    const field = propertyPath.slice('spatial.'.length);
    const spatialMap: Record<string, any> = {
      positionX:      d?.spatialX ?? 0,
      positionY:      d?.spatialY ?? 0,
      positionZ:      d?.spatialZ ?? 0,
      refDistance:    d?.spatialRefDistance ?? 200,
      maxDistance:    d?.spatialMaxDistance ?? 2000,
      rolloff:        d?.spatialRolloff ?? 1,
      coneInnerAngle: d?.spatialConeInnerAngle ?? 360,
      coneOuterAngle: d?.spatialConeOuterAngle ?? 360,
      coneOuterGain:  d?.spatialConeOuterGain ?? 0,
      orientX:        d?.spatialOrientX ?? 0,
      orientY:        d?.spatialOrientY ?? 0,
      orientZ:        d?.spatialOrientZ ?? 1,
    };
    return spatialMap[field] ?? 0;
  }

  // ── Mask properties ──────────────────────────────────
  if (propertyPath.startsWith('mask.')) {
    // mask.<maskId>.<field>
    const parts = propertyPath.split('.');
    if (parts.length >= 3) {
      const maskId = parts[1];
      const field = parts.slice(2).join('.');
      const maskStore = (window as any).__maskStore?.getState?.();
      if (maskStore) {
        const masks = maskStore.getMasksForLayer(layerId) ?? [];
        const mask = masks.find((m: any) => m.id === maskId);
        if (mask) {
          // Prefer top-level field, else params.<field>
          if (field in mask) return mask[field];
          if (mask.params && field in mask.params) return mask.params[field];
        }
      }
      return 0;
    }
  }

  // ── Audio effect param — audioEffect.<instanceId>.<paramKey> ──
  if (propertyPath.startsWith('audioEffect.')) {
    const parts = propertyPath.split('.');
    if (parts.length >= 3) {
      const instanceId = parts[1];
      const paramKey = parts.slice(2).join('.');
      const effects = d?.audioEffects ?? [];
      const fx = effects.find((e: any) => e.id === instanceId);
      if (fx) {
        if (paramKey === 'mix') return fx.mix ?? 1;
        if (paramKey === 'enabled') return fx.enabled !== false;
        const v = fx.params?.[paramKey];
        if (v !== undefined) return v;
      }
      return 0;
    }
  }

  // ── EQ band — eq.<bandIdx>.<field> ──
  if (propertyPath.startsWith('eq.')) {
    const parts = propertyPath.split('.');
    if (parts.length >= 3) {
      const bandIdx = parseInt(parts[1], 10);
      const field = parts.slice(2).join('.');
      const bands = d?.eq?.bands ?? [];
      const band = bands[bandIdx];
      if (band && field in band) return band[field];
    }
    return 0;
  }

  // ── Time remap ───────────────────────────────────────
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
    const gf = currentGlobalFrame();
    return gf ? toLocalFrame(layerId, gf.frame) : 0;
  }

  // ── Layer effect param — effect.<effectId>.<paramId> ──
  if (propertyPath.startsWith('effect.')) {
    const parts = propertyPath.split('.');
    if (parts.length >= 3) {
      const effectsStore = (window as any).__effectsStore?.getState?.();
      if (!effectsStore) return 0;
      const effects = effectsStore.getEffectsForLayer?.(layerId) ?? [];
      const eff = effects.find((e: any) => e.id === parts[1]);
      const paramKey = parts.slice(2).join('.');
      const param = eff?.parameters?.find((p: any) => p.id === paramKey);
      return param?.value ?? 0;
    }
  }

  // ── Adjust layer bundle — adjust.<field> ─────────────
  if (propertyPath.startsWith('adjust.')) {
    const field = propertyPath.slice('adjust.'.length);
    const adj = d?.adjust ?? {};
    if (field in adj) return adj[field];
    return 0;
  }

  // Cutout properties
  if (propertyPath.startsWith('cutout.')) {
    const field = propertyPath.slice('cutout.'.length);
    const c = d?.cutout ?? {};
    // Nested paths for stroke sub-object
    if (field.startsWith('stroke.')) {
      const sf = field.slice('stroke.'.length);
      const s = c.stroke ?? {};
      if (sf === 'width') return s.width ?? 4;
      if (sf === 'softness') return s.softness ?? 40;
      return s[sf] ?? 0;
    }
    if (field.startsWith('chroma.')) {
      const cf = field.slice('chroma.'.length);
      const ch = c.chroma ?? {};
      if (cf === 'similarity')   return ch.similarity ?? 40;
      if (cf === 'smoothness')   return ch.smoothness ?? 20;
      if (cf === 'spillSuppress')return ch.spillSuppress ?? 30;
      return ch[cf] ?? 0;
    }
    if (field === 'feather')    return c.feather ?? 2;
    if (field === 'contract')   return c.contract ?? 0;
    if (field === 'smoothing')  return c.smoothing ?? 30;
    if (field === 'threshold')  return c.threshold ?? 50;
    return c[field] ?? 0;
  }

  // ── Generic fallback — direct layer.data field ────────
  // Handles arbitrary top-level fields future code might key on.
  if (propertyPath in d) return d[propertyPath];

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
    if (!store.isPropertyAnimated?.(layerId, propertyPath)) {
      store.toggleAnimatedProperty?.(layerId, propertyPath);
    }
  }
}

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