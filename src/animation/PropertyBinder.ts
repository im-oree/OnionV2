/**
 * PropertyBinder — at each frame, evaluates all animated properties for all layers
 * and applies the results to the renderer's mesh transforms/uniforms.
 * This runs every frame the playhead moves — must be very fast.
 */
import type { KeyframeEngine } from './KeyframeEngine';
import type { Transform } from '../types/layer';
import { useCompositionStore } from '../state/compositionStore';
import { useEffectsStore } from '../state/effectsStore';

/**
 * Animation property paths map to layer transform/opacity/effect fields.
 * "transform.position.x" → layer.transform.position.x
 * "effect.<effectId>.<paramId>" → effectsStore parameter value
 * "opacity"             → layer.opacity
 */
export class PropertyBinder {
  private engine: KeyframeEngine;

  constructor(engine: KeyframeEngine) {
    this.engine = engine;
  }

  /**
   * Evaluate all animated properties for the active composition at the given frame.
   * Returns number of properties updated (for perf tracking).
   */
  evaluateFrame(compId: string, frame: number): number {
    const comp = useCompositionStore.getState().compositions.find((c) => c.id === compId);
    if (!comp) return 0;

    let updated = 0;

    for (const layer of comp.layers) {
      const paths = this.engine.getAllAnimatedProperties(layer.id);
      if (paths.length === 0) continue;

      const updates: Record<string, any> = {};
      const transformUpdate: Partial<Transform> = {};
      let transformNeedsUpdate = false;
      let opacityUpdate: number | null = null;
      // Phase 5: Track effect param updates
      const effectUpdates: Array<{ effectId: string; paramId: string; value: any }> = [];

      for (const path of paths) {
        const result = this.engine.evaluate(layer.id, path, frame);
        const val = result.value;

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

      if (transformNeedsUpdate) {
        const existing = layer.transform;
        updates.transform = {
          position: transformUpdate.position ?? existing.position,
          scale: transformUpdate.scale ?? existing.scale,
          rotation: transformUpdate.rotation ?? existing.rotation,
          anchorPoint: transformUpdate.anchorPoint ?? existing.anchorPoint,
        };
      }
      if (opacityUpdate !== null) {
        updates.opacity = opacityUpdate;
      }

      // Apply effect param updates
      for (const eu of effectUpdates) {
        useEffectsStore.getState().setParameterValue(layer.id, eu.effectId, eu.paramId, eu.value);
        updated++;
      }

      if (Object.keys(updates).length > 0) {
        useCompositionStore.getState().updateLayer(compId, layer.id, updates);
        updated += Object.keys(updates).length;
      }
    }

    return updated;
  }
}
