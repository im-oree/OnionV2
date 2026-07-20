import type { KeyframeEngine } from './KeyframeEngine';
import type { Transform } from '../types/layer';
import { useEffectsStore } from '../state/effectsStore';
import { useCompositionStore } from '../state/compositionStore';
import { useExpressionStore } from '../state/expressionStore';
import { expressionEngine } from './ExpressionEngine';

export interface RuntimeTransformOverride {
  position?: { x: number; y: number };
  scale?: { x: number; y: number };
  rotation?: number;
  anchorPoint?: { x: number; y: number };
  opacity?: number;
  volume?: number;
}

export type RuntimeOverrides = Map<string, RuntimeTransformOverride>;

export class PropertyBinder {
  readonly engine: KeyframeEngine;
  private _overrides: RuntimeOverrides = new Map();
  private _active = false;

  constructor(engine: KeyframeEngine) {
    this.engine = engine;
  }

  get overrides(): RuntimeOverrides { return this._overrides; }
  get hasOverrides(): boolean { return this._overrides.size > 0; }
  setActive(active: boolean): void { this._active = active; if (!active) this.clearOverrides(); }
  get isActive(): boolean { return this._active; }
  clearOverrides(): void { this._overrides.clear(); }

  /** Build the shared expression context for a layer at a given frame */
  private _buildExprCtx(layer: { id: string; name: string }, frame: number, comp: { id: string; width: number; height: number; duration: number; fps: number; layers: { id: string; name: string }[] }, evalFrame: number, value: number | number[]): Record<string, any> {
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
            // Recursion guard: simple depth counter prevents infinite cycles
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
    const comp = useCompositionStore.getState().compositions.find((c) => c.id === compId);
    if (!comp) return 0;

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

      // Evaluate keyframes relative to layer's start frame (local frame)
      // This ensures staggered/duplicated layers animate at different times
      const localFrame = Math.max(0, frame - layer.startFrame);

      for (const path of paths) {
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

        if (path.startsWith('effect.')) {
          const parts = path.split('.');
          if (parts.length >= 3) {
            effectUpdates.push({ effectId: parts[1], paramId: parts.slice(2).join('.'), value: val });
          }
          continue;
        }

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
          override.rotation = val as number; touched = true;
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

      for (const eu of effectUpdates) {
        useEffectsStore.getState().setParameterValue(layer.id, eu.effectId, eu.paramId, eu.value);
        updated++;
      }

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

    return updated;
  }
}
