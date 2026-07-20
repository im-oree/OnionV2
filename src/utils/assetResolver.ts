/**
 * Shared asset resolver — tries assetManager first, falls back to projectStore.
 * Handles the case where assetManager loses state after HMR but projectStore retains it.
 */
import { assetManager } from '../storage/AssetManager';
import { useProjectStore } from '../state/projectStore';
import type { Asset } from '../storage/AssetManager';

export interface ResolvedAsset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  naturalWidth: number;
  naturalHeight: number;
  duration?: number;
  url?: string;
}

/**
 * Resolve an asset by ID, trying assetManager first, then projectStore.
 * Returns null if the asset is not found in either store.
 */
export function resolveAsset(assetId: string): ResolvedAsset | null {
  // 1. Try assetManager (full data)
  const fromManager = assetManager.getAsset(assetId);
  if (fromManager) {
    return {
      id: fromManager.id,
      name: fromManager.name,
      type: fromManager.type,
      naturalWidth: fromManager.naturalWidth,
      naturalHeight: fromManager.naturalHeight,
      duration: fromManager.duration,
      url: fromManager.url,
    };
  }

  // 2. Fall back to projectStore (partial data)
  const pa = useProjectStore.getState().project.assets.find((a) => a.id === assetId);
  if (!pa) return null;

  if (pa.type !== 'image' && pa.type !== 'video' && pa.type !== 'audio') return null;

  return {
    id: pa.id,
    name: pa.name,
    type: pa.type as 'image' | 'video' | 'audio',
    naturalWidth: pa.naturalWidth ?? 100,
    naturalHeight: pa.naturalHeight ?? 100,
    duration: pa.duration,
    url: pa.path,
  };
}

/**
 * Create layer data for image/video/audio from a resolved asset.
 */
export function createAssetLayerData(asset: ResolvedAsset) {
  if (asset.type === 'audio') {
    return {
      assetId: asset.id,
      duration: asset.duration ?? 10,
      volume: 1,
      muted: false,
      playbackRate: 1,
    };
  }
  if (asset.type === 'video') {
    return {
      assetId: asset.id,
      naturalWidth: asset.naturalWidth,
      naturalHeight: asset.naturalHeight,
      duration: asset.duration ?? 10,
      muted: false,
      volume: 1,
      playbackRate: 1,
    };
  }
  return {
    assetId: asset.id,
    naturalWidth: asset.naturalWidth,
    naturalHeight: asset.naturalHeight,
  };
}
