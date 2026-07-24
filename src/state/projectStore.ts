import { create } from 'zustand';
import type { Project, ProjectAsset, ProjectFolder } from '../types/project';
import { DEFAULT_PROJECT } from '../config/defaults';
import { captureSnapshot, useHistoryStore } from './historyStore';

function genId(prefix = 'proj'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Push undo entry — safely no-op if history isn't ready yet. */
function pushHistory(name: string, snapshot: string): void {
  try {
    useHistoryStore.getState().pushEntry(name, snapshot);
  } catch { /* history unavailable — silent */ }
}

export interface ProjectState {
  project: Project;
  dirty: boolean;
  fileHandle: FileSystemFileHandle | null;
  setProject: (p: Project) => void;
  setDirty: (d: boolean) => void;
  setFileHandle: (h: FileSystemFileHandle | null) => void;
  addAsset: (a: ProjectAsset) => void;
  removeAsset: (id: string) => void;
  updateAsset: (id: string, data: Partial<ProjectAsset>) => void;
  renameAsset: (id: string, name: string) => void;
  moveAssetToFolder: (assetId: string, folderId: string | null) => void;
  updateSettings: (s: Partial<Project['settings']>) => void;
  newProject: () => void;

  // Folder actions
  addFolder: (name: string, parentId?: string | null) => ProjectFolder;
  removeFolder: (id: string) => void;
  renameFolder: (id: string, name: string) => void;
  moveFolder: (id: string, newParentId: string | null) => void;
  toggleFolder: (id: string) => void;
  moveCompToFolder: (compId: string, folderId: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: { ...DEFAULT_PROJECT, id: genId(), folders: [] },
  dirty: false,
  fileHandle: null,

  setProject: (project) => set({ project: { ...project, folders: project.folders ?? [] }, dirty: true }),
  setDirty: (dirty) => set({ dirty }),
  setFileHandle: (handle) => set({ fileHandle: handle }),

  addAsset: (asset) => {
    const snapshot = captureSnapshot();
    set((s) => ({
      project: { ...s.project, assets: [...s.project.assets, asset], modified: Date.now() },
      dirty: true,
    }));
    pushHistory('Add Asset', snapshot);
  },

  removeAsset: (assetId) => {
    const snapshot = captureSnapshot();
    set((s) => ({
      project: { ...s.project, assets: s.project.assets.filter(a => a.id !== assetId), modified: Date.now() },
      dirty: true,
    }));
    pushHistory('Remove Asset', snapshot);
  },

  updateAsset: (assetId, data) => {
    const snapshot = captureSnapshot();
    set((s) => ({
      project: {
        ...s.project,
        assets: s.project.assets.map(a => a.id === assetId ? { ...a, ...data, modified: Date.now() } : a),
        modified: Date.now(),
      },
      dirty: true,
    }));
    pushHistory('Update Asset', snapshot);
  },

  renameAsset: (assetId, newName) => {
    const snapshot = captureSnapshot();
    set((s) => ({
      project: {
        ...s.project,
        assets: s.project.assets.map(a => a.id === assetId ? { ...a, name: newName } : a),
        modified: Date.now(),
      },
      dirty: true,
    }));
    pushHistory('Rename Asset', snapshot);
  },

  moveAssetToFolder: (assetId, folderId) => {
    const snapshot = captureSnapshot();
    set((s) => ({
      project: {
        ...s.project,
        assets: s.project.assets.map(a => a.id === assetId ? { ...a, folderId } : a),
        modified: Date.now(),
      },
      dirty: true,
    }));
    pushHistory('Move Asset', snapshot);
  },

  updateSettings: (settings) => {
    const snapshot = captureSnapshot();
    set((s) => ({
      project: { ...s.project, settings: { ...s.project.settings, ...settings }, modified: Date.now() },
      dirty: true,
    }));
    pushHistory('Update Project Settings', snapshot);
  },

  newProject: () => set({
    project: {
      ...DEFAULT_PROJECT,
      id: genId(),
      folders: [],
      name: '',   // Empty so first-save modal starts with a blank field
    },
    dirty: false,
    fileHandle: null,
  }),

  // ── Folder CRUD ────────────────────────────────────────────
  addFolder: (name, parentId = null) => {
    const snapshot = captureSnapshot();
    const folder: ProjectFolder = {
      id: genId('folder'),
      name,
      parentId,
      expanded: true,
      createdAt: Date.now(),
    };
    set((s) => ({
      project: {
        ...s.project,
        folders: [...(s.project.folders ?? []), folder],
        modified: Date.now(),
      },
      dirty: true,
    }));
    pushHistory('Add Folder', snapshot);
    return folder;
  },

  removeFolder: (id) => {
    const snapshot = captureSnapshot();
    // Cascade: unassign all children (both sub-folders and assets/comps) up to root.
    set((s) => {
      const folders = s.project.folders ?? [];
      const toRemove = new Set<string>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const f of folders) {
          if (f.parentId && toRemove.has(f.parentId) && !toRemove.has(f.id)) {
            toRemove.add(f.id);
            changed = true;
          }
        }
      }
      const newFolders = folders.filter(f => !toRemove.has(f.id));
      const newAssets = s.project.assets.map(a =>
        a.folderId && toRemove.has(a.folderId) ? { ...a, folderId: null } : a,
      );
      return {
        project: { ...s.project, folders: newFolders, assets: newAssets, modified: Date.now() },
        dirty: true,
      };
    });
    // Also unassign compositions
    import('./compositionStore').then(({ useCompositionStore }) => {
      const cs = useCompositionStore.getState();
      for (const c of cs.compositions) {
        if (c.folderId && c.folderId === id) {
          cs.updateComposition(c.id, { folderId: null } as any);
        }
      }
    });
    pushHistory('Remove Folder', snapshot);
  },

  renameFolder: (id, name) => {
    const snapshot = captureSnapshot();
    set((s) => ({
      project: {
        ...s.project,
        folders: (s.project.folders ?? []).map(f => f.id === id ? { ...f, name } : f),
        modified: Date.now(),
      },
      dirty: true,
    }));
    pushHistory('Rename Folder', snapshot);
  },

  moveFolder: (id, newParentId) => {
    // Guard: don't allow a folder to become descendant of itself.
    const folders = get().project.folders ?? [];
    let cur: string | null = newParentId;
    while (cur) {
      if (cur === id) return; // cycle
      cur = folders.find(f => f.id === cur)?.parentId ?? null;
    }
    const snapshot = captureSnapshot();
    set((s) => ({
      project: {
        ...s.project,
        folders: (s.project.folders ?? []).map(f => f.id === id ? { ...f, parentId: newParentId } : f),
        modified: Date.now(),
      },
      dirty: true,
    }));
    pushHistory('Move Folder', snapshot);
  },

  // Note: NOT undoable — expanded/collapsed is UI state, not project data
  toggleFolder: (id) => set((s) => ({
    project: {
      ...s.project,
      folders: (s.project.folders ?? []).map(f =>
        f.id === id ? { ...f, expanded: !(f.expanded ?? true) } : f,
      ),
    },
  })),

  moveCompToFolder: (compId, folderId) => {
    // compositionStore.updateComposition already captures history for us
    import('./compositionStore').then(({ useCompositionStore }) => {
      useCompositionStore.getState().updateComposition(compId, { folderId } as any);
    });
    set((s) => ({ ...s, dirty: true }));
  },
}));