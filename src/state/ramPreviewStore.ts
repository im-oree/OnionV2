/**
 * ramPreviewStore — tracks RAM preview build progress for UI consumption.
 */
import { create } from 'zustand';
import { ramPreviewBuilder } from '../renderer/RamPreviewBuilder';
import { frameCache } from '../renderer/cache/FrameCache';
import { useTimelineStore } from './timelineStore';

export interface RamPreviewState {
  isBuilding: boolean;
  progress: number;        // 0–1
  currentFrame: number;
  totalFrames: number;
  cachedFrames: number;
  cachedCompId: string | null;

  // Map of compId → Set of cached frame numbers (for green bar)
  cachedFramesByComp: Map<string, Set<number>>;

  // Actions
  startBuild: (compId: string) => void;
  stopBuild: () => void;
  refreshCachedFrames: (compId: string) => void;
  isCacheComplete: (compId: string, startFrame: number, endFrame: number) => boolean;
  getCachedFraction: (compId: string, startFrame: number, endFrame: number) => number;
}

export const useRamPreviewStore = create<RamPreviewState>((set, get) => {
  // Wire up builder events → store updates
  ramPreviewBuilder.on((event) => {
    switch (event.type) {
      case 'progress':
        set({
          isBuilding: true,
          progress: event.fraction,
          currentFrame: event.frame,
          cachedFrames: event.cachedFrames,
        });
        // Refresh cached frame set for the ruler bar
        get().refreshCachedFrames(ramPreviewBuilder.currentCompId ?? '');
        break;

      case 'complete':
        set({
          isBuilding: false,
          progress: 1,
          cachedFrames: event.totalCached,
        });
        get().refreshCachedFrames(ramPreviewBuilder.currentCompId ?? '');
        break;

      case 'cancelled':
        set({ isBuilding: false });
        break;

      case 'error':
        set({ isBuilding: false });
        console.warn('[RamPreview] Error:', event.message);
        break;
    }
  });

  return {
    isBuilding: false,
    progress: 0,
    currentFrame: 0,
    totalFrames: 0,
    cachedFrames: 0,
    cachedCompId: null,
    cachedFramesByComp: new Map(),

    startBuild: (compId: string) => {
      const { useCompositionStore } = require('../state/compositionStore');
      const comp = useCompositionStore.getState().compositions.find(
        (c: any) => c.id === compId,
      );
      if (!comp) return;

      const totalFrames = Math.floor(comp.duration * comp.fps);
      set({
        isBuilding: true,
        progress: 0,
        currentFrame: 0,
        totalFrames,
        cachedCompId: compId,
      });

      ramPreviewBuilder.start(comp);
    },

    stopBuild: () => {
      ramPreviewBuilder.stop();
      set({ isBuilding: false, progress: 0 });
    },

    /**
     * Walk the RAM cache and rebuild the set of cached frame numbers
     * for the given comp. Called after each progress event so the
     * TimelineRuler can paint the green bar accurately.
     *
     * This is O(cached frames) — typically a few hundred entries max.
     */
    refreshCachedFrames: (compId: string) => {
      if (!compId) return;

      // Don't refresh during playback — the cache isn't changing anyway
      // and iteration can conflict with LRU reordering
      if (useTimelineStore.getState().playbackState === 'playing') return;

      const frames = new Set<number>();
      // Snapshot to an array first — avoids concurrent modification
      // during iteration (RamCache.get() reorders the underlying Map)
      const snapshot = Array.from(frameCache.ram.entries());
      for (const [, entry] of snapshot) {
        if (entry.compId === compId) {
          frames.add(entry.frame);
        }
      }

      set(s => {
        const existing = s.cachedFramesByComp.get(compId);
        // Only trigger re-render if the set actually changed
        if (existing && existing.size === frames.size) {
          let same = true;
          for (const f of frames) if (!existing.has(f)) { same = false; break; }
          if (same) return s;
        }
        return {
          cachedFramesByComp: new Map(s.cachedFramesByComp).set(compId, frames),
        };
      });
    },

    isCacheComplete: (compId: string, startFrame: number, endFrame: number): boolean => {
      const frames = get().cachedFramesByComp.get(compId);
      if (!frames || frames.size === 0) return false;
      for (let f = startFrame; f < endFrame; f++) {
        if (!frames.has(f)) return false;
      }
      return true;
    },

    getCachedFraction: (compId: string, startFrame: number, endFrame: number): number => {
      const total = endFrame - startFrame;
      if (total <= 0) return 0;
      const frames = get().cachedFramesByComp.get(compId);
      if (!frames || frames.size === 0) return 0;
      let cached = 0;
      for (let f = startFrame; f < endFrame; f++) {
        if (frames.has(f)) cached++;
      }
      return cached / total;
    },
  };
});