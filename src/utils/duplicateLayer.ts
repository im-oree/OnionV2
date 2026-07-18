import type { Layer } from '../types/layer';
import { useCompositionStore } from '../state/compositionStore';
import { useKeyframeStore } from '../state/keyframeStore';

function genLayerId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
function genKfId(): string {
  return `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * Deep-duplicate a layer INCLUDING all its keyframes and animated-property registrations.
 * Adds the new layer to the composition and returns the new layer.
 */
export function duplicateLayer(compId: string, sourceLayer: Layer): Layer {
  const cs = useCompositionStore.getState();
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) throw new Error(`Composition ${compId} not found`);

  const newLayer: Layer = {
    ...JSON.parse(JSON.stringify(sourceLayer)),
    id: genLayerId(),
    name: `${sourceLayer.name} (copy)`,
    zIndex: comp.layers.length + 1,
  };

  cs.addLayer(compId, newLayer);

  // Copy keyframes from source layer to new layer
  const kfStore = useKeyframeStore.getState();
  const engine: any = kfStore.engine;
  const sourceProps: Map<string, any[]> | undefined = engine._data.get(sourceLayer.id);

  if (sourceProps && sourceProps.size > 0) {
    // Also duplicate the animatedProperties registration
    const animatedForSource = kfStore.animatedProperties.get(sourceLayer.id);
    if (animatedForSource && animatedForSource.size > 0) {
      const newSet = new Set<string>(animatedForSource);
      useKeyframeStore.setState(s => {
        const next = new Map(s.animatedProperties);
        next.set(newLayer.id, newSet);
        return { animatedProperties: next };
      });
    }

    // Copy every keyframe with a new id and new layerId
    for (const [propPath, arr] of sourceProps) {
      for (const k of arr) {
        kfStore.addKeyframe(newLayer.id, {
          ...k,
          id: genKfId(),
          layerId: newLayer.id,
          property: propPath,
        });
      }
    }
  }

  return newLayer;
}

/** Duplicate multiple selected layers */
export function duplicateLayers(compId: string, layers: Layer[]): Layer[] {
  return layers.map(l => duplicateLayer(compId, l));
}