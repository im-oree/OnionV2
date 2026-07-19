/**
 * CacheInvalidator — subscribes to store changes and invalidates
 * affected frame ranges in the FrameCache.
 *
 * FIX: All invalidate() calls now use explicit fromFrame+toFrame,
 * or invalidateAll() directly. The old code was calling
 * invalidate(id, 0) with no toFrame, which hit the "undefined toFrame"
 * branch and called invalidateAll() unintentionally.
 */
import { FrameCache } from './FrameCache';
import { useCompositionStore } from '../../state/compositionStore';
import { useKeyframeStore } from '../../state/keyframeStore';
import { useEffectsStore } from '../../state/effectsStore';
import { useMaskStore } from '../../state/maskStore';
import { KeyframeEngine } from '../../animation/KeyframeEngine';

export class CacheInvalidator {
  private frameCache: FrameCache;
  private unsubs: Array<() => void> = [];
  private _lastEffectsInvalidation = 0;
  private _lastMaskInvalidation = 0;
  private readonly _THROTTLE_MS = 150;
  private _getEngine: () => KeyframeEngine;

  /**
   * Called whenever frameCache.invalidateAll(compId) is triggered.
   * The Renderer sets this to also invalidate the GPU texture cache.
   */
  public onInvalidateAll: ((compId: string) => void) | null = null;

  constructor(frameCache: FrameCache) {
    this.frameCache = frameCache;
    this._getEngine = () => useKeyframeStore.getState().engine;
  }

  activate(): void {
    const unsub1 = useCompositionStore.subscribe((state, prevState) => {
      const activeId = state.activeCompositionId;
      if (!activeId) return;

      const prevComp = prevState.compositions.find((c) => c.id === activeId);
      const currComp = state.compositions.find((c) => c.id === activeId);
      if (!currComp) return;

      // Comp settings changed → invalidate ALL
      if (
        prevComp &&
        (prevComp.width !== currComp.width ||
          prevComp.height !== currComp.height ||
          prevComp.fps !== currComp.fps ||
          prevComp.backgroundColor !== currComp.backgroundColor)
      ) {
        this._invalidateAll(activeId);
        return;
      }

      // Layers added/removed/reordered → invalidate ALL
      if (!prevComp || prevComp.layers.length !== currComp.layers.length) {
        this._invalidateAll(activeId);
        return;
      }

      // Layer-level comparison
      for (const currL of currComp.layers) {
        const prevL = prevComp.layers.find((l) => l.id === currL.id);
        if (!prevL) {
          this._invalidateAll(activeId);
          return;
        }

        if (
          prevL.visible !== currL.visible ||
          prevL.opacity !== currL.opacity ||
          prevL.blendMode !== currL.blendMode ||
          prevL.startFrame !== currL.startFrame ||
          prevL.endFrame !== currL.endFrame ||
          prevL.locked !== currL.locked ||
          prevL.soloed !== currL.soloed
        ) {
          this._invalidateAll(activeId);
          return;
        }

        if (this._transformChanged(prevL.transform, currL.transform)) {
          this._invalidateTransformRange(activeId, currL.id);
        }
      }
    });

    const unsub2 = useKeyframeStore.subscribe((state, prevState) => {
      if (state.revision === prevState.revision) return;
      const activeId = useCompositionStore.getState().activeCompositionId;
      if (!activeId) return;

      const mutation = state.lastKeyframeMutation;
      if (mutation) {
        const narrowRange = this._narrowAffectedRange(
          mutation.layerId,
          mutation.property,
          mutation.time,
          mutation.oldTime,
        );
        if (narrowRange) {
          this.frameCache.invalidate(
            activeId,
            narrowRange.from,
            narrowRange.to,
          );
          return;
        }
      }

      // Fallback: invalidate everything — safer than leaving stale frames
      this._invalidateAll(activeId);
    });

    const unsub3 = useEffectsStore.subscribe(() => {
      const now = Date.now();
      if (now - this._lastEffectsInvalidation < this._THROTTLE_MS) return;
      this._lastEffectsInvalidation = now;
      const activeId = useCompositionStore.getState().activeCompositionId;
      if (!activeId) return;
      this._invalidateAll(activeId);
    });

    const unsub4 = useMaskStore.subscribe(() => {
      const now = Date.now();
      if (now - this._lastMaskInvalidation < this._THROTTLE_MS) return;
      this._lastMaskInvalidation = now;
      const activeId = useCompositionStore.getState().activeCompositionId;
      if (!activeId) return;
      this._invalidateAll(activeId);
    });

    this.unsubs = [unsub1, unsub2, unsub3, unsub4];
  }

