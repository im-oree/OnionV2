import * as THREE from 'three';
import type { Layer, SolidData, ShapeData, TextData, ImageData, VideoData, CompData } from '../../types/layer';
import type { SceneManager } from '../SceneManager';
import type { BaseLayerRenderer } from './BaseLayerRenderer';
import { SolidLayerRenderer } from './SolidLayerRenderer';
import { ShapeLayerRenderer } from './ShapeLayerRenderer';
import { TextLayerRenderer } from './TextLayerRenderer';
import { ImageLayerRenderer } from './ImageLayerRenderer';
import { VideoLayerRenderer } from './VideoLayerRenderer';
import { CompLayerRenderer } from './CompLayerRenderer';

export class LayerFactory {
  private sceneManager: SceneManager;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  create(layer: Layer): BaseLayerRenderer {
    let renderer: BaseLayerRenderer;

    switch (layer.type) {
      case 'solid': {
        const data = layer.data as SolidData;
        renderer = new SolidLayerRenderer(layer.id, data);
        break;
      }
      case 'shape': {
        const data = layer.data as ShapeData;
        renderer = new ShapeLayerRenderer(layer.id, data);
        break;
      }
      case 'text': {
        const data = layer.data as TextData;
        renderer = new TextLayerRenderer(layer.id, data);
        break;
      }
      case 'image': {
        const data = layer.data as ImageData;
        renderer = new ImageLayerRenderer(layer.id, data.assetId, data.naturalWidth, data.naturalHeight);
        break;
      }
      case 'video': {
        const data = layer.data as VideoData;
        renderer = new VideoLayerRenderer(layer.id, data.assetId, data.naturalWidth, data.naturalHeight);
        break;
      }
      case 'comp': {
        const data = layer.data as CompData;
        // Placeholder texture — real texture is set by NestedCompRenderer in Renderer._processNestedComps
        void data;
        const placeholder = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
        placeholder.needsUpdate = true;
        renderer = new CompLayerRenderer(layer.id, 100, 100, placeholder);
        break;
      }
      default:
        renderer = new SolidLayerRenderer(layer.id, { color: '#000000', width: 100, height: 100 });
        renderer.setVisible(false);
        break;
    }

    renderer.updateTransform(layer.transform);
    renderer.updateOpacity(layer.opacity / 100);
    renderer.setVisible(layer.visible);
    renderer.group.position.z = -(layer.zIndex * 0.001) || 0;

    this.sceneManager.layerGroup.add(renderer.group);

    return renderer;
  }

  remove(renderer: BaseLayerRenderer): void {
    this.sceneManager.layerGroup.remove(renderer.group);
    renderer.dispose();
  }

  clearAll(): void {
    this.sceneManager.clearLayers();
  }
}