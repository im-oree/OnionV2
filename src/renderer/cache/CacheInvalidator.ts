/**
 * CacheInvalidator — subscribes to composition and keyframe store changes
 * and invalidates affected frame ranges in the FrameCache.
 *
 * Invalidation rules (smart range-based):
 * - Composition setting change: invalidate ALL frames
 * - Layer added/removed/reordered: invalidate ALL frames
 * - Layer non-transform property (visible, opacity, blendMode, etc.): invalidate ALL frames
 * - Layer transform change (non-animated, static value): invalidate ALL frames
 * - Layer transform change (animated): invalidate only frames in the affected keyframe range
 * - Keyframe added/removed/moved: invalidate frames from prev keyframe to next keyframe
 * - Effect/mask parameter change: invalidate ALL frames (safest for now)
 */
import { FrameCache } from './FrameCache';
import { useCompositionStore } from '../../state/compositionStore';
import { useKeyframeStore } from '../../state/keyframeStore';
import { useEffectsStore } from '../../state/effectsStore';
import { useMaskStore } from '../../state/maskStore';
import { KeyframeEngine } from '../../animation/KeyframeEngine';

/**
 * Throttled: only invalidate at most once per ~100ms for effects/mask changes.
 * This avoids redundant invalidations while ensuring we never miss a change.
 */
export class CacheInvalidator {
  private frameCache: FrameCache;
  private unsubs: Array<() => void> = [];
  private _lastEffectsInvalidation = 0;
  private _lastMaskInvalidation = 0;
  private readonly _THROTTLE_MS = 100;
  /** Cache the keyframe engine accessor to query frame ranges */
  private _getEngine: () => KeyframeEngine;

  constructor(frameCache: FrameCache) {
    this.frameCache = frameCache;
    this._getEngine = () => useKeyframeStore.getState().engine;
  }

  /** Start listening to store changes */
  activate(): void {
    const unsub1 = useCompositionStore.subscribe((state, prevState) => {
      const activeId = state.activeCompositionId;
      if (!activeId) return;

      const prevComp = prevState.compositions.find(c => c.id === activeId);
      const currComp = state.compositions.find(c => c.id === activeId);
      if (!currComp) return;

      // Comp settings changed → invalidate ALL
      if (prevComp && (
        prevComp.width !== currComp.width ||
        prevComp.height !== currComp.height ||
        prevComp.fps !== currComp.fps ||
        prevComp.backgroundColor !== currComp.backgroundColor
      )) {
        this.frameCache.invalidateAll(activeId);
        return;
      }

      // Layers array length changed (added/removed/reordered) → invalidate ALL
      if (!prevComp || prevComp.layers.length !== currComp.layers.length) {
        this.frameCache.invalidateAll(activeId);
        return;
      }

      // Layer-by-layer comparison
      for (const currL of currComp.layers) {
        const prevL = prevComp?.layers.find(l => l.id === currL.id);
        if (!prevL) {
          this.frameCache.invalidateAll(activeId);
          return;
        }

        // Non-transform properties → invalidate ALL (affects every frame)
        if (
          prevL.visible !== currL.visible ||
          prevL.opacity !== currL.opacity ||
          prevL.blendMode !== currL.blendMode ||
          prevL.startFrame !== currL.startFrame ||
          prevL.endFrame !== currL.endFrame ||
          prevL.locked !== currL.locked ||
          prevL.soloed !== currL.soloed
        ) {
          this.frameCache.invalidateAll(activeId);
          return;
        }

        // Transform change → smart range invalidation
        if (this._transformChanged(prevL.transform, currL.transform)) {
          this._invalidateTransformRange(activeId, currL.id);
        }
      }
    });

    // Keyframe changes → invalidate the affected range
    const unsub2 = useKeyframeStore.subscribe((state, prevState) => {
      if (state.revision === prevState.revision) return;
      const activeId = useCompositionStore.getState().activeCompositionId;
      if (!activeId) return;

      // Priority: use the tracked mutation for a NARROW range
      const mutation = state.lastKeyframeMutation;
      if (mutation) {
        const narrowRange = this._narrowAffectedRange(
          mutation.layerId, mutation.property, mutation.time, mutation.oldTime,
        );
        if (narrowRange) {
          this.frameCache.invalidate(activeId, narrowRange.from, narrowRange.to);
          return;
        }
      }

      // Fallback: compute broader range across all layers
      const range = this._findChangedKeyframeRange(activeId);
      if (range) {
        this.frameCache.invalidate(activeId, range.from, range.to);
      } else {
        this.frameCache.invalidate(activeId, 0);
      }
    });

    // Effects change → invalidate ALL with throttle
    const unsub3 = useEffectsStore.subscribe(() => {
      const now = Date.now();
      if (now - this._lastEffectsInvalidation < this._THROTTLE_MS) return;
      this._lastEffectsInvalidation = now;
      const activeId = useCompositionStore.getState().activeCompositionId;
      if (!activeId) return;
      this.frameCache.invalidate(activeId, 0);
    });

    // Mask change → invalidate ALL with throttle
    const unsub4 = useMaskStore.subscribe(() => {
      const now = Date.now();
      if (now - this._lastMaskInvalidation < this._THROTTLE_MS) return;
      this._lastMaskInvalidation = now;
      const activeId = useCompositionStore.getState().activeCompositionId;
      if (!activeId) return;
      this.frameCache.invalidate(activeId, 0);
    });

    this.unsubs = [unsub1, unsub2, unsub3, unsub4];
  }

