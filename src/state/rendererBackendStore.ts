/**
 * rendererBackendStore — tracks user's chosen backend and the actual
 * one currently active (they can differ if WebGPU init fell back to WebGL).
 * Also tracks unsupported effect list for badge UI.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type BackendId, type BackendCapabilities,
  getCapabilities, isWebGPUAvailable, BACKEND_LABELS,
} from '../renderer/backend/RenderBackend';

interface BackendState {
  /** User's chosen backend (persisted) */
  preferredBackend: BackendId;
  /** Actual backend currently running (may differ if fallback occurred) */
  actualBackend: BackendId;
  /** Whether the browser supports WebGPU at all */
  webgpuAvailable: boolean;
  /** Detection has completed */
  webgpuChecked: boolean;
  /** Set of effect IDs that failed to render on the current backend */
  unsupportedEffectIds: Set<string>;
  /** Text explanation shown in the warning banner (fallback reason etc.) */
  fallbackReason: string | null;
  /** True while a hot-swap is in progress */
  swapping: boolean;

  // Actions
  setPreferredBackend: (backend: BackendId) => void;
  setActualBackend: (backend: BackendId, fallbackReason?: string) => void;
  checkWebGPUAvailability: () => Promise<void>;
  markEffectUnsupported: (effectId: string) => void;
  clearUnsupportedEffects: () => void;
  setSwapping: (v: boolean) => void;

  // Queries
  getCapabilities: () => BackendCapabilities;
  getBackendLabel: () => string;
}

export const useRendererBackendStore = create<BackendState>()(
  persist(
    (set, get) => ({
      preferredBackend: 'webgl',
      actualBackend: 'webgl',
      webgpuAvailable: false,
      webgpuChecked: false,
      unsupportedEffectIds: new Set(),
      fallbackReason: null,
      swapping: false,

      setPreferredBackend: (backend) => {
        // WebGPU is disabled — silently coerce to webgl
        const safe: BackendId = backend === 'webgpu' ? 'webgl' : backend;
        set({ preferredBackend: safe });
      },

      setActualBackend: (backend, fallbackReason) => {
        set({
          actualBackend: backend,
          fallbackReason: fallbackReason ?? null,
          // Clear unsupported list when backend changes — will be repopulated
          unsupportedEffectIds: new Set(),
        });
      },

      checkWebGPUAvailability: async () => {
        // WebGPU is temporarily disabled — never advertise availability
        // regardless of browser support. See TODO for re-enablement.
        set({ webgpuAvailable: false, webgpuChecked: true });
      },

      markEffectUnsupported: (effectId) => {
        set((s) => {
          if (s.unsupportedEffectIds.has(effectId)) return s;
          const next = new Set(s.unsupportedEffectIds);
          next.add(effectId);
          return { unsupportedEffectIds: next };
        });
      },

      clearUnsupportedEffects: () => set({ unsupportedEffectIds: new Set() }),
      setSwapping: (v) => set({ swapping: v }),

      getCapabilities: () => getCapabilities(get().actualBackend),
      getBackendLabel: () => BACKEND_LABELS[get().actualBackend],
    }),
    {
      name: 'onion-renderer-backend',
      partialize: (s) => ({
        // Never persist "webgpu" — force it to webgl on save so
        // a hydrated old value can't re-enable a disabled backend.
        preferredBackend: s.preferredBackend === 'webgpu' ? 'webgl' : s.preferredBackend,
      }),
    },
  ),
);