import type { Layer, LayerType, SolidData, ShapeData, TextData } from '../types/layer';
import type { Composition } from '../types/composition';
import { createDefaultLayer } from '../config/defaults';
import { capitalize } from './string';
import { defaultTextData } from '../types/layer';
import { defaultShapeFill, defaultShapeStroke } from '../types/layer';
import { defaultParamsFor, getPresetById } from '../shapes/presets';

function genId(): string { return `layer_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

export function createLayerInstance(
  type: LayerType,
  comp: Composition,
  overrides?: Partial<Layer>,
  shapePresetId?: string,
): Layer {
  const count = comp.layers.filter(l=>l.type===type).length+1;
  const base = createDefaultLayer(type, `${capitalize(type)} ${count}`);
  const layer: Layer = {
    ...base, id: genId(),
    zIndex: comp.layers.length+1,
    transform: { position:{x:0,y:0}, scale:{x:100,y:100}, rotation:0, anchorPoint:{x:0,y:0} },
    ...overrides,
  };

  if (!overrides?.data) {
    switch(type){
      case 'solid':
        (layer as any).data = { color:'#4772b3', width:comp.width, height:comp.height } satisfies SolidData;
        break;
      case 'shape': {
        const preset = shapePresetId ? getPresetById(shapePresetId) : null;
        if (preset) {
          const params = defaultParamsFor(preset);
          const w = preset.defaultSize.width;
          const h = preset.defaultSize.height;
          (layer as any).data = {
            type: 'rectangle', width: w, height: h, borderRadius: params.roundness??0,
            fill: defaultShapeFill(), stroke: defaultShapeStroke(),
            presetId: preset.id, presetParams: params,
          } satisfies ShapeData;
          layer.name = `${preset.label} ${count}`;
        } else {
          (layer as any).data = {
            type: 'rectangle', width: 200, height: 150, borderRadius: 0,
            fill: defaultShapeFill(), stroke: defaultShapeStroke(),
          } satisfies ShapeData;
        }
        break;
      }
      case 'text':
        (layer as any).data = defaultTextData();
        break;
      case 'image':
        (layer as any).data = { assetId:'', naturalWidth:100, naturalHeight:100 };
        break;
      case 'video':
        (layer as any).data = { assetId:'', naturalWidth:100, naturalHeight:100, duration:10, muted:false, volume:1, playbackRate:1 };
        break;
      case 'adjustment':
        (layer as any).data = {};
        break;
    }
  }
  return layer;
}