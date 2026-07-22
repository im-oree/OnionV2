/**
 * ProjectSerializer — converts in-memory state <-> SerializedProject JSON.
 * Handles schema versioning and migrations.
 */
import type { SerializedProject } from './StorageAdapter';
import { useCompositionStore } from '../state/compositionStore';
import { useKeyframeStore } from '../state/keyframeStore';
import { useEffectsStore } from '../state/effectsStore';
import { useMaskStore } from '../state/maskStore';
import { useViewportStore } from '../state/viewportStore';
import { useTimelineStore } from '../state/timelineStore';
import { useProjectStore } from '../state/projectStore';

import { runMigrations, validateProjectData, CURRENT_VERSION } from './migrations';
import { assetManager } from './AssetManager';
import { triggerRequestRender } from '../state/uiStore';

const APP_VERSION = '0.1.0';

export class ProjectSerializer {
  /** Capture all in-memory state into a serializable project */
  static serialize(name: string): SerializedProject {
    const compStore = useCompositionStore.getState();
    const kfStore = useKeyframeStore.getState();
    const fxStore = useEffectsStore.getState();
    const maskStore = useMaskStore.getState();
    const vpStore = useViewportStore.getState();
    const tlStore = useTimelineStore.getState();

    const now = new Date().toISOString();
    const compositions = compStore.compositions.map((c) => ({
      ...c,
      layers: undefined, // layers serialized separately
    }));

    // Layers grouped by composition
    const layers: Record<string, any[]> = {};
    for (const comp of compStore.compositions) {
      layers[comp.id] = comp.layers.map((l: any) => ({
        ...l,
        // Don't serialize runtime state
      }));
    }

    // Keyframes grouped by layerId -> propertyPath
    const keyframes: Record<string, Record<string, any[]>> = {};
    try {
      const engine = kfStore.engine;
      for (const layerId of compStore.compositions.flatMap((c: any) => c.layers ?? []).map((l: any) => l.id)) {
        const props = engine.getAllAnimatedProperties(layerId);
        if (props.length === 0) continue;
        const layerKeyframes: Record<string, any[]> = {};
        for (const path of props) {
          const kfs = engine.getKeyframesForProperty(layerId, path);
          if (kfs.length > 0) {
            layerKeyframes[path] = kfs.map((k) => ({ ...k }));
          }
        }
        if (Object.keys(layerKeyframes).length > 0) {
          keyframes[layerId] = layerKeyframes;
        }
      }
    } catch {
      // Engine serialization failed — skip keyframes
    }

    // Effects grouped by layer
    const effects: Record<string, any[]> = {};
    const fxData = fxStore.effectsByLayer;
    for (const [layerId, fxs] of Object.entries(fxData)) {
      effects[layerId] = fxs.map((fx: any) => ({ ...fx }));
    }

    // Masks grouped by layer
    const masks: Record<string, any[]> = {};
    const maskData = maskStore.masksByLayer;
    for (const [layerId, ms] of Object.entries(maskData)) {
      masks[layerId] = ms.map((m: any) => ({ ...m }));
    }

    return {
      version: CURRENT_VERSION,
      appVersion: APP_VERSION,
      created: now,
      modified: now,
      name,
      compositions,
      activeCompositionId: compStore.activeCompositionId,
      layers,
      keyframes,
      effects,
      masks,
      assets: this._collectAssetRefs(),
      folders: (useProjectStore.getState().project.folders ?? []).map(f => ({ ...f })),
      ui: {
        workspaceLayout: (window as any).__workspaceLayout ?? null,
        viewportState: {
          zoom: vpStore.settings.zoom,
          panX: vpStore.settings.panX,
          panY: vpStore.settings.panY,
        },
        timelineState: {
          zoom: tlStore.zoom,
          scrollX: tlStore.scrollX,
        },
      },
      preferences: {},
    };
  }

