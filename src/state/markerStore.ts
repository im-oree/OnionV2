import { create } from 'zustand';
import type { CompositionMarker } from '../types/marker';
import { defaultMarker } from '../types/marker';
import { captureSnapshot, useHistoryStore } from './historyStore';

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

  addMarker: (compId, time, frame, label) => {
    const snapshot = captureSnapshot();
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
    });
    useHistoryStore.getState().pushEntry('Add Marker', snapshot);
  },

  removeMarker: (compId, markerId) => {
    const snapshot = captureSnapshot();
    set((s) => {
      const existing = s.markersByComposition[compId] ?? [];
      return {
        markersByComposition: {
          ...s.markersByComposition,
          [compId]: existing.filter((m) => m.id !== markerId),
        },
      };
    });
    useHistoryStore.getState().pushEntry('Remove Marker', snapshot);
  },

  updateMarker: (compId, markerId, patch) => {
    const snapshot = captureSnapshot();
    set((s) => {
      const existing = s.markersByComposition[compId] ?? [];
      return {
        markersByComposition: {
          ...s.markersByComposition,
          [compId]: existing.map((m) => (m.id === markerId ? { ...m, ...patch } : m)),
        },
      };
    });
    useHistoryStore.getState().pushEntry('Update Marker', snapshot);
  },

  clearAllMarkers: (compId) => {
    const snapshot = captureSnapshot();
    set((s) => ({
      markersByComposition: {
        ...s.markersByComposition,
        [compId]: [],
      },
    }));
    useHistoryStore.getState().pushEntry('Clear Markers', snapshot);
  },

  getMarkersForComposition: (compId) => get().markersByComposition[compId] ?? [],
}));
