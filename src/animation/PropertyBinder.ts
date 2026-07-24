import type { KeyframeEngine } from './KeyframeEngine';
import { useEffectsStore } from '../state/effectsStore';
import { useCompositionStore } from '../state/compositionStore';
import { useExpressionStore } from '../state/expressionStore';
import { useTimelineStore } from '../state/timelineStore';
import { expressionEngine } from './ExpressionEngine';
import { userEditGuard } from './UserEditGuard';

export interface RuntimeTransformOverride {
  position?: { x: number; y: number };
  scale?: { x: number; y: number };
  rotation?: number;
  anchorPoint?: { x: number; y: number };
  opacity?: number;
  volume?: number;
  /** Non-transform overrides â€” applied to renderer state without touching Zustand. */
  transform3D?: any;
  effectParams?: Array<{ effectId: string; paramId: string; value: any }>;
  dataOverride?: any;
}

export type RuntimeOverrides = Map<string, RuntimeTransformOverride>;

/** Camera property overrides captured during playback (applied by Renderer, not stored). */
export interface CameraRuntimeOverride {
  cameraPositionX?: number;
  cameraPositionY?: number;
  cameraPositionZ?: number;
  cameraRotationX?: number;
  cameraRotationY?: number;
  cameraRotationZ?: number;
  cameraFOV?: number;
  cameraZoom?: number;
  cameraFocusDistance?: number;
  cameraAperture?: number;
}

export class PropertyBinder {
  readonly engine: KeyframeEngine;
  private _overrides: RuntimeOverrides = new Map();
  private _cameraOverride: CameraRuntimeOverride = {};
  private _active = false;

  constructor(engine: KeyframeEngine) {
    this.engine = engine;
  }

  get overrides(): RuntimeOverrides { return this._overrides; }
  get cameraOverride(): CameraRuntimeOverride { return this._cameraOverride; }
  get hasOverrides(): boolean { return this._overrides.size > 0; }
  get hasCameraOverride(): boolean { return Object.keys(this._cameraOverride).length > 0; }

  setActive(active: boolean): void {
    this._active = active;
    if (!active) this.clearOverrides();
  }
  get isActive(): boolean { return this._active; }

  clearOverrides(): void {
    this._overrides.clear();
    this._cameraOverride = {};
  }

  private _buildExprCtx(
    layer: { id: string; name: string },
    frame: number,
    comp: { id: string; width: number; height: number; duration: number; fps: number; layers: { id: string; name: string }[] },
    evalFrame: number,
    value: number | number[],
  ): Record<string, any> {
    const engine = this.engine;
    return {
      time: frame / comp.fps, frame: evalFrame, fps: comp.fps, value,
      layerId: layer.id, layerName: layer.name,
      compId: comp.id,
      compWidth: comp.width, compHeight: comp.height,
      compDuration: comp.duration, compFps: comp.fps,
      layerNameMap: Object.fromEntries(comp.layers.map(l => [l.name, l.id])),
      layerIds: comp.layers.map(l => l.id),
      getLayerProperty: (targetLayerId: string, propertyPath: string, atTime?: number) => {
        const evalTime = atTime != null ? Math.floor(atTime * (comp.fps ?? 30)) : frame;
        const targetExpr = useExpressionStore.getState().getExpression(targetLayerId, propertyPath);
        if (targetExpr?.enabled && !targetExpr.compiled.error) {
          try {
            if ((this as any)._evalDepth > 8) return engine.evaluate(targetLayerId, propertyPath, evalTime).value;
            (this as any)._evalDepth = ((this as any)._evalDepth ?? 0) + 1;
            const baseVal = engine.evaluate(targetLayerId, propertyPath, evalTime).value;
            const result = expressionEngine.evaluate(targetExpr.compiled, {
              time: evalTime / (comp.fps ?? 30), frame: evalTime,
              fps: comp.fps ?? 30, value: baseVal,
              layerId: targetLayerId,
              compWidth: comp.width ?? 1920, compHeight: comp.height ?? 1080,
              compDuration: comp.duration ?? 10, compFps: comp.fps ?? 30,
            });
            (this as any)._evalDepth--;
            return result;
          } catch {
            (this as any)._evalDepth = 0;
          }
        }
        return engine.evaluate(targetLayerId, propertyPath, evalTime).value;
      },
      getKeyframeTimes: (lid: string, prop: string) =>
        engine.getKeyframesForProperty(lid, prop).map(k => k.time),
      getKeyframeValues: (lid: string, prop: string) =>
        engine.getKeyframesForProperty(lid, prop).map(k => k.value),
    };
  }