  deactivate(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }

  private _transformChanged(a: { position: { x: number; y: number }; scale: { x: number; y: number }; rotation: number; anchorPoint: { x: number; y: number } }, b: typeof a): boolean {
    return (
      a.position.x !== b.position.x || a.position.y !== b.position.y ||
      a.scale.x !== b.scale.x || a.scale.y !== b.scale.y ||
      a.rotation !== b.rotation ||
      a.anchorPoint.x !== b.anchorPoint.x || a.anchorPoint.y !== b.anchorPoint.y
    );
  }

  /**
   * Smart invalidation for transform changes on an animated layer.
   * If the property is animated, only invalidate the affected keyframe range.
   * If static (no animation on that property), invalidate ALL frames.
   */
  private _invalidateTransformRange(compId: string, layerId: string): void {
    const engine = this._getEngine();
    const properties = engine.getAllAnimatedProperties(layerId);

    if (properties.length === 0) {
      // Layer is NOT animated → static change affects ALL frames
      this.frameCache.invalidate(compId, 0);
      return;
    }

    // Layer IS animated → find the affected frame range across all animated properties
    let minFrom = Infinity;
    let maxTo = -Infinity;

    for (const prop of properties) {
      const kfs = engine.getKeyframesForProperty(layerId, prop) as any[];
      if (kfs.length === 0) continue;
      kfs.sort((a, b) => a.time - b.time);
      // Invalidate from first keyframe to last keyframe (the animated range)
      // plus some extra frames at the edges for interpolation
      const pad = Math.max(1, Math.ceil((kfs[1]?.time ?? kfs[0].time + 2) - kfs[0].time) * 0.5);
      minFrom = Math.min(minFrom, Math.max(0, kfs[0].time - pad));
      maxTo = Math.max(maxTo, kfs[kfs.length - 1].time + pad);
    }

    if (minFrom < Infinity) {
      this.frameCache.invalidate(compId, Math.floor(minFrom), Math.ceil(maxTo));
    } else {
      // Fallback: just invalidate from current frame forward
      this.frameCache.invalidate(compId, 0);
    }
  }

  /**
   * Compute a NARROW invalidation range around a single mutated keyframe.
   * Uses neighboring keyframes on the SAME property to scope the range.
   * For moved keyframes, also invalidates around the old position.
   */
  private _narrowAffectedRange(
    layerId: string, property: string, newTime: number, oldTime?: number,
  ): { from: number; to: number } | null {
    const engine = this._getEngine();
    const kfs = engine.getKeyframesForProperty(layerId, property) as any[];
    if (kfs.length === 0) return null;

    // Sort by time
    kfs.sort((a: any, b: any) => a.time - b.time);

    // Find the keyframe at or nearest to the mutated time
    const idx = kfs.findIndex((k: any) => k.time === newTime);

    let from: number;
    let to: number;

    if (idx >= 0) {
      // Keyframe exists at this time — use neighbors
      from = idx > 0 ? kfs[idx - 1].time : 0;
      to = idx < kfs.length - 1 ? kfs[idx + 1].time : kfs[idx].time + 2;
    } else {
      // Keyframe was removed — check oldTime if available
      const time = oldTime ?? newTime;
      const nearest = kfs.findIndex((k: any) => k.time >= time);
      from = nearest > 0 ? kfs[nearest - 1].time : 0;
      to = nearest < kfs.length ? kfs[nearest].time : time + 2;
    }

    // If keyframe was MOVED, also include old position's neighbors
    if (oldTime !== undefined && oldTime !== newTime) {
      // Extend range to cover both old and new positions
      const oldNearest = kfs.findIndex((k: any) => k.time >= oldTime);
      const oldFrom = oldNearest > 0 ? kfs[oldNearest - 1].time : 0;
      const oldTo = oldNearest < kfs.length ? kfs[oldNearest].time : oldTime + 2;
      from = Math.min(from, oldFrom);
      to = Math.max(to, oldTo);
    }

    // Add small padding for interpolation
    const pad = Math.max(1, Math.ceil((to - from) * 0.1));
    return {
      from: Math.max(0, Math.floor(from) - pad),
      to: Math.ceil(to) + pad,
    };
  }

  /**
   * Find the range of keyframes that changed by checking all layers.
   * Returns { from, to } frame range or null if unknown.
   */
  private _findChangedKeyframeRange(compId: string): { from: number; to: number } | null {
    const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
    if (!comp) return null;

    const engine = this._getEngine();
    let minFrom = Infinity;
    let maxTo = -Infinity;

    for (const layer of comp.layers) {
      const props = engine.getAllAnimatedProperties(layer.id);
      for (const prop of props) {
        const kfs = engine.getKeyframesForProperty(layer.id, prop) as any[];
        if (kfs.length === 0) continue;
        kfs.sort((a, b) => a.time - b.time);
        minFrom = Math.min(minFrom, kfs[0].time);
        maxTo = Math.max(maxTo, kfs[kfs.length - 1].time);
      }
    }

    if (minFrom < Infinity && maxTo >= minFrom) {
      // Invalidate from first keyframe - 1 frame to last keyframe + 1 frame
      return {
        from: Math.max(0, Math.floor(minFrom) - 1),
        to: Math.ceil(maxTo) + 1,
      };
    }
    return null;
  }

  invalidateComp(compId: string): void {
    this.frameCache.invalidateAll(compId);
  }

  dispose(): void {
    this.deactivate();
  }
}
