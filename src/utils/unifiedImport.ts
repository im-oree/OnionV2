/**
 * Unified file import system.
 *
 * ONE entry point for every kind of file the app supports:
 *   - Images (jpg, png, gif, webp, bmp, tiff, avif, ico)
 *   - Videos (mp4, webm, mov, avi, mkv, m4v, ogv)
 *   - Audio  (mp3, wav, ogg, aac, flac, m4a)
 *   - SVG    (vector shape layers)
 *   - 3D models (glb, gltf, obj, ply, stl, fbx, 3ds, dae)
 *
 * Also exposes a single "add asset to timeline" that always creates the
 * correct layer type — fixes the bug where dragging a 3D model back to
 * the timeline created an image layer.
 */
import { assetManager, type Asset } from '../storage/AssetManager';
import { useCompositionStore } from '../state/compositionStore';
import { useSelectionStore } from '../state/selectionStore';
import { useNotificationStore } from '../state/notificationStore';
import { createLayerInstance } from './createLayerInstance';
import type { Composition } from '../types/composition';
import type { Layer, LayerType } from '../types/layer';

// ── Extension classification ───────────────────────────────────

const EXT_IMAGE = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'ico', 'avif'];
const EXT_VIDEO = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'ogv', 'ts', 'mts'];
const EXT_AUDIO = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];
const EXT_SVG   = ['svg'];
const EXT_MODEL = ['glb', 'gltf', 'obj', 'ply', 'stl', 'fbx', '3ds', 'dae', 'usdz'];

/** Full extension list for file-picker `accept` attribute */
export const ALL_ACCEPT =
  '.' + [
    ...EXT_IMAGE, ...EXT_VIDEO, ...EXT_AUDIO, ...EXT_SVG, ...EXT_MODEL,
  ].join(',.') +
  ',image/*,video/*,audio/*';

export type FileKind = 'image' | 'video' | 'audio' | 'svg' | 'model3d' | 'unknown';

export function getFileKind(file: File): FileKind {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = file.type.toLowerCase();

  // SVG needs to be checked BEFORE image because SVG mime = image/svg+xml
  if (ext === 'svg' || mime === 'image/svg+xml') return 'svg';

  if (EXT_MODEL.includes(ext)) return 'model3d';
  if (EXT_VIDEO.includes(ext) || mime.startsWith('video/')) return 'video';
  if (EXT_AUDIO.includes(ext) || mime.startsWith('audio/')) return 'audio';
  if (EXT_IMAGE.includes(ext) || mime.startsWith('image/')) return 'image';

  return 'unknown';
}

// ── Import (file → asset) ──────────────────────────────────────

export interface ImportResult {
  kind: FileKind;
  asset?: Asset;        // for image/video/audio/model3d
  svgLayerCount?: number; // for svg — number of shape layers created
  error?: string;
}

/**
 * Import a single file. Routes by extension:
 *   - SVG → creates shape layers directly in the active comp
 *   - model3d → imports as asset AND preloads the model into cache
 *   - anything else → imports as asset (image/video/audio)
 *
 * Does NOT automatically add the asset to the timeline. Use
 * `addAssetToTimeline()` if you want that.
 */
export async function importFile(
  file: File,
  opts: { compIdForSvg?: string } = {},
): Promise<ImportResult> {
  const kind = getFileKind(file);

  try {
    switch (kind) {
      case 'svg': {
        // SVGs create shape layers directly (not assets).
        // Requires an active composition.
        const compId = opts.compIdForSvg
          ?? useCompositionStore.getState().activeCompositionId;
        if (!compId) {
          return { kind, error: 'Create a composition first before importing SVG.' };
        }
        const { importSvgFile } = await import('./svgImport');
        const count = await importSvgFile(file, compId);
        return { kind, svgLayerCount: count };
      }

      case 'model3d': {
        // Preload the model into the loader cache so drag-to-timeline is instant
        try {
          const { loadModelFile } = await import('../renderer/layers/Model3DLoader');
          await loadModelFile(file);
        } catch {
          // Non-fatal — the loader will retry on layer creation
        }
        const asset = await assetManager.importFile(file);
        return { kind, asset };
      }

      case 'image':
      case 'video':
      case 'audio': {
        const asset = await assetManager.importFile(file);
        return { kind, asset };
      }

      case 'unknown':
      default:
        return {
          kind: 'unknown',
          error: `Unsupported file type: "${file.name}"`,
        };
    }
  } catch (err) {
    return { kind, error: (err as Error)?.message ?? 'Import failed' };
  }
}

/**
 * Import multiple files. Emits ONE aggregate notification when done
 * (or per-file error notifications if some failed).
 */
export async function importFiles(
  files: File[],
  opts: { compIdForSvg?: string; addToTimeline?: boolean } = {},
): Promise<{ imported: number; failed: number; results: ImportResult[] }> {
  const notif = useNotificationStore.getState();
  const results: ImportResult[] = [];
  let imported = 0;
  let failed = 0;
  let svgLayerTotal = 0;

  for (const file of files) {
    const result = await importFile(file, opts);
    results.push(result);

    if (result.error) {
      failed++;
      notif.addNotification({
        type: 'error',
        message: `"${file.name}": ${result.error}`,
      });
    } else {
      imported++;
      if (result.kind === 'svg' && result.svgLayerCount) {
        svgLayerTotal += result.svgLayerCount;
      }
      // Optionally auto-add to timeline
      if (opts.addToTimeline && result.asset) {
        addAssetToTimeline(result.asset);
      }
    }
  }

  if (imported > 0) {
    let message = `Imported ${imported} file${imported > 1 ? 's' : ''}`;
    if (svgLayerTotal > 0) {
      message += ` (${svgLayerTotal} SVG shape${svgLayerTotal > 1 ? 's' : ''})`;
    }
    notif.addNotification({
      type: 'success',
      message,
      autoDismiss: 3000,
    });
  }

  return { imported, failed, results };
}

// ── File picker ────────────────────────────────────────────────

/**
 * Open the native file picker with the unified accept list.
 * Returns imported file results (or empty array if user cancelled).
 */
export function openImportFilePicker(
  opts: {
    multiple?: boolean;
    accept?: string;
    addToTimeline?: boolean;
  } = {},
): Promise<{ imported: number; failed: number; results: ImportResult[] }> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = opts.multiple ?? true;
    input.accept = opts.accept ?? ALL_ACCEPT;
    input.onchange = async () => {
      const files = input.files ? Array.from(input.files) : [];
      if (files.length === 0) {
        resolve({ imported: 0, failed: 0, results: [] });
        return;
      }
      const result = await importFiles(files, {
        addToTimeline: opts.addToTimeline,
      });
      resolve(result);
    };
    input.oncancel = () => resolve({ imported: 0, failed: 0, results: [] });
    input.click();
  });
}

/**
 * Open the native folder picker. Recursively imports all supported files.
 */
export function openImportFolderPicker(): Promise<
  { imported: number; failed: number; results: ImportResult[] }
> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    (input as any).webkitdirectory = true;
    input.multiple = true;
    input.onchange = async () => {
      const files = input.files ? Array.from(input.files) : [];
      // Filter to only supported types (skip .DS_Store, etc.)
      const supported = files.filter((f) => getFileKind(f) !== 'unknown');
      if (supported.length === 0) {
        resolve({ imported: 0, failed: 0, results: [] });
        return;
      }
      const result = await importFiles(supported);
      resolve(result);
    };
    input.oncancel = () => resolve({ imported: 0, failed: 0, results: [] });
    input.click();
  });
}

// ── Add asset to timeline (asset → layer) ──────────────────────

/**
 * Add an asset to the active composition as the correct layer type.
 * This fixes the bug where re-dragging a 3D model asset to the timeline
 * created an image layer.
 *
 * Returns the created layer, or null on failure.
 */
export function addAssetToTimeline(
  asset: Asset,
  opts: { compId?: string; position?: { x: number; y: number } } = {},
): Layer | null {
  const cs = useCompositionStore.getState();
  const compId = opts.compId ?? cs.activeCompositionId;
  if (!compId) {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      message: 'Select a composition first.',
      autoDismiss: 3000,
    });
    return null;
  }
  const comp = cs.compositions.find((c) => c.id === compId);
  if (!comp) return null;

  const layerType = assetToLayerType(asset);
  const layer = buildLayerFromAsset(asset, comp, layerType, opts.position);
  if (!layer) return null;

  cs.addLayer(compId, layer);
  useSelectionStore.getState().select({
    type: 'layer',
    id: layer.id,
    compositionId: compId,
  });

  try {
    (window as any).__renderer?.renderLoop?.requestRender?.();
  } catch { /* ok */ }

  return layer;
}

/**
 * Map an Asset type to the layer type that should be created for it.
 * This is the single place that decides "what kind of layer does this asset become".
 */
function assetToLayerType(asset: Asset): LayerType {
  switch (asset.type) {
    case 'model3d': return 'model3d';
    case 'video':   return 'video';
    case 'audio':   return 'audio';
    case 'image':   return 'image';
    default:        return 'image';
  }
}

/**
 * Build a fully-formed Layer for the given asset. Populates the correct
 * `data` payload per layer type so nothing renders as a broken placeholder.
 */
