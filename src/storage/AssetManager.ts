/**
 * AssetManager — manages imported assets (images, videos).
 * Phase 3: In-memory only with blob URLs. Full persistence in Phase 8.
 */
import { EventEmitter } from '../renderer/utils/EventEmitter';

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string; // blob URL or original
  naturalWidth: number;
  naturalHeight: number;
  duration?: number;
  size: number;
  mimeType: string;
}

type AssetEvents = {
  'asset:added': Asset;
  'asset:removed': Asset;
};

let assetCounter = 0;
function genAssetId(): string {
  return `asset_${Date.now()}_${assetCounter++}`;
}

class AssetManagerClass {
  private assets = new Map<string, Asset>();
  public readonly events = new EventEmitter<AssetEvents>();

  /** Import a File (image or video) and create an Asset */
  async importFile(file: File): Promise<Asset> {
    const url = URL.createObjectURL(file);
    const id = genAssetId();

    // Get natural dimensions
    const dimensions = await this.getMediaDimensions(file, url);
    const asset: Asset = {
      id,
      name: file.name,
      type: file.type.startsWith('video/') ? 'video' : 'image',
      url,
      naturalWidth: dimensions.width,
      naturalHeight: dimensions.height,
      duration: dimensions.duration,
      size: file.size,
      mimeType: file.type,
    };

    this.assets.set(id, asset);
    this.events.emit('asset:added', asset);
    return asset;
  }

  /** Delete an asset and revoke its blob URL */
  deleteAsset(id: string): void {
    const asset = this.assets.get(id);
    if (!asset) return;
    URL.revokeObjectURL(asset.url);
    this.assets.delete(id);
    this.events.emit('asset:removed', asset);
  }

  /** Get asset by ID */
  getAsset(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  /** Get all assets */
  getAllAssets(): Asset[] {
    return Array.from(this.assets.values());
  }

  /** Open a file picker and import selected files */
  async importFromFilePicker(accept = 'image/*,video/*'): Promise<Asset[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = true;
      input.onchange = async () => {
        const files = input.files ? Array.from(input.files) : [];
        const assets = await Promise.all(files.map((f) => this.importFile(f)));
        resolve(assets);
      };
      input.click();
    });
  }

  /** Get natural dimensions of a media file */
  private getMediaDimensions(
    file: File,
    url: string,
  ): Promise<{ width: number; height: number; duration?: number }> {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration,
          });
          video.src = '';
        };
        video.onerror = () => reject(new Error('Failed to load video'));
        video.src = url;
      } else {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      }
    });
  }

  /** Dispose all assets */
  dispose(): void {
    for (const asset of this.assets.values()) {
      URL.revokeObjectURL(asset.url);
    }
    this.assets.clear();
  }
}

export const assetManager = new AssetManagerClass();