  deactivate(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }

  private _transformChanged(
    a: {
      position: { x: number; y: number };
      scale: { x: number; y: number };
      rotation: number;
      anchorPoint: { x: number; y: number };
    },
    b: typeof a,
  ): boolean {
    return (
      a.position.x !== b.position.x ||
      a.position.y !== b.position.y ||
      a.scale.x !== b.scale.x ||
      a.scale.y !== b.scale.y ||
      a.rotation !== b.rotation ||
      a.anchorPoint.x !== b.anchorPoint.x ||
      a.anchorPoint.y !== b.anchorPoint.y
    );
  }

  /** Invalidate both frame cache and GPU texture cache. */
  private _invalidateAll(compId: string): void {
    this.frameCache.invalidateAll(compId);
    this.onInvalidateAll?.(compId);
  }

  private _invalidateTransformRange(
    compId: string,
    layerId: string,
  ): void {
    const engine = this._getEngine();
    const properties = engine.getAllAnimatedProperties(layerId);

    if (properties.length === 0) {
      this.frameCache.invalidateAll(compId);
      return;
    }

    let minFrom = Infinity;
    let maxTo = -Infinity;

    for (const prop of properties) {
      const kfs = engine.getKeyframesForProperty(layerId, prop) as any[];
      if (kfs.length === 0) continue;
      kfs.sort((a, b) => a.time - b.time);
      const pad = Math.max(
        1,
        Math.ceil(
          ((kfs[1]?.time ?? kfs[0].time + 2) - kfs[0].time) * 0.5,
        ),
      );
      minFrom = Math.min(minFrom, Math.max(0, kfs[0].time - pad));
      maxTo = Math.max(maxTo, kfs[kfs.length - 1].time + pad);
    }

    if (minFrom < Infinity) {
      this.frameCache.invalidate(
        compId,
        Math.floor(minFrom),
        Math.ceil(maxTo),
      );
    } else {
      this._invalidateAll(compId);
    }
  }

  private _narrowAffectedRange(
    layerId: string,
    property: string,
    newTime: number,
    oldTime?: number,
  ): { from: number; to: number } | null {
    const engine = this._getEngine();
    const kfs = engine.getKeyframesForProperty(layerId, property) as any[];
    if (kfs.length === 0) return null;

    kfs.sort((a: any, b: any) => a.time - b.time);

    const idx = kfs.findIndex((k: any) => k.time === newTime);
    let from: number;
    let to: number;

    if (idx >= 0) {
      from = idx > 0 ? kfs[idx - 1].time : 0;
      to =
        idx < kfs.length - 1 ? kfs[idx + 1].time : kfs[idx].time + 2;
    } else {
      const time = oldTime ?? newTime;
      const nearest = kfs.findIndex((k: any) => k.time >= time);
      from = nearest > 0 ? kfs[nearest - 1].time : 0;
      to =
        nearest < kfs.length ? kfs[nearest].time : time + 2;
    }

    if (oldTime !== undefined && oldTime !== newTime) {
      const oldNearest = kfs.findIndex((k: any) => k.time >= oldTime);
      const oldFrom = oldNearest > 0 ? kfs[oldNearest - 1].time : 0;
      const oldTo =
        oldNearest < kfs.length ? kfs[oldNearest].time : oldTime + 2;
      from = Math.min(from, oldFrom);
      to = Math.max(to, oldTo);
    }

    const pad = Math.max(1, Math.ceil((to - from) * 0.1));
    return {
      from: Math.max(0, Math.floor(from) - pad),
      to: Math.ceil(to) + pad,
    };
  }

  invalidateComp(compId: string): void {
    this._invalidateAll(compId);
  }

  dispose(): void {
    this.deactivate();
  }
}