function buildLayerFromAsset(
  asset: Asset,
  comp: Composition,
  layerType: LayerType,
  position?: { x: number; y: number },
): Layer | null {
  // Common transform overrides
  const transformOverride = position
    ? {
        transform: {
          position: { x: position.x, y: position.y },
          scale: { x: 100, y: 100 },
          rotation: 0,
          anchorPoint: { x: 0, y: 0 },
        },
      }
    : {};

  switch (layerType) {
    case 'model3d': {
      const ext = asset.name.split('.').pop()?.toLowerCase() ?? 'glb';
      const format =
        (ext === 'gltf' || ext === 'glb') ? (ext as 'gltf' | 'glb')
        : (ext === 'obj') ? 'obj' as const
        : (ext === 'ply') ? 'ply' as const
        : (ext === 'stl') ? 'stl' as const
        : 'gltf' as const;
      const count = comp.layers.filter((l) => l.type === 'model3d').length + 1;

      return createLayerInstance('model3d', comp, {
        name: `${asset.name.replace(/\.[^.]+$/, '')} ${count}`,
        is3D: true,
        transform3D: {
          position: { x: 0, y: 0, z: 0 },
          scale: { x: 100, y: 100, z: 100 },
          rotationX: 0, rotationY: 0, rotationZ: 0,
          orientation: { x: 0, y: 0, z: 0 },
          anchorPoint: { x: 0, y: 0, z: 0 },
          opacity: 100,
        },
        data: {
          assetId: asset.id,
          url: asset.url,
          fileName: asset.name,
          mimeType: asset.mimeType || 'model/gltf-binary',
          format,
          scale: 1,
          autoRotate: false,
          autoRotateSpeed: 1,
        },
        ...transformOverride,
      } as any);
    }

    case 'video': {
      return createLayerInstance('video', comp, {
        name: asset.name,
        data: {
          assetId: asset.id,
          naturalWidth: asset.naturalWidth ?? 100,
          naturalHeight: asset.naturalHeight ?? 100,
          duration: asset.duration ?? 10,
          muted: false,
          volume: 0.5,
          playbackRate: 1,
        },
        ...transformOverride,
      });
    }

    case 'audio': {
      return createLayerInstance('audio', comp, {
        name: asset.name,
        data: {
          assetId: asset.id,
          duration: asset.duration ?? 10,
          volume: 0.5,
          muted: false,
          playbackRate: 1,
        },
        ...transformOverride,
      });
    }

    case 'image':
    default: {
      return createLayerInstance('image', comp, {
        name: asset.name,
        data: {
          assetId: asset.id,
          naturalWidth: asset.naturalWidth ?? 100,
          naturalHeight: asset.naturalHeight ?? 100,
        },
        ...transformOverride,
      });
    }
  }
}

// ── Drag-and-drop helper ───────────────────────────────────────

/**
 * Handle a drop event containing OS files.
 * - SVGs → shape layers in active comp
 * - other files → imported as assets, optionally added to timeline
 *
 * Returns imported count.
 */
export async function handleFileDrop(
  e: React.DragEvent | DragEvent,
  opts: { addToTimeline?: boolean } = {},
): Promise<number> {
  const files = Array.from(e.dataTransfer?.files ?? []);
  if (files.length === 0) return 0;
  const result = await importFiles(files, {
    addToTimeline: opts.addToTimeline,
  });
  return result.imported;
}

/**
 * Look up an asset by ID and add it to the timeline.
 * Handles the case where the asset was found via projectStore but not
 * yet loaded in assetManager (rehydration edge case).
 */
export function addAssetIdToTimeline(
  assetId: string,
  opts: { compId?: string; position?: { x: number; y: number } } = {},
): Layer | null {
  const asset = assetManager.getAsset(assetId);
  if (asset) {
    return addAssetToTimeline(asset, opts);
  }

  // Fallback: try project store
  try {
    const { useProjectStore } = require('../state/projectStore');
    const pa = useProjectStore.getState().project.assets.find(
      (a: any) => a.id === assetId,
    );
    if (pa) {
      const asset: Asset = {
        id: pa.id,
        name: pa.name,
        type: pa.type as Asset['type'],
        url: pa.path,
        size: pa.size,
        mimeType: pa.mimeType,
        importedAt: pa.importedAt,
        missing: false,
        naturalWidth: pa.naturalWidth ?? 100,
        naturalHeight: pa.naturalHeight ?? 100,
        duration: pa.duration,
      } as Asset;
      return addAssetToTimeline(asset, opts);
    }
  } catch { /* ok */ }

  useNotificationStore.getState().addNotification({
    type: 'warning',
    message: 'Asset not found — try re-importing.',
    autoDismiss: 3000,
  });
  return null;
}