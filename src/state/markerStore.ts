import { create } from 'zustand';
import type { CompositionMarker } from '../types/marker';
import { defaultMarker } from '../types/marker';

export interface MarkerState {
  markersByComposition: Record<string, CompositionMarker[]>;

  addMarker: (compId: string, time: number, frame: number, label?: string) => void;
  removeMarker: (compId: string, markerId: string) => void;
  updateMarker: (compId: string, markerId: string, patch: Partial<CompositionMarker>) => void;
  clearAllMarkers: (compId: string) => void;
  getMarkersForComposition: (compId: string) => CompositionMarker[];
}

export const useMarkerStore = create<MarkerState>((set, get) => ({
  markersByComposition: {},

  addMarker: (compId, time, frame, label) =>
    set((s) => {
      const existing = s.markersByComposition[compId] ?? [];
      const marker = defaultMarker(time, frame);
      if (label) marker.label = label;
      return {
        markersByComposition: {
          ...s.markersByComposition,
          [compId]: [...existing, marker],
        },
      };
    }),

  removeMarker: (compId, markerId) =>
    set((s) => {
      const existing = s.markersByComposition[compId] ?? [];
      return {
        markersByComposition: {
          ...s.markersByComposition,
          [compId]: existing.filter((m) => m.id !== markerId),
        },
      };
    }),

  updateMarker: (compId, markerId, patch) =>
    set((s) => {
      const existing = s.markersByComposition[compId] ?? [];
      return {
        markersByComposition: {
          ...s.markersByComposition,
          [compId]: existing.map((m) => (m.id === markerId ? { ...m, ...patch } : m)),
        },
      };
    }),

  clearAllMarkers: (compId) =>
    set((s) => ({
      markersByComposition: {
        ...s.markersByComposition,
        [compId]: [],
      },
    })),

  getMarkersForComposition: (compId) => get().markersByComposition[compId] ?? [],
}));
