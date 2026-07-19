import type { Layer } from '../../types/layer';
import type { SceneManager } from '../SceneManager';
import { LayerFactory } from '../layers/LayerFactory';
import type { BaseLayerRenderer } from '../layers/BaseLayerRenderer';
import type { RuntimeOverrides } from '../../animation/PropertyBinder';

export class LayerSync {
  private factory: LayerFactory;
  private renderers = new Map<string, BaseLayerRenderer>();
  private prevLayers: Layer[] = [];
  private _runtimeOverridesActive = false;

  constructor(sceneManager: SceneManager) {
    this.factory = new LayerFactory(sceneManager);
  }

  /** Set whether runtime overrides are active (prevents sync from overwriting them) */
  setRuntimeOverridesActive(active: boolean): void {
    this._runtimeOverridesActive = active;
  }

  sync(layers: Layer[]): void {
    const prevMap = new Map<string, Layer>();
    for (const l of this.prevLayers) prevMap.set(l.id, l);

    const nextMap = new Map<string, Layer>();
    for (const l of layers) nextMap.set(l.id, l);

    for (const [id] of prevMap) {
      if (!nextMap.has(id)) {
        const renderer = this.renderers.get(id);
        if (renderer) {
          this.factory.remove(renderer);
          this.renderers.delete(id);
        }
      }
    }

    for (const layer of layers) {
      const prev = prevMap.get(layer.id);
      if (!prev) {
        const renderer = this.factory.create(layer);
        this.renderers.set(layer.id, renderer);
      } else {
        this._updateRenderer(layer.id, prev, layer);
      }
    }

    this._updateZOrder(layers);
    this.prevLayers = layers.map(l => ({ ...l, transform: { ...l.transform } }));
  }

  /**
   * Apply runtime animation overrides to all affected renderers.
   * This is called during playback to apply keyframed values without
   * modifying the composition store.
   */
  applyRuntimeOverrides(overrides: RuntimeOverrides): void {
    for (const [layerId, override] of overrides) {
      const renderer = this.renderers.get(layerId);
      if (!renderer) continue;

      // Build a synthetic transform by merging the original with overrides
      const layer = this.prevLayers.find(l => l.id === layerId);
      if (!layer) continue;

      const syntheticTransform: Layer['transform'] = {
        position: override.position ?? layer.transform.position,
        scale: override.scale ?? layer.transform.scale,
        rotation: override.rotation ?? layer.transform.rotation,
        anchorPoint: override.anchorPoint ?? layer.transform.anchorPoint,
      };

      renderer.updateTransform(syntheticTransform);
      if (override.opacity !== undefined) {
        renderer.updateOpacity(override.opacity / 100);
      }
    }
  }

  /**
   * Restore renderers to their original (non-overridden) state.
   * Called when playback stops or when we need to snap back to the store values.
   */
  restoreFromOverrides(): void {
    for (const layer of this.prevLayers) {
      const renderer = this.renderers.get(layer.id);
      if (!renderer) continue;
      renderer.updateTransform(layer.transform);
      renderer.updateOpacity(layer.opacity / 100);
    }
  }

  /** Hide/show layers based on whether currentFrame is within their startFrame–endFrame range */
  updateFrameVisibility(currentFrame: number): void {
    for (const [, layer] of this.prevLayers.entries()) {
      const renderer = this.renderers.get(layer.id);
      if (!renderer) continue;
      const inRange = currentFrame >= layer.startFrame && currentFrame <= layer.endFrame;
      const shouldBeVisible = layer.visible && inRange;
      renderer.setVisible(shouldBeVisible);
    }
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

  private _updateRenderer(layerId: string, prev: Layer, next: Layer): void {
    const renderer = this.renderers.get(layerId);
    if (!renderer) return;

    // Skip transform/opacity updates if runtime overrides are active
    // (they take priority during playback)
    if (!this._runtimeOverridesActive) {
      if (this._transformChanged(prev.transform, next.transform))
        renderer.updateTransform(next.transform);
      if (prev.opacity !== next.opacity)
        renderer.updateOpacity(next.opacity / 100);
    }
    if (prev.visible !== next.visible)
      renderer.setVisible(next.visible);

    if (prev.data === next.data) return;

    if (next.type === 'solid') {
      const sr = renderer as any;
      const nd = next.data as any;
      if (sr.setColor && nd?.color !== undefined) sr.setColor(nd.color);
      if (sr.setSize && (nd?.width !== undefined || nd?.height !== undefined))
        sr.setSize(nd.width ?? 100, nd.height ?? 100);
    }

    if (next.type === 'shape') {
      const sr = renderer as any;
      const nd = next.data as any;
      if (!nd) return;
      // Read fill from new ShapeFill structure
      const fill = nd.fill;
      if (sr.setFillColor) {
        if (fill?.color) sr.setFillColor(fill.color);
        else if (nd.fillColor !== undefined) sr.setFillColor(nd.fillColor);
      }
      if (sr.setFillOpacity && fill?.opacity !== undefined) {
        sr.setFillOpacity(fill.opacity / 100);
      }
      const w = 'width' in nd ? nd.width : ('radiusX' in nd ? nd.radiusX * 2 : (nd.radius ?? 50) * 2);
      const h = 'height' in nd ? nd.height : ('radiusY' in nd ? nd.radiusY * 2 : (nd.radius ?? 50) * 2);
      if (sr.setSize) sr.setSize(w, h);
    }

    if (next.type === 'text') {
      const tr = renderer as any;
      if (tr.setText && next.data) tr.setText(next.data);
    }

    if (next.type === 'comp') {
      // Comp layer size/texture managed by Renderer._processNestedComps
      // Nothing to sync here since data changes take effect via re-render
    }
  }

  private _transformChanged(a: Layer['transform'], b: Layer['transform']): boolean {
    return (
      a.position.x !== b.position.x || a.position.y !== b.position.y ||
      a.scale.x !== b.scale.x || a.scale.y !== b.scale.y ||
      a.rotation !== b.rotation ||
      a.anchorPoint.x !== b.anchorPoint.x || a.anchorPoint.y !== b.anchorPoint.y
    );
  }

  private _updateZOrder(layers: Layer[]): void {
    layers.forEach((layer, index) => {
      const renderer = this.renderers.get(layer.id);
      if (renderer) renderer.group.position.z = -(index * 0.001);
    });
  }
}