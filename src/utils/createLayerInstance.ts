/**
 * createLayerInstance — shared factory for creating layer instances.
 * Used by menus, keyboard shortcuts, toolbar tools, and outliner.
 * Deduplicates the layer-creation logic that was copy-pasted everywhere.
 */
import type { Layer, LayerType, SolidData, ShapeData, TextData } from '../types/layer';
import type { Composition } from '../types/composition';
import { createDefaultLayer } from '../config/defaults';
import { capitalize } from './string';

function genId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createLayerInstance(type: LayerType, comp: Composition, overrides?: Partial<Layer>): Layer {
  const count = comp.layers.filter((l) => l.type === type).length + 1;
  const base = createDefaultLayer(type, `${capitalize(type)} ${count}`);
  const layer: Layer = {
    ...base,
    id: genId(),
    zIndex: comp.layers.length + 1,
    transform: { position: { x: 0, y: 0 }, scale: { x: 100, y: 100 }, rotation: 0, anchorPoint: { x: 0, y: 0 } },
    ...overrides,
  };

  if (!overrides?.data) {
    switch (type) {
      case 'solid':
        (layer as any).data = { color: '#4772b3', width: comp.width, height: comp.height } satisfies SolidData;
        break;
      case 'shape':
        (layer as any).data = { type: 'rectangle', width: 200, height: 150, borderRadius: 0 } satisfies ShapeData;
        break;
      case 'text':
        (layer as any).data = {
          text: 'Text', fontFamily: 'Inter', fontSize: 48, fontWeight: 400,
          color: '#ffffff', lineHeight: 1.2, letterSpacing: 0, alignment: 'center',
        } satisfies TextData;
        break;
      case 'image':
        (layer as any).data = { assetId: '', naturalWidth: 100, naturalHeight: 100 };
        break;
      case 'video':
        (layer as any).data = { assetId: '', naturalWidth: 100, naturalHeight: 100, duration: 10, muted: false, volume: 1, playbackRate: 1 };
        break;
      case 'adjustment':
        (layer as any).data = {};
        break;
    }
  }

  return layer;
}
