/**
 * PropertyBinder — at each frame, evaluates all animated properties for all layers
 * and stores the results as RUNTIME OVERRIDES (not modifying the composition store).
 * The renderer applies these overrides directly to meshes during render.
 * 
 * This is critical: we NEVER modify the composition store during playback because
 * that would overwrite the original keyframe values, making it impossible to
 * re-evaluate the animation from the original data.
 */
import type { KeyframeEngine } from './KeyframeEngine';
import type { Transform } from '../types/layer';
import { useEffectsStore } from '../state/effectsStore';
import { useCompositionStore } from '../state/compositionStore';
import { useExpressionStore } from '../state/expressionStore';
import { expressionEngine } from './ExpressionEngine';

/** Runtime transform overrides for a single layer */
export interface RuntimeTransformOverride {
  position?: { x: number; y: number };
  scale?: { x: number; y: number };
  rotation?: number;
  anchorPoint?: { x: number; y: number };
  opacity?: number;
}

/** Map of layerId → transform overrides */
export type RuntimeOverrides = Map<string, RuntimeTransformOverride>;

/**
 * Animation property paths map to layer transform/opacity/effect fields.
 * "transform.position.x" → layer.transform.position.x
 * "effect.<effectId>.<paramId>" → effectsStore parameter value
 * "opacity"             → layer.opacity
 */
export class PropertyBinder {
  readonly engine: KeyframeEngine;
  private _overrides: RuntimeOverrides = new Map();
  private _active = false;

  constructor(engine: KeyframeEngine) {
    this.engine = engine;
  }

  /** Get current runtime overrides (read-only access for renderer) */
  get overrides(): RuntimeOverrides {
    return this._overrides;
  }

  /** Check if any overrides are active */
  get hasOverrides(): boolean {
    return this._overrides.size > 0;
  }

  /** Mark as active (playback started) */
  setActive(active: boolean): void {
    this._active = active;
    if (!active) {
      this.clearOverrides();
    }
  }

  get isActive(): boolean {
    return this._active;
  }

  /** Clear all runtime overrides */
  clearOverrides(): void {
    this._overrides.clear();
  }

