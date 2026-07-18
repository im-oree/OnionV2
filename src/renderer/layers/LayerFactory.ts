import type { Layer, SolidData, ShapeData, TextData, ImageData, VideoData } from '../../types/layer';
import type { SceneManager } from '../SceneManager';
import type { BaseLayerRenderer } from './BaseLayerRenderer';
import { SolidLayerRenderer } from './SolidLayerRenderer';
import { ShapeLayerRenderer } from './ShapeLayerRenderer';
import { TextLayerRenderer } from './TextLayerRenderer';
import { ImageLayerRenderer } from './ImageLayerRenderer';
import { VideoLayerRenderer } from './VideoLayerRenderer';

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
      default:
        renderer = new SolidLayerRenderer(layer.id, { color: '#000000', width: 100, height: 100 });
        renderer.setVisible(false);
        break;
    }

    // Apply initial state
    renderer.updateTransform(layer.transform);
    renderer.updateOpacity(layer.opacity / 100);
    renderer.setVisible(layer.visible);
    renderer.group.position.z = -(layer.zIndex * 0.001) || 0;

    // Add the group (which contains the mesh) to the scene's layer group
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
