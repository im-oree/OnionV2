/**
 * BakeToKeyframes — converts an expression on a property to per-frame keyframes.
 * Samples the expression at each frame in the work area (or full comp).
 * Disables the expression after baking.
 */
import { useExpressionStore } from '../../state/expressionStore';
import { useKeyframeStore } from '../../state/keyframeStore';
import { useCompositionStore } from '../../state/compositionStore';
import { expressionEngine } from '../../animation/ExpressionEngine';

export interface BakeOptions {
  layerId: string;
  property: string;
  compId: string;
  /** Sample every N frames (default 1 = every frame) */
  step?: number;
  /** Start frame (default: workAreaStart or 0) */
  startFrame?: number;
  /** End frame (default: workAreaEnd or totalFrames) */
  endFrame?: number;
}

export function bakeExpressionToKeyframes(options: BakeOptions): { keyframesCreated: number; error: string | null } {
  const { layerId, property, compId, step = 1 } = options;

  const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
  if (!comp) return { keyframesCreated: 0, error: 'Composition not found' };

  const layer = comp.layers.find(l => l.id === layerId);
  if (!layer) return { keyframesCreated: 0, error: 'Layer not found' };

  const exprEntry = useExpressionStore.getState().getExpression(layerId, property);
  if (!exprEntry || !exprEntry.source.trim()) {
    return { keyframesCreated: 0, error: 'No expression on this property' };
  }

  const totalFrames = Math.floor(comp.duration * comp.fps);
  const start = options.startFrame ?? (comp.workAreaStart != null ? Math.floor(comp.workAreaStart * comp.fps) : 0);
  const end = options.endFrame ?? (comp.workAreaEnd != null ? Math.floor(comp.workAreaEnd * comp.fps) : totalFrames);

  // Cache keyframes: remove all existing keyframes for this property first
  const kfStore = useKeyframeStore.getState();
  const existingKfs = kfStore.engine.getKeyframesForProperty(layerId, property);
  for (const kf of existingKfs) {
    kfStore.removeKeyframe(kf.id);
  }

  // Ensure the property is marked as animated
  if (!kfStore.isPropertyAnimated(layerId, property)) {
    kfStore.toggleAnimatedProperty(layerId, property);
  }

  let keyframesCreated = 0;

  for (let frame = start; frame <= end; frame += step) {
    const time = frame / comp.fps;
    const val = expressionEngine.evaluate(exprEntry.compiled, {
      time,
      frame,
      fps: comp.fps,
      value: 0,
      layerId,
      layerName: layer.name,
      compId: comp.id,
      compWidth: comp.width,
      compHeight: comp.height,
      compDuration: comp.duration,
      compFps: comp.fps,
      layerNameMap: Object.fromEntries(comp.layers.map(l => [l.name, l.id])),
      layerIds: comp.layers.map(l => l.id),
      getLayerProperty: (targetLayerId: string, propertyPath: string) => {
        const store = useKeyframeStore.getState();
        const result = store.engine.evaluate(targetLayerId, propertyPath, frame);
        return result.value;
      },
      getKeyframeTimes: (lid: string, prop: string) => {
        const store = useKeyframeStore.getState();
        return store.engine.getKeyframesForProperty(lid, prop).map(k => k.time);
      },
      getKeyframeValues: (lid: string, prop: string) => {
        const store = useKeyframeStore.getState();
        return store.engine.getKeyframesForProperty(lid, prop).map(k => k.value);
      },
    });

    if (val !== undefined) {
      kfStore.addKeyframe(layerId, {
        id: `bkf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        property,
        layerId,
        time: frame,
        value: val,
        interpolation: 'linear',
      });
      keyframesCreated++;
    }
  }

  // Remove the expression after baking — keyframes now exist in its place
  useExpressionStore.getState().removeExpression(layerId, property);

  return { keyframesCreated, error: null };
}
