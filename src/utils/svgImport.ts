/**
 * SVG import helper — loads an SVG file and creates one shape layer per path.
 */
import { parseSvg, type ParsedSvg } from './svgParser';
import { useCompositionStore } from '../state/compositionStore';
import { useSelectionStore } from '../state/selectionStore';
import { createDefaultLayer } from '../config/defaults';
import type { Layer } from '../types/layer';

let counter = 0;
function genId(): string {
  return `layer_${Date.now()}_${counter++}_${Math.random().toString(36).slice(2, 5)}`;
}

export async function importSvgFile(file: File, compId: string): Promise<number> {
  const text = await file.text();
  return importSvgString(text, compId, file.name.replace(/\.svg$/i, ''));
}

export function importSvgString(svgText: string, compId: string, groupName = 'SVG'): number {
  const parsed = parseSvg(svgText);
  if (parsed.layers.length === 0) return 0;

  const cs = useCompositionStore.getState();
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return 0;

  const addedIds: string[] = [];
  const zStart = comp.layers.length;

  // Fit SVG to comp: scale so SVG fits in 80% of comp
  const scale = Math.min(comp.width * 0.8 / parsed.width, comp.height * 0.8 / parsed.height);

  parsed.layers.forEach((desc, i) => {
    const base = createDefaultLayer('shape', `${groupName} · ${desc.name}`);
    const layer: Layer = {
      ...base,
      id: genId(),
      zIndex: zStart + i + 1,
      transform: {
        position: { x: desc.x * scale, y: desc.y * scale },
        scale: { x: scale * 100, y: scale * 100 },
        rotation: 0,
        anchorPoint: { x: 0, y: 0 },
      },
      data: desc.path,
    };
    cs.addLayer(compId, layer);
    addedIds.push(layer.id);
  });

  // Select all imported layers
  useSelectionStore.getState().replaceSelection(addedIds, compId);
  return addedIds.length;
}

export { parseSvg, type ParsedSvg };