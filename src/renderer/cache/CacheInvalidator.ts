/**
 * CacheInvalidator — subscribes to composition and keyframe store changes
 * and invalidates affected frame ranges in the FrameCache.
 *
 * Invalidation rules:
 * - Layer added/removed: invalidate ALL frames of that comp
 * - Layer transform change (static): invalidate all frames
 * - Layer transform change (animated): invalidate from earliest affected keyframe onward
 * - Keyframe added/removed/moved: invalidate from earliest change onward
 * - Effect parameter change: invalidate range affected by that effect's animation
 * - Blend mode change: invalidate all frames
 * - Composition setting change: invalidate all
 * - Mask change: invalidate frame range
 */
import { FrameCache } from './FrameCache';
import { useCompositionStore } from '../../state/compositionStore';
import { useKeyframeStore } from '../../state/keyframeStore';

export class CacheInvalidator {
  private frameCache: FrameCache;
  private unsubs: Array<() => void> = [];

  constructor(frameCache: FrameCache) {
    this.frameCache = frameCache;
  }

  /** Start listening to store changes */
  activate(): void {
    // Subscribe to composition store
    const unsub1 = useCompositionStore.subscribe((state, prevState) => {
      this._activeCompId = state.activeCompositionId;
      const activeId = state.activeCompositionId;
      if (!activeId) return;

      const prevComp = prevState.compositions.find(c => c.id === activeId);
      const currComp = state.compositions.find(c => c.id === activeId);
      if (!currComp) return;

      // Composition settings changed (bg, fps, dimensions)
      if (prevComp && (
        prevComp.width !== currComp.width ||
        prevComp.height !== currComp.height ||
        prevComp.fps !== currComp.fps ||
        prevComp.backgroundColor !== currComp.backgroundColor
      )) {
        this.frameCache.invalidateAll(activeId);
        return;
      }

      // Layers array changed (added/removed/reordered)
      if (!prevComp || prevComp.layers.length !== currComp.layers.length) {
        this.frameCache.invalidateAll(activeId);
        return;
      }

      // Check for layer-level changes
      for (let i = 0; i < currComp.layers.length; i++) {
        const prevL = prevComp?.layers[i];
        const currL = currComp.layers[i];
        if (!prevL || !currL) continue;

        if (
          prevL.visible !== currL.visible ||
          prevL.opacity !== currL.opacity ||
          prevL.blendMode !== currL.blendMode ||
          prevL.startFrame !== currL.startFrame ||
          prevL.endFrame !== currL.endFrame ||
          prevL.locked !== currL.locked ||
          prevL.soloed !== currL.soloed
        ) {
          // Non-transform property change — invalidate all
          this.frameCache.invalidateAll(activeId);
          return;
        }

        // Transform change — check if animated or static
        if (this._transformChanged(prevL.transform, currL.transform)) {
          this._invalidateFromAffectedFrame(activeId, currL.id, 'transform');
        }
      }
    });

    // Subscribe to keyframe store
    const unsub2 = useKeyframeStore.subscribe((state, prevState) => {
      if (state.revision === prevState.revision) return;
      const activeId = useCompositionStore.getState().activeCompositionId;
      if (!activeId) return;
      // Keyframe changes invalidate from the earliest affected keyframe
      this.frameCache.invalidate(activeId, 0);
    });

    this.unsubs = [unsub1, unsub2];
  }

  /** Deactivate all subscriptions */
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

  private _invalidateFromAffectedFrame(compId: string, _layerId: string, _property: string): void {
    // For now, invalidate the entire comp when any animated property changes.
    // Future: track which property ranges are animated and only invalidate from
    // the earliest keyframe that's been modified.
    this.frameCache.invalidate(compId, 0);
  }

  /** Force invalidate all caches for a comp (e.g. when layer is added/removed externally) */
  invalidateComp(compId: string): void {
    this.frameCache.invalidateAll(compId);
  }

  dispose(): void {
    this.deactivate();
  }
}