  /**
   * Evaluate all animated properties for the active composition at the given frame.
   * Stores results as runtime overrides (does NOT modify the composition store).
   * Returns number of properties evaluated (for perf tracking).
   */
  evaluateFrame(compId: string, frame: number): number {
    // Clear previous overrides for this composition
    // (we rebuild them every frame based on current playhead)
    this._overrides.clear();

    const comp = useCompositionStore.getState().compositions.find((c) => c.id === compId);
    if (!comp) return 0;

    let updated = 0;

    for (const layer of comp.layers) {
      const paths = this.engine.getAllAnimatedProperties(layer.id);
      if (paths.length === 0) continue;

      const override: RuntimeTransformOverride = {};
      const transformUpdate: Partial<Transform> = {};
      let transformNeedsUpdate = false;
      let opacityUpdate: number | null = null;
      // Phase 5: Track effect param updates
      const effectUpdates: Array<{ effectId: string; paramId: string; value: any }> = [];

      for (const path of paths) {
        const result = this.engine.evaluate(layer.id, path, frame);
        let val = result.value;

        // Expressions override keyframe evaluation
        const expr = useExpressionStore.getState().getExpression(layer.id, path);
        if (expr && expr.enabled && !expr.compiled.error) {
          try {
            val = expressionEngine.evaluate(expr.compiled, {
              time: frame / comp.fps,
              frame,
              fps: comp.fps,
              value: val,
              layerId: layer.id,
              compWidth: comp.width,
              compHeight: comp.height,
              compDuration: comp.duration,
            });
          } catch { /* keep val */ }
        }

        // Phase 5: Effect parameter keyframing
        // propertyPath format: "effect.<effectId>.<paramId>"
        if (path.startsWith('effect.')) {
          const parts = path.split('.');
          if (parts.length >= 3) {
            const effectId = parts[1];
            const paramId = parts.slice(2).join('.');
            effectUpdates.push({ effectId, paramId, value: val });
          }
          continue;
        }

        // Determine which field to update based on path
        if (path.startsWith('transform.')) {
          const field = path.slice('transform.'.length);
          if (field === 'position.x') {
            transformUpdate.position = { ...layer.transform.position, x: val as number };
            transformNeedsUpdate = true;
          } else if (field === 'position.y') {
            transformUpdate.position = { ...layer.transform.position, y: val as number };
            transformNeedsUpdate = true;
          } else if (field === 'position' && Array.isArray(val)) {
            transformUpdate.position = { x: val[0], y: val[1] };
            transformNeedsUpdate = true;
          } else if (field === 'scale.x') {
            transformUpdate.scale = { ...layer.transform.scale, x: val as number };
            transformNeedsUpdate = true;
          } else if (field === 'scale.y') {
            transformUpdate.scale = { ...layer.transform.scale, y: val as number };
            transformNeedsUpdate = true;
          } else if (field === 'scale' && Array.isArray(val)) {
            transformUpdate.scale = { x: val[0], y: val[1] };
            transformNeedsUpdate = true;
          } else if (field === 'rotation') {
            transformUpdate.rotation = val as number;
            transformNeedsUpdate = true;
          } else if (field === 'anchorPoint.x') {
            transformUpdate.anchorPoint = { ...layer.transform.anchorPoint, x: val as number };
            transformNeedsUpdate = true;
          } else if (field === 'anchorPoint.y') {
            transformUpdate.anchorPoint = { ...layer.transform.anchorPoint, y: val as number };
            transformNeedsUpdate = true;
          }
        } else if (path === 'opacity') {
          opacityUpdate = val as number;
        }
      }

      // Build transform override (merge with existing if any)
      if (transformNeedsUpdate) {
        const existing = layer.transform;
        override.position = transformUpdate.position ?? existing.position;
        override.scale = transformUpdate.scale ?? existing.scale;
        override.rotation = transformUpdate.rotation ?? existing.rotation;
        override.anchorPoint = transformUpdate.anchorPoint ?? existing.anchorPoint;
      }
      if (opacityUpdate !== null) {
        override.opacity = opacityUpdate;
      }

      // Apply effect param updates (these go directly to effects store, not override)
      for (const eu of effectUpdates) {
        useEffectsStore.getState().setParameterValue(layer.id, eu.effectId, eu.paramId, eu.value);
        updated++;
      }

      // Also evaluate expressions on properties WITHOUT keyframes
      const exprPaths = ['transform.position', 'transform.scale', 'transform.rotation', 'opacity'];
      for (const path of exprPaths) {
        if (paths.includes(path)) continue; // already handled above
        const expr = useExpressionStore.getState().getExpression(layer.id, path);
        if (!expr || !expr.enabled || expr.compiled.error) continue;
        let originalVal: number | number[];
        if (path === 'opacity') originalVal = layer.opacity;
        else if (path === 'transform.position') originalVal = [layer.transform.position.x, layer.transform.position.y];
        else if (path === 'transform.scale') originalVal = [layer.transform.scale.x, layer.transform.scale.y];
        else if (path === 'transform.rotation') originalVal = layer.transform.rotation;
        else continue;
        let evalVal: number | number[];
        try {
          evalVal = expressionEngine.evaluate(expr.compiled, {
            time: frame / comp.fps, frame, fps: comp.fps, value: originalVal,
            layerId: layer.id, compWidth: comp.width, compHeight: comp.height, compDuration: comp.duration,
          });
        } catch { continue; }
        // Write into override
        if (path === 'opacity' && typeof evalVal === 'number') {
          override.opacity = evalVal;
        } else if (path === 'transform.position' && Array.isArray(evalVal)) {
          override.position = { x: evalVal[0], y: evalVal[1] };
        } else if (path === 'transform.scale' && Array.isArray(evalVal)) {
          override.scale = { x: evalVal[0], y: evalVal[1] };
        } else if (path === 'transform.rotation' && typeof evalVal === 'number') {
          override.rotation = evalVal;
        }
      }

      // Store override if we have any transforms
      if (Object.keys(override).length > 0) {
        this._overrides.set(layer.id, override);
        updated += Object.keys(override).length;
      }
    }

    return updated;
  }
}
