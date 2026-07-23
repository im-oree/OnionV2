/**
 * cacheStore — Zustand store for cache UI state.
 * Polls frameCache stats and exposes purge actions.
 */
import { create } from 'zustand';
import { frameCache } from '../renderer/cache/FrameCache';

export interface CacheStats {
  ram: {
    usedBytes: number;
    maxBytes: number;
    usageFraction: number;
    size: number;
    hitRate: number;
    hits: number;
    misses: number;
  };
  disk: {
    usedBytes: number;
    maxBytes: number;
    usageFraction: number;
    hits: number;
    misses: number;
    tier: string;
  };
  pendingDiskWrites: number;
}

interface CacheStoreState {
  stats: CacheStats | null;
  enabled: boolean;
  diskEnabled: boolean;
  isPurging: boolean;

  // Actions
  refreshStats: () => void;
  setRamMaxBytes: (bytes: number) => void;
  setDiskMaxBytes: (bytes: number) => void;
  setEnabled: (v: boolean) => void;
  setDiskEnabled: (v: boolean) => void;
  purgeRam: () => void;
  purgeDisk: () => Promise<void>;
  purgeAll: () => Promise<void>;
}

export const useCacheStore = create<CacheStoreState>((set) => ({
  stats: null,
  enabled: true,
  diskEnabled: true,
  isPurging: false,

  refreshStats: () => {
    const stats = frameCache.getStats();
    set({ stats: stats as CacheStats });
  },

  setRamMaxBytes: (bytes: number) => {
    frameCache.ram.setMaxBytes(bytes);
    set({ stats: frameCache.getStats() as CacheStats });
  },

  setDiskMaxBytes: (bytes: number) => {
    frameCache.disk.setMaxBytes(bytes);
    set({ stats: frameCache.getStats() as CacheStats });
  },

  setEnabled: (v: boolean) => {
    frameCache.enabled = v;
    set({ enabled: v });
  },

  setDiskEnabled: (v: boolean) => {
    frameCache.diskEnabled = v;
    set({ diskEnabled: v });
  },

  purgeRam: () => {
    frameCache.purge('ram');
    set({ stats: frameCache.getStats() as CacheStats });
  },

  purgeDisk: async () => {
    set({ isPurging: true });
    await frameCache.purge('disk');
    set({ isPurging: false, stats: frameCache.getStats() as CacheStats });
  },

  purgeAll: async () => {
    set({ isPurging: true });
    await frameCache.purge('all');
    set({ isPurging: false, stats: frameCache.getStats() as CacheStats });
  },
}));