  evaluateFrame(compId: string, frame: number): number {
    this._overrides.clear();
    this._cameraOverride = {};

    const comp = useCompositionStore.getState().compositions.find((c) => c.id === compId);
    if (!comp) return 0;

    const isPlaying = useTimelineStore.getState().playbackState === 'playing';
    let updated = 0;

    for (const layer of comp.layers) {
      const paths = this.engine.getAllAnimatedProperties(layer.id);
      const exprCheckPaths = ['transform.position', 'transform.scale', 'transform.rotation', 'opacity', 'transform.anchorPoint'];
      const hasAnyExpr = exprCheckPaths.some(p => {
        const e = useExpressionStore.getState().getExpression(layer.id, p);
        return e && e.enabled && !e.compiled.error;
      });
      if (paths.length === 0 && !hasAnyExpr) continue;

      const override: RuntimeTransformOverride = {
        position: { x: layer.transform.position.x, y: layer.transform.position.y },
        scale: { x: layer.transform.scale.x, y: layer.transform.scale.y },
        rotation: layer.transform.rotation,
        anchorPoint: { x: layer.transform.anchorPoint.x, y: layer.transform.anchorPoint.y },
        opacity: layer.opacity,
      };

      let touched = false;
      const effectUpdates: Array<{ effectId: string; paramId: string; value: any }> = [];
      let transform3DPatch: any = null;
      let dataPatch: any = null;

      const localFrame = Math.max(0, frame - layer.startFrame);

      for (const path of paths) {
        // Skip properties the user is actively editing — don't overwrite
        // their in-progress drag/type with an interpolated keyframe value.
        if (userEditGuard.isGuarded(layer.id, path)) continue;

        const result = this.engine.evaluate(layer.id, path, localFrame);
        let val = result.value;

        let evalFrame = frame;
        const exprEntry = useExpressionStore.getState().getExpression(layer.id, path);
        if (exprEntry?.enabled && !exprEntry.compiled.error) {
          const src = exprEntry.source;
          const kfs = this.engine.getKeyframesForProperty(layer.id, path);
          if (kfs.length >= 2) {
            const first = kfs[0].time, last = kfs[kfs.length - 1].time;
            const span = last - first;
            if (span > 0) {
              if (/loopOut\s*\(/.test(src) && frame > last) {
                const overflow = (frame - last) % span;
                evalFrame = first + overflow;
                val = this.engine.evaluate(layer.id, path, evalFrame).value;
              } else if (/loopIn\s*\(/.test(src) && frame < first) {
                const underflow = (first - frame) % span;
                evalFrame = last - underflow;
                val = this.engine.evaluate(layer.id, path, evalFrame).value;
              }
            }
          }
        }

        if (exprEntry && exprEntry.enabled && !exprEntry.compiled.error) {
          try {
            val = expressionEngine.evaluate(exprEntry.compiled,
              this._buildExprCtx(layer, frame, comp, evalFrame, val));
          } catch { /* keep val */ }
        }

        // â”€â”€ transform3D.* â”€â”€
        if (path.startsWith('transform3D.')) {
          const field = path.slice('transform3D.'.length);
          const layerData = layer as any;
          if (!layerData.is3D || !layerData.transform3D) continue;

          if (!transform3DPatch) transform3DPatch = { ...layerData.transform3D };

          if (field === 'position.x') transform3DPatch.position = { ...transform3DPatch.position, x: val as number };
          else if (field === 'position.y') transform3DPatch.position = { ...transform3DPatch.position, y: val as number };
          else if (field === 'position.z') transform3DPatch.position = { ...transform3DPatch.position, z: val as number };
          else if (field === 'scale.x') transform3DPatch.scale = { ...transform3DPatch.scale, x: val as number };
          else if (field === 'scale.y') transform3DPatch.scale = { ...transform3DPatch.scale, y: val as number };
          else if (field === 'scale.z') transform3DPatch.scale = { ...transform3DPatch.scale, z: val as number };
          else if (field === 'rotationX') transform3DPatch.rotationX = val as number;
          else if (field === 'rotationY') transform3DPatch.rotationY = val as number;
          else if (field === 'rotationZ') transform3DPatch.rotationZ = val as number;
          else if (field === 'anchorPoint.x') transform3DPatch.anchorPoint = { ...transform3DPatch.anchorPoint, x: val as number };
          else if (field === 'anchorPoint.y') transform3DPatch.anchorPoint = { ...transform3DPatch.anchorPoint, y: val as number };
          else if (field === 'anchorPoint.z') transform3DPatch.anchorPoint = { ...transform3DPatch.anchorPoint, z: val as number };
          continue;
        }

        // â”€â”€ audioEffect.* â”€â”€
        if (path.startsWith('audioEffect.')) {
          const parts = path.split('.');
          if (parts.length >= 3) {
            const instanceId = parts[1];
            const paramKey = parts.slice(2).join('.');
            const layerData = (layer as any).data ?? {};
            const currentEffects = (layerData.audioEffects ?? []) as any[];
            if (currentEffects.length > 0) {
              const nextEffects = currentEffects.map(e => {
                if (e.id !== instanceId) return e;
                if (paramKey === 'mix') return { ...e, mix: val as number };
                return { ...e, params: { ...(e.params ?? {}), [paramKey]: val as number } };
              });
              const baseData = dataPatch ?? layerData;
              dataPatch = { ...baseData, audioEffects: nextEffects };
              touched = true;
            }
          }
          continue;
        }

        // â”€â”€ eq.* â”€â”€
        // ── cutout.<field> and cutout.stroke.<field> ──
        if (path.startsWith('cutout.')) {
          const field = path.slice('cutout.'.length);
          const layerData = (layer as any).data ?? {};
          const currentCutout = layerData.cutout ?? {};
          let nextCutout: any;
          if (field.startsWith('chroma.')) {
            const cf = field.slice('chroma.'.length);
            nextCutout = {
              ...currentCutout,
              chroma: { ...(currentCutout.chroma ?? {}), [cf]: val },
            };
          } else if (field.startsWith('stroke.')) {
            const sf = field.slice('stroke.'.length);
            nextCutout = {
              ...currentCutout,
              stroke: { ...(currentCutout.stroke ?? {}), [sf]: val },
            };
          } else {
            nextCutout = { ...currentCutout, [field]: val };
          }
          const baseData = dataPatch ?? layerData;
          dataPatch = { ...baseData, cutout: nextCutout };
          touched = true;
          continue;
        }

        if (path.startsWith('eq.')) {
          const parts = path.split('.');
          if (parts.length >= 3) {
            const bandIdx = parseInt(parts[1], 10);
            const field = parts.slice(2).join('.');
            const layerData = (layer as any).data ?? {};
            const currentEq = layerData.eq;
            if (currentEq?.bands && !isNaN(bandIdx)) {
              const nextBands = currentEq.bands.map((b: any, i: number) =>
                i === bandIdx ? { ...b, [field]: val as number } : b,
              );
              const baseData = dataPatch ?? layerData;
              dataPatch = { ...baseData, eq: { ...currentEq, bands: nextBands } };
              touched = true;
            }
          }
          continue;
        }

        // â”€â”€ effect.* â”€â”€
        if (path.startsWith('effect.')) {
          const parts = path.split('.');
          if (parts.length >= 3) {
            const kfsForPath = this.engine.getKeyframesForProperty(layer.id, path);
            const hasExprForPath = (() => {
              const e = useExpressionStore.getState().getExpression(layer.id, path);
              return e && e.enabled && !e.compiled.error;
            })();
            const atExactKeyframe = kfsForPath.some(k => k.time === localFrame);
            const shouldWriteBack = hasExprForPath || kfsForPath.length >= 2 || atExactKeyframe;
            if (shouldWriteBack) {
              effectUpdates.push({ effectId: parts[1], paramId: parts.slice(2).join('.'), value: val });
            }
          }
          continue;
        }

        // â”€â”€ data.* â”€â”€
        if (path.startsWith('data.')) {
          const dataParts = path.slice('data.'.length).split('.');
          const currentData: any = dataPatch ?? (layer as any).data ?? {};
          const setDeep = (o: any, p: string[], v: any): any => {
            if (p.length === 0) return v;
            const [h, ...r] = p;
            return { ...(o ?? {}), [h]: r.length === 0 ? v : setDeep(o?.[h], r, v) };
          };
          dataPatch = setDeep(currentData, dataParts, val);
          continue;
        }

        // â”€â”€ transform.* â”€â”€
        if (path === 'transform.position' && Array.isArray(val)) {
          override.position = { x: val[0], y: val[1] }; touched = true;
        } else if (path === 'transform.position.x') {
          override.position = { x: val as number, y: override.position!.y }; touched = true;
        } else if (path === 'transform.position.y') {
          override.position = { x: override.position!.x, y: val as number }; touched = true;
        } else if (path === 'transform.scale' && Array.isArray(val)) {
          override.scale = { x: val[0], y: val[1] }; touched = true;
        } else if (path === 'transform.scale.x') {
          override.scale = { x: val as number, y: override.scale!.y }; touched = true;
        } else if (path === 'transform.scale.y') {
          override.scale = { x: override.scale!.x, y: val as number }; touched = true;
        } else if (path === 'transform.rotation') {
          const layerData = layer as any;
          if (layerData.is3D && layerData.transform3D) {
            if (!transform3DPatch) transform3DPatch = { ...layerData.transform3D };
            transform3DPatch.rotationZ = val as number;
          } else {
            override.rotation = val as number; touched = true;
          }
        } else if (path === 'transform.anchorPoint' && Array.isArray(val)) {
          override.anchorPoint = { x: val[0], y: val[1] }; touched = true;
        } else if (path === 'transform.anchorPoint.x') {
          override.anchorPoint = { x: val as number, y: override.anchorPoint!.y }; touched = true;
        } else if (path === 'transform.anchorPoint.y') {
          override.anchorPoint = { x: override.anchorPoint!.x, y: val as number }; touched = true;
        } else if (path === 'opacity') {
          override.opacity = val as number; touched = true;
        } else if (path === 'volume' && (layer.type === 'audio' || layer.type === 'video')) {
          override.volume = val as number; touched = true;
        }
      }

      // â”€â”€ Effect param updates: apply during playback via effectsStore silently.
      // The store DOES fire subscribers, so we only push during playback IF
      // the layer's effects are actually keyframed. Ideally we'd have a
      // "runtime effect override map" too, but for now this at least keeps
      // static effects untouched.
      for (const eu of effectUpdates) {
        // Second guard for effect params — the path guard above should
        // catch these, but double-check the specific effect param path
        // in case the property list was already collected before the
        // guard was set.
        const effectPath = `effect.${eu.effectId}.${eu.paramId}`;
        if (userEditGuard.isGuarded(layer.id, effectPath)) continue;
        useEffectsStore.getState().setParameterValue(layer.id, eu.effectId, eu.paramId, eu.value);
        updated++;
      }

      // â”€â”€ Stash transform3D/data patches as overrides â€” do NOT write to store during playback.
      // On pause, flushOverridesToStore() applies them.
      if (transform3DPatch) {
        override.transform3D = transform3DPatch;
        touched = true;
      }
      if (dataPatch) {
        override.dataOverride = dataPatch;
        touched = true;
      }

      // Standalone expressions on transform props (no keyframes)
      for (const path of exprCheckPaths) {
        if (paths.includes(path)) continue;
        const expr = useExpressionStore.getState().getExpression(layer.id, path);
        if (!expr || !expr.enabled || expr.compiled.error) continue;
        let originalVal: number | number[];
        if (path === 'opacity') originalVal = layer.opacity;
        else if (path === 'transform.position') originalVal = [layer.transform.position.x, layer.transform.position.y];
        else if (path === 'transform.scale') originalVal = [layer.transform.scale.x, layer.transform.scale.y];
        else if (path === 'transform.rotation') originalVal = layer.transform.rotation;
        else if (path === 'transform.anchorPoint') originalVal = [layer.transform.anchorPoint.x, layer.transform.anchorPoint.y];
        else continue;
        let evalVal: number | number[];
        try {
          evalVal = expressionEngine.evaluate(expr.compiled,
            this._buildExprCtx(layer, frame, comp, frame, originalVal));
        } catch { continue; }
        if (path === 'opacity' && typeof evalVal === 'number') { override.opacity = evalVal; touched = true; }
        else if (path === 'transform.position' && Array.isArray(evalVal)) { override.position = { x: evalVal[0], y: evalVal[1] }; touched = true; }
        else if (path === 'transform.scale' && Array.isArray(evalVal)) { override.scale = { x: evalVal[0], y: evalVal[1] }; touched = true; }
        else if (path === 'transform.rotation' && typeof evalVal === 'number') { override.rotation = evalVal; touched = true; }
        else if (path === 'transform.anchorPoint' && Array.isArray(evalVal)) { override.anchorPoint = { x: evalVal[0], y: evalVal[1] }; touched = true; }
      }

      if (touched) {
        this._overrides.set(layer.id, override);
        updated++;
      }
    }

    // === Camera keyframes â€” NEVER write to store during playback ===
    const CAMERA_PROP_ID = '__camera__';
    const cameraPaths = this.engine.getAllAnimatedProperties(CAMERA_PROP_ID);

    if (cameraPaths.length > 0) {
      for (const path of cameraPaths) {
        if (userEditGuard.isGuarded(CAMERA_PROP_ID, path)) continue;
        const result = this.engine.evaluate(CAMERA_PROP_ID, path, frame);
        let val = result.value;

        const exprEntry = useExpressionStore.getState().getExpression(CAMERA_PROP_ID, path);
        if (exprEntry?.enabled && !exprEntry.compiled.error) {
          try {
            val = expressionEngine.evaluate(exprEntry.compiled,
              this._buildExprCtx({ id: CAMERA_PROP_ID, name: 'Camera' }, frame, comp, frame, val));
          } catch { /* keep val */ }
        }

        const field = path.replace('camera.', '');
        if (field === 'positionX' && typeof val === 'number') this._cameraOverride.cameraPositionX = val;
        else if (field === 'positionY' && typeof val === 'number') this._cameraOverride.cameraPositionY = val;
        else if (field === 'positionZ' && typeof val === 'number') this._cameraOverride.cameraPositionZ = val;
        else if (field === 'rotationX' && typeof val === 'number') this._cameraOverride.cameraRotationX = val;
        else if (field === 'rotationY' && typeof val === 'number') this._cameraOverride.cameraRotationY = val;
        else if (field === 'rotationZ' && typeof val === 'number') this._cameraOverride.cameraRotationZ = val;
        else if (field === 'fov' && typeof val === 'number') this._cameraOverride.cameraFOV = val;
        else if (field === 'zoom' && typeof val === 'number') this._cameraOverride.cameraZoom = val;
        else if (field === 'focusDistance' && typeof val === 'number') this._cameraOverride.cameraFocusDistance = val;
        else if (field === 'aperture' && typeof val === 'number') this._cameraOverride.cameraAperture = val;
      }

      // If not playing (scrub / seek / cache build), flush camera overrides to the store
      // so all camera-panel UIs update. Skip during playback.
      // On scrub/seek/paused, flush camera overrides to the store so the
      // Camera panel UI reflects the current frame's values. BUT skip any
      // camera field the user is currently editing — otherwise we clobber
      // their live drag.
      if (!isPlaying && Object.keys(this._cameraOverride).length > 0) {
        const filtered: any = {};
        const fieldToPath: Record<string, string> = {
          cameraPositionX: 'camera.positionX',
          cameraPositionY: 'camera.positionY',
          cameraPositionZ: 'camera.positionZ',
          cameraRotationX: 'camera.rotationX',
          cameraRotationY: 'camera.rotationY',
          cameraRotationZ: 'camera.rotationZ',
          cameraFOV: 'camera.fov',
          cameraZoom: 'camera.zoom',
          cameraFocusDistance: 'camera.focusDistance',
          cameraAperture: 'camera.aperture',
        };
        for (const [k, v] of Object.entries(this._cameraOverride)) {
          const path = fieldToPath[k];
          if (path && userEditGuard.isCameraPropGuarded(path)) continue;
          filtered[k] = v;
        }
        if (Object.keys(filtered).length > 0) {
          useCompositionStore.getState().updateComposition(compId, filtered as any);
        }
      }
    }

    return updated;
  }

  /**
   * Called on pause/stop â€” flush transform3D and data overrides back to store.
   * Ensures properties panel reflects the paused frame's values.
   */
  flushOverridesToStore(compId: string): void {
    const cs = useCompositionStore.getState();

    for (const [layerId, override] of this._overrides) {
      const patch: any = {};
      if (override.transform3D) patch.transform3D = override.transform3D;
      if (override.dataOverride) patch.data = override.dataOverride;
      if (Object.keys(patch).length > 0) {
        cs.updateLayer(compId, layerId, patch, true);
      }
    }

    if (Object.keys(this._cameraOverride).length > 0) {
      cs.updateComposition(compId, this._cameraOverride as any);
    }
  }
}