import type { Layer, LayerType, SolidData, ShapeData } from '../types/layer';
import type { Composition } from '../types/composition';
import { createDefaultLayer } from '../config/defaults';
import { capitalize } from './string';
import { defaultTextData } from '../types/layer';
import { defaultShapeFill, defaultShapeStroke } from '../types/layer';
import { defaultParamsFor, getPresetById } from '../shapes/presets';
import { defaultModel3DData } from '../types/model3d';

/** 3D shape preset IDs that use real Three.js geometries */
const SHAPES_3D = new Set(['sphere', 'cube', 'cylinder', 'cone', 'torus', 'plane3d']);

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
        // Check for 3D shape presets first — these use real Three.js geometries
        if (shapePresetId && SHAPES_3D.has(shapePresetId)) {
          const sizeMap: Record<string, {w: number, h: number}> = {
            sphere: { w: 200, h: 200 },
            cube: { w: 200, h: 200 },
            cylinder: { w: 200, h: 200 },
            cone: { w: 200, h: 200 },
            torus: { w: 200, h: 200 },
            plane3d: { w: 400, h: 400 },
          };
          const size = sizeMap[shapePresetId] ?? { w: 200, h: 200 };
          (layer as any).data = {
            type: 'rectangle',
            width: size.w,
            height: size.h,
            borderRadius: 0,
            fill: defaultShapeFill(),
            stroke: defaultShapeStroke(),
            presetId: shapePresetId,
            presetParams: {},
          } satisfies ShapeData;
          layer.name = `${shapePresetId.charAt(0).toUpperCase() + shapePresetId.slice(1)} ${count}`;
          // Force 3D mode
          layer.is3D = true;
          if (!layer.transform3D) {
            layer.transform3D = { position:{x:0,y:0,z:0}, scale:{x:100,y:100,z:100}, rotationX:0, rotationY:0, rotationZ:0, orientation:{x:0,y:0,z:0}, anchorPoint:{x:0,y:0,z:0}, opacity:100 };
          }
          break;
        }
        // Existing 2D shape logic
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
      case 'audio':
        (layer as any).data = { assetId:'', duration:10, volume:1, muted:false, playbackRate:1 };
        break;
      case 'adjustment':
        (layer as any).data = {};
        // Adjustment layers default to full-composition duration
        layer.endFrame = Math.max(layer.endFrame, Math.floor(comp.duration * comp.fps));
        break;
      case 'spline':
        (layer as any).data = {
          points: [
            { x: -50, y: 0, inHandle: { x: -20, y: -20 }, outHandle: { x: 20, y: 20 }, corner: false },
            { x: 50, y: 0, inHandle: { x: -20, y: 20 }, outHandle: { x: 20, y: -20 }, corner: false },
          ],
          closed: false,
          strokeColor: '#ffffff', strokeWidth: 3, strokeOpacity: 100,
          fillColor: '#ffffff', fillOpacity: 0,
          trimStart: 0, trimEnd: 1,
        };
        break;
      case 'chart':
        (layer as any).data = {
          type: 'pie',
          points: [
            { label: 'A', value: 30, color: '#4772b3' },
            { label: 'B', value: 50, color: '#e25b4a' },
            { label: 'C', value: 20, color: '#4ae28a' },
          ],
          progress: 1, spacing: 0, innerRadius: 0.5,
          showLabels: true, fontSize: 12, thickness: 2,
        };
        break;
      case 'model3d':
        (layer as any).data = defaultModel3DData();
        layer.is3D = true;
        if (!layer.transform3D) {
          layer.transform3D = { position:{x:0,y:0,z:0}, scale:{x:100,y:100,z:100}, rotationX:0, rotationY:0, rotationZ:0, orientation:{x:0,y:0,z:0}, anchorPoint:{x:0,y:0,z:0}, opacity:100 };
        }
        break;
      case 'transition':
        (layer as any).data = {
          transitionType: 'dissolve',
          progress: 0.5,
          feather: 0.3,
          angle: 0,
          centerX: 0.5,
          centerY: 0.5,
          customParams: {},
        };
        // Transition layers span a shorter duration by default
        layer.startFrame = 0;
        layer.endFrame = Math.min(30, Math.floor(comp.duration * comp.fps));
        break;
    }
  }
  return layer;
}