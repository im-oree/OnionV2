/**
 * AssetManager — manages imported assets with persistence, reference counting,
 * thumbnail generation, and missing asset detection.
 */
import { EventEmitter } from '../renderer/utils/EventEmitter';
import { StorageManager } from './StorageManager';
import { useNotificationStore } from '../state/notificationStore';
import type { AssetRef } from './StorageAdapter';

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url: string; // blob URL
  thumbnail?: string; // data URL thumbnail
  naturalWidth: number;
  naturalHeight: number;
  duration?: number;
  size: number;
  mimeType: string;
  importedAt: number;
  storageRef?: AssetRef; // persistent storage reference
  missing: boolean; // true if file not found on disk
}

type AssetEvents = {
  'asset:added': Asset;
  'asset:removed': Asset;
  'asset:missing': Asset;
  'assets:changed': void;
};

let assetCounter = 0;
function genAssetId(): string {
  return `asset_${Date.now()}_${assetCounter++}`;
}

class AssetManagerClass {
  private assets = new Map<string, Asset>();
  private referenceCount = new Map<string, number>(); // assetId -> count of layers using it
  public readonly events = new EventEmitter<AssetEvents>();

  /** Import a File (image or video) and create an Asset */
  async importFile(file: File): Promise<Asset> {
    // Deduplication: skip if a file with the same name and size already exists
    for (const existing of this.assets.values()) {
      if (existing.name === file.name && existing.size === file.size && !existing.missing) {
        useNotificationStore.getState().addNotification({
          type: 'info',
          message: `"${file.name}" is already in the project — skipped.`,
          autoDismiss: 3000,
        });
        return existing;
      }
    }

    const url = URL.createObjectURL(file);
    const id = genAssetId();

    // Get natural dimensions and generate thumbnail
    const dimensions = await this.getMediaDimensions(file, url);
    const thumbnail = await this.generateThumbnail(file, url);

    const asset: Asset = {
      id,
      name: file.name,
      type: this.getAssetType(file),
      url,
      thumbnail,
      naturalWidth: dimensions.width,
      naturalHeight: dimensions.height,
      duration: dimensions.duration,
      size: file.size,
      mimeType: file.type,
      importedAt: Date.now(),
      missing: false,
    };

    // Persist to storage if we have a project handle
    try {
      const sm = StorageManager.getInstance();
      const ref = await sm.importAsset(file, file.name);
      if (ref) {
        asset.storageRef = ref;
      }
    } catch {
      // Best effort — asset still works in memory
    }

    this.assets.set(id, asset);
    this.events.emit('asset:added', asset);
    this.events.emit('assets:changed', undefined);
    return asset;
  }

  /** Add an asset from persistent storage reference */
  async addFromStorageRef(ref: AssetRef): Promise<Asset> {
    // Check if already loaded (by original ID first, then by storageRef ID)
    const checkId = ref.originalId || ref.id;
    for (const existing of this.assets.values()) {
      if (existing.id === checkId) return existing;
      if (existing.storageRef?.id === ref.id) return existing;
    }

    // Use the original in-memory ID so layer data.assetId references stay valid
    const id = ref.originalId || ref.id || genAssetId();
    const asset: Asset = {
      id,
      name: ref.filename,
      type: this.getTypeFromMime(ref.mimeType),
      url: '', // will be set after loading
      naturalWidth: 100,
      naturalHeight: 100,
      size: ref.size,
      mimeType: ref.mimeType,
      importedAt: Date.now(),
      storageRef: ref,
      missing: false,
    };

    // Try to load blob from storage
    try {
      const sm = StorageManager.getInstance();
      const blob = await sm.loadAsset(ref);
      if (blob) {
        asset.url = URL.createObjectURL(blob);
        const dimensions = await this.getMediaDimensionsFromBlob(blob, asset.url);
        asset.naturalWidth = dimensions.width;
        asset.naturalHeight = dimensions.height;
        if (dimensions.duration) asset.duration = dimensions.duration;
        asset.thumbnail = await this.generateThumbnailFromBlob(blob, asset.url);
      } else {
        asset.missing = true;
        this.events.emit('asset:missing', asset);
      }
    } catch {
      asset.missing = true;
      this.events.emit('asset:missing', asset);
    }

    this.assets.set(id, asset);
    return asset;
  }

  /** Delete an asset and revoke its blob URL */
  deleteAsset(id: string): void {
    const asset = this.assets.get(id);
    if (!asset) return;
    if (asset.url) URL.revokeObjectURL(asset.url);
    this.assets.delete(id);
    this.referenceCount.delete(id);
    this.events.emit('asset:removed', asset);
    this.events.emit('assets:changed', undefined);
  }

  /** Get asset by ID */
  getAsset(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  /** Get all assets */
  getAllAssets(): Asset[] {
    return Array.from(this.assets.values());
  }

  /** Get all missing assets */
  getMissingAssets(): Asset[] {
    return this.getAllAssets().filter((a) => a.missing);
  }

  /** Get assets filtered by type */
  getAssetsByType(type: Asset['type']): Asset[] {
    return this.getAllAssets().filter((a) => a.type === type);
  }

  /** Get usage count for an asset */
  getReferenceCount(assetId: string): number {
    return this.referenceCount.get(assetId) ?? 0;
  }

  /** Increment reference count (called when a layer uses this asset) */
  addReference(assetId: string): void {
    this.referenceCount.set(assetId, (this.referenceCount.get(assetId) ?? 0) + 1);
  }

  /** Decrement reference count (called when a layer stops using this asset) */
  removeReference(assetId: string): void {
    const count = this.referenceCount.get(assetId) ?? 0;
    if (count > 0) this.referenceCount.set(assetId, count - 1);
  }

  /** Find orphan assets (no layers reference them) */
  getOrphanAssets(): Asset[] {
    return this.getAllAssets().filter((a) => (this.referenceCount.get(a.id) ?? 0) === 0);
  }

  /** Remove all orphan assets, syncing with projectStore */
  cleanOrphans(): number {
    const orphans = this.getOrphanAssets();
    for (const orphan of orphans) {
      this.deleteAsset(orphan.id);
      this.syncDeleteWithProjectStore(orphan.id);
    }
    return orphans.length;
  }

  /** Sync a single asset deletion with projectStore */
  syncDeleteWithProjectStore(assetId: string): void {
    try {
      // Lazy import to avoid circular dependency
      import('../state/projectStore').then(({ useProjectStore }) => {
        useProjectStore.getState().removeAsset(assetId);
      }).catch(() => {});
    } catch {
      // Best effort
    }
  }

  /** Relink a missing asset with a new file */
  async relinkAsset(assetId: string, file: File): Promise<boolean> {
    const asset = this.assets.get(assetId);
    if (!asset) return false;

    // Revoke old URL
    if (asset.url) URL.revokeObjectURL(asset.url);

    // Import new file
    const url = URL.createObjectURL(file);
    const dimensions = await this.getMediaDimensions(file, url);
    const thumbnail = await this.generateThumbnail(file, url);

    asset.url = url;
    asset.name = file.name;
    asset.thumbnail = thumbnail;
    asset.naturalWidth = dimensions.width;
    asset.naturalHeight = dimensions.height;
    asset.size = file.size;
    asset.mimeType = file.type;
    asset.missing = false;

    // Persist to storage
    try {
      const sm = StorageManager.getInstance();
      const ref = await sm.importAsset(file, file.name);
      if (ref) asset.storageRef = ref;
    } catch {
      // Best effort
    }

    this.events.emit('assets:changed', undefined);
    return true;
  }

  /** Open a file picker and import selected files */
  async importFromFilePicker(accept = 'image/*,video/*,audio/*'): Promise<Asset[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = true;
      input.onchange = async () => {
        const files = input.files ? Array.from(input.files) : [];
        const assets: Asset[] = [];
        for (const f of files) {
          try {
            const asset = await this.importFile(f);
            assets.push(asset);
          } catch {
            // Skip failed imports
          }
        }
        resolve(assets);
      };
      input.click();
    });
  }

  /** Scan layers for asset references and update reference counts */
  updateReferenceCounts(layers: any[]): void {
    // Reset all counts
    this.referenceCount.clear();
    for (const layer of layers) {
      const data = layer.data;
      if (data?.assetId && this.assets.has(data.assetId)) {
        this.addReference(data.assetId);
      }
    }
  }

  /** Generate a small thumbnail (256px max) for an asset */
  private async generateThumbnail(file: File, url: string): Promise<string | undefined> {
    const assetType = this.getAssetType(file);
    return new Promise((resolve) => {
      if (assetType === 'video') {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.onloadeddata = () => {
          video.currentTime = Math.min(0.5, video.duration * 0.1);
        };
        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 256;
            const vw = video.videoWidth || 100;
            const vh = video.videoHeight || 100;
            const scale = Math.min(maxDim / vw, maxDim / vh);
            canvas.width = Math.round(vw * scale);
            canvas.height = Math.round(vh * scale);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/jpeg', 0.7));
            } else {
              resolve(undefined);
            }
          } catch {
            resolve(undefined);
          }
          video.src = '';
        };
        video.onerror = () => resolve(undefined);
        video.src = url;
      } else if (assetType === 'image') {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 256;
            const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight);
            canvas.width = Math.round(img.naturalWidth * scale);
            canvas.height = Math.round(img.naturalHeight * scale);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/jpeg', 0.7));
            } else {
              resolve(undefined);
            }
          } catch {
            resolve(undefined);
          }
        };
        img.onerror = () => resolve(undefined);
        img.src = url;
      } else {
        resolve(undefined);
      }
    });
  }

  private async generateThumbnailFromBlob(blob: Blob, url: string): Promise<string | undefined> {
    const file = new File([blob], 'thumb', { type: blob.type });
    return this.generateThumbnail(file, url);
  }

  private getAssetType(file: File): Asset['type'] {
    // Check MIME type first
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('image/')) return 'image';
    // Fallback: detect by file extension when MIME type is empty or generic
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'ogv', 'ts', 'mts'];
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'svg', 'ico', 'avif'];
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    return 'image';
  }

  private getTypeFromMime(mime: string): Asset['type'] {
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('image/')) return 'image';
    return 'image'; // Default for unknown MIME types from storage
  }

  /** Get natural dimensions of a media file */
  private getMediaDimensions(
    file: File,
    url: string,
  ): Promise<{ width: number; height: number; duration?: number }> {
    return this.getMediaDimensionsFromBlob(file, url);
  }

  private getMediaDimensionsFromBlob(
    blob: Blob,
    url: string,
  ): Promise<{ width: number; height: number; duration?: number }> {
    // Detect type from MIME or extension fallback
    const isVideo = blob.type.startsWith('video/') || ['mp4','webm','mov','avi','mkv','m4v','ogv'].some(ext => url.toLowerCase().includes('.' + ext));
    const isImage = blob.type.startsWith('image/') || ['jpg','jpeg','png','gif','webp','bmp','svg'].some(ext => url.toLowerCase().includes('.' + ext));
    const isAudio = blob.type.startsWith('audio/') || ['mp3','wav','ogg','aac','flac','m4a','wma'].some(ext => url.toLowerCase().includes('.' + ext));
    return new Promise((resolve, reject) => {
      if (isVideo) {
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
      } else if (isImage) {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      } else if (isAudio) {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
          resolve({ width: 0, height: 0, duration: audio.duration });
          audio.src = '';
        };
        audio.onerror = () => resolve({ width: 0, height: 0 });
        audio.src = url;
      } else {
        resolve({ width: 0, height: 0 });
      }
    });
  }

  /** Dispose all assets */
  dispose(): void {
    for (const asset of this.assets.values()) {
      if (asset.url) URL.revokeObjectURL(asset.url);
    }
    this.assets.clear();
    this.referenceCount.clear();
  }
}

export const assetManager = new AssetManagerClass();
