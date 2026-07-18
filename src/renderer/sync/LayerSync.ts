import type { Layer } from '../../types/layer';
import type { SceneManager } from '../SceneManager';
import { LayerFactory } from '../layers/LayerFactory';
import type { BaseLayerRenderer } from '../layers/BaseLayerRenderer';

export class LayerSync {
  private factory: LayerFactory;
  private renderers = new Map<string, BaseLayerRenderer>();
  private prevLayers: Layer[] = [];

  constructor(sceneManager: SceneManager) {
    this.factory = new LayerFactory(sceneManager);
  }

  sync(layers: Layer[]): void {
    const prevMap = new Map<string, Layer>();
    for (const l of this.prevLayers) prevMap.set(l.id, l);

    const nextMap = new Map<string, Layer>();
    for (const l of layers) nextMap.set(l.id, l);

    // Removed
    for (const [id] of prevMap) {
      if (!nextMap.has(id)) {
        const renderer = this.renderers.get(id);
        if (renderer) {
          this.factory.remove(renderer);
          this.renderers.delete(id);
        }
      }
    }

    // Added/updated
    for (const layer of layers) {
      const prev = prevMap.get(layer.id);
      if (!prev) {
        const renderer = this.factory.create(layer);
        this.renderers.set(layer.id, renderer);
      } else {
        this.updateRenderer(layer.id, prev, layer);
      }
    }

    this.updateZOrder(layers);
    this.prevLayers = [...layers];
  }

  clear(): void {
    for (const renderer of this.renderers.values()) renderer.dispose();
    this.renderers.clear();
    this.prevLayers = [];
    this.factory.clearAll();
  }

  getRenderer(layerId: string): BaseLayerRenderer | undefined {
    return this.renderers.get(layerId);
  }

  getAllRenderers(): Map<string, BaseLayerRenderer> {
    return this.renderers;
  }

  private updateRenderer(layerId: string, prev: Layer, next: Layer): void {
    const renderer = this.renderers.get(layerId);
    if (!renderer) return;

    if (this.transformChanged(prev.transform, next.transform)) renderer.updateTransform(next.transform);
    if (prev.opacity !== next.opacity) renderer.updateOpacity(next.opacity / 100);
    if (prev.visible !== next.visible) renderer.setVisible(next.visible);

    const dataChanged = prev.data !== next.data;
    if (!dataChanged) return;

    if (next.type === 'solid') {
      const sr = renderer as any;
      const nd = next.data as any;
      if (sr.setColor && nd.color !== undefined) sr.setColor(nd.color);
      if (sr.setSize && (nd.width !== undefined || nd.height !== undefined)) {
        sr.setSize(nd.width, nd.height);
      }
    }
    if (next.type === 'shape') {
      const sr = renderer as any;
      const nd = next.data as any;
      if (sr.setFillColor && nd.fillColor !== undefined) sr.setFillColor(nd.fillColor);
      // For dimension changes on shapes, we need to recreate geometry
      if (sr.setSize) {
        const w = 'width' in nd ? nd.width : ('radiusX' in nd ? nd.radiusX * 2 : nd.radius * 2);
        const h = 'height' in nd ? nd.height : ('radiusY' in nd ? nd.radiusY * 2 : nd.radius * 2);
        sr.setSize(w, h);
      }
    }
    if (next.type === 'text') {
      const tr = renderer as any;
      if (tr.setText && next.data) tr.setText(next.data);
    }
  }

  private transformChanged(a: Layer['transform'], b: Layer['transform']): boolean {
    return a.position.x !== b.position.x || a.position.y !== b.position.y ||
      a.scale.x !== b.scale.x || a.scale.y !== b.scale.y ||
      a.rotation !== b.rotation ||
      a.anchorPoint.x !== b.anchorPoint.x || a.anchorPoint.y !== b.anchorPoint.y;
  }

  private updateZOrder(layers: Layer[]): void {
    layers.forEach((layer, index) => {
      const renderer = this.renderers.get(layer.id);
      if (renderer) renderer.group.position.z = -(index * 0.001) || 0;
    });
  }
}