  /** Deserialize and populate all stores */
  static deserialize(data: SerializedProject): void {
    const migrated = ProjectSerializer.runMigrations(data);
    const compStore = useCompositionStore.getState();
    const kfStore = useKeyframeStore.getState();
    const vpStore = useViewportStore.getState();
    const tlStore = useTimelineStore.getState();

    // Set compositions with layers
    if (migrated.compositions) {
      for (const comp of migrated.compositions) {
        const layerList = migrated.layers?.[comp.id] ?? [];
        compStore.addComposition({
          ...comp,
          layers: layerList,
          id: comp.id,
          name: comp.name,
          width: (comp as any).width ?? 1920,
          height: (comp as any).height ?? 1080,
          fps: (comp as any).fps ?? 30,
          duration: (comp as any).duration ?? 10,
          backgroundColor: (comp as any).backgroundColor ?? '#000000',
          currentTime: 0,
        } as any);
      }
    }

    // Restore active composition
    if (migrated.activeCompositionId) {
      compStore.setActiveComposition(migrated.activeCompositionId);
    }

    // Restore keyframes
    if (migrated.keyframes) {
      for (const [layerId, props] of Object.entries(migrated.keyframes)) {
        for (const [, kfs] of Object.entries(props)) {
          for (const kf of kfs) {
            kfStore.addKeyframe(layerId, kf);
          }
        }
      }
    }

    // Restore effects — directly set state to preserve exact IDs and params
    if (migrated.effects) {
      for (const [layerId, fxs] of Object.entries(migrated.effects)) {
        const current = useEffectsStore.getState().effectsByLayer;
        const existing = current[layerId] ?? [];
        useEffectsStore.setState({
          effectsByLayer: { ...current, [layerId]: [...existing, ...fxs] },
        });
      }
    }

    // Restore masks — directly set state to preserve exact IDs
    if (migrated.masks) {
      for (const [layerId, ms] of Object.entries(migrated.masks)) {
        const current = useMaskStore.getState().masksByLayer;
        const existing = current[layerId] ?? [];
        useMaskStore.setState({
          masksByLayer: { ...current, [layerId]: [...existing, ...ms] },
        });
      }
    }

    // Restore folders
    if ((migrated as any).folders) {
      const proj = useProjectStore.getState().project;
      useProjectStore.setState({
        project: {
          ...proj,
          folders: (migrated as any).folders,
        },
        dirty: false,
      });
    }

    // Restore viewport state
    if (migrated.ui?.viewportState) {
      vpStore.setZoom(migrated.ui.viewportState.zoom);
      vpStore.setPan(migrated.ui.viewportState.panX, migrated.ui.viewportState.panY);
    }

    // Restore timeline state
    if (migrated.ui?.timelineState) {
      tlStore.setZoom(migrated.ui.timelineState.zoom);
      tlStore.setScrollX(migrated.ui.timelineState.scrollX);
    }

    // Force a render request after all state is restored. This ensures the
    // viewport renders the loaded composition even if React's effects have a
    // timing gap (e.g., identity effect fires before layers effect, and the
    // idle-paused render loop consumed the render request before sync() ran).
    triggerRequestRender();
  }

  /** Run schema migrations if needed */
  static runMigrations(data: SerializedProject): SerializedProject {
    const fromVersion = (data as any).version ?? '0.0';
    if (fromVersion === CURRENT_VERSION) return data;
    return runMigrations(data, fromVersion, CURRENT_VERSION) as SerializedProject;
  }

  /** Validate loaded project data before deserializing */
  static validate(data: any): { valid: true } | { valid: false; error: string } {
    return validateProjectData(data);
  }

  /** Collect AssetRef objects from all in-memory assets that have a storageRef */
  private static _collectAssetRefs(): import('./StorageAdapter').AssetRef[] {
    try {
      return assetManager.getAllAssets()
        .filter(a => a.storageRef)
        .map(a => ({
          ...a.storageRef!,
          originalId: a.id,  // Preserve original in-memory ID for layer references
        }));
    } catch {
      return [];
    }
  }

  /** Restore assets from serialized project into the AssetManager */
  static async restoreAssets(data: SerializedProject): Promise<void> {
    if (!data.assets || data.assets.length === 0) return;
    // Also try listing assets from the storage adapter directly
    // (covers old projects that saved assets but didn't serialize the refs)
    try {
      const { StorageManager } = await import('./StorageManager');
      const sm = StorageManager.getInstance();
      const adapter = sm.getAdapter();
      const handle = sm.currentProjectHandle;
      if (adapter && handle) {
        const adapterAssets = await adapter.listAssets(handle);
        // Merge: adapter assets + serialized refs (dedup by filename)
        const seen = new Set(data.assets.map(a => a.filename));
        for (const aa of adapterAssets) {
          if (!seen.has(aa.filename)) {
            data.assets.push(aa);
            seen.add(aa.filename);
          }
        }
      }
    } catch {
      // Best effort — use whatever refs we have
    }

    for (const ref of data.assets) {
      try {
        await assetManager.addFromStorageRef(ref);
      } catch {
        // Individual asset failed — continue with others
      }
    }
  }
}
