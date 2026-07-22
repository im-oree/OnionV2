/**
 * CacheInvalidator — subscribes to store changes and invalidates
 * affected frame ranges in the FrameCache.
 *
 * All invalidate() calls use explicit fromFrame+toFrame,
 * or invalidateAll() directly.
 */
import { FrameCache } from './FrameCache';
import { useCompositionStore } from '../../state/compositionStore';
import { useKeyframeStore } from '../../state/keyframeStore';
import { useEffectsStore } from '../../state/effectsStore';
import { useMaskStore } from '../../state/maskStore';
import { KeyframeEngine } from '../../animation/KeyframeEngine';

type Keyframe = { time: number };

const EPSILON = 0.0001;

export class CacheInvalidator {
  private frameCache: FrameCache;
  private unsubs: Array<() => void> = [];
  private _lastEffectsInvalidation = 0;
  private _lastMaskInvalidation = 0;
  private readonly _THROTTLE_MS = 150;
  private _getEngine: () => KeyframeEngine | undefined;

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

      // Layers added/removed OR reordered → invalidate ALL
      if (
        !prevComp ||
        prevComp.layers.length !== currComp.layers.length ||
        prevComp.layers.some((l, i) => l.id !== currComp.layers[i]?.id)
      ) {
        this._invalidateAll(activeId);
        return;
      }

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
      if (
        mutation &&
        typeof mutation.time === 'number' &&
        typeof mutation.layerId === 'string'
      ) {
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
    this._lastEffectsInvalidation = 0;
    this._lastMaskInvalidation = 0;
  }

  private _transformChanged(a: any, b: any): boolean {
    if (!a || !b) return true;

    return (
      a.position?.x !== b.position?.x ||
      a.position?.y !== b.position?.y ||
      a.scale?.x !== b.scale?.x ||
      a.scale?.y !== b.scale?.y ||
      a.rotation !== b.rotation ||
      a.anchorPoint?.x !== b.anchorPoint?.x ||
      a.anchorPoint?.y !== b.anchorPoint?.y
    );
  }

  private _invalidateAll(compId: string): void {
    this.frameCache.invalidateAll(compId);
    this.onInvalidateAll?.(compId);
  }

  private _invalidateTransformRange(compId: string, layerId: string): void {
    const engine = this._getEngine();
    if (!engine) {
      this._invalidateAll(compId);
      return;
    }

    const properties = engine.getAllAnimatedProperties(layerId);
    if (properties.length === 0) {
      this._invalidateAll(compId);
      return;
    }

    let minFrom = Infinity;
    let maxTo = -Infinity;

    for (const prop of properties) {
      const kfs = engine.getKeyframesForProperty(
        layerId,
        prop,
      ) as Keyframe[];

      if (!kfs || kfs.length < 2) {
        this._invalidateAll(compId);
        return;
      }

      kfs.sort((a, b) => a.time - b.time);

      const first = kfs[0].time;
      const last = kfs[kfs.length - 1].time;
      const pad = Math.max(1, Math.ceil((last - first) * 0.05));

      minFrom = Math.min(minFrom, Math.max(0, first - pad));
      maxTo = Math.max(maxTo, last + pad);
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
    if (!engine) return null;

    const kfs = engine.getKeyframesForProperty(
      layerId,
      property,
    ) as Keyframe[];

    if (!kfs || kfs.length < 2) return null;

    kfs.sort((a, b) => a.time - b.time);

    const findExactIndex = (time: number) =>
      kfs.findIndex((k) => Math.abs(k.time - time) < EPSILON);

    const idx = findExactIndex(newTime);

    let from: number;
    let to: number;

    if (idx >= 0) {
      from = idx > 0 ? kfs[idx - 1].time : kfs[0].time;
      to = idx < kfs.length - 1 ? kfs[idx + 1].time : kfs[idx].time;
    } else {
      const time = oldTime ?? newTime;

      const nearest = kfs.findIndex((k) => k.time > time);

      if (nearest === -1) {
        from = kfs[kfs.length - 2].time;
        to = kfs[kfs.length - 1].time;
      } else if (nearest === 0) {
        from = kfs[0].time;
        to = kfs[1].time;
      } else {
        from = kfs[nearest - 1].time;
        to = kfs[nearest].time;
      }
    }

    if (oldTime !== undefined && Math.abs(oldTime - newTime) > EPSILON) {
      const oldIdx = findExactIndex(oldTime);
      if (oldIdx >= 0) {
        const oldFrom =
          oldIdx > 0 ? kfs[oldIdx - 1].time : kfs[0].time;
        const oldTo =
          oldIdx < kfs.length - 1
            ? kfs[oldIdx + 1].time
            : kfs[oldIdx].time;

        from = Math.min(from, oldFrom);
        to = Math.max(to, oldTo);
      }
    }

    const pad = Math.max(1, Math.ceil((to - from) * 0.1));

    return {
      from: Math.max(0, Math.floor(from - pad)),
      to: Math.ceil(to + pad),
    };
  }

  invalidateComp(compId: string): void {
    this._invalidateAll(compId);
  }

  dispose(): void {
    this.deactivate();
  }
}