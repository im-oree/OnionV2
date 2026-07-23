import { create } from 'zustand';
import type { Project, ProjectAsset, ProjectFolder } from '../types/project';
import { DEFAULT_PROJECT } from '../config/defaults';

function genId(prefix = 'proj'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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

  addAsset: (asset) => set((s) => ({
    project: { ...s.project, assets: [...s.project.assets, asset], modified: Date.now() },
    dirty: true,
  })),

  removeAsset: (assetId) => set((s) => ({
    project: { ...s.project, assets: s.project.assets.filter(a => a.id !== assetId), modified: Date.now() },
    dirty: true,
  })),

  updateAsset: (assetId, data) => set((s) => ({
    project: {
      ...s.project,
      assets: s.project.assets.map(a => a.id === assetId ? { ...a, ...data, modified: Date.now() } : a),
      modified: Date.now(),
    },
    dirty: true,
  })),

  renameAsset: (assetId, newName) => set((s) => ({
    project: {
      ...s.project,
      assets: s.project.assets.map(a => a.id === assetId ? { ...a, name: newName } : a),
      modified: Date.now(),
    },
    dirty: true,
  })),

  moveAssetToFolder: (assetId, folderId) => set((s) => ({
    project: {
      ...s.project,
      assets: s.project.assets.map(a => a.id === assetId ? { ...a, folderId } : a),
      modified: Date.now(),
    },
    dirty: true,
  })),

  updateSettings: (settings) => set((s) => ({
    project: { ...s.project, settings: { ...s.project.settings, ...settings }, modified: Date.now() },
    dirty: true,
  })),

  newProject: () => set({
    project: { ...DEFAULT_PROJECT, id: genId(), folders: [] },
    dirty: false,
    fileHandle: null,
  }),

  // ── Folder CRUD ────────────────────────────────────────────
  addFolder: (name, parentId = null) => {
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
    return folder;
  },

  removeFolder: (id) => {
    // Cascade: unassign all children (both sub-folders and assets/comps) up to root.
    set((s) => {
      const folders = s.project.folders ?? [];
      const toRemove = new Set<string>([id]);
      // Depth-first: find all descendants
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
  },

  renameFolder: (id, name) => set((s) => ({
    project: {
      ...s.project,
      folders: (s.project.folders ?? []).map(f => f.id === id ? { ...f, name } : f),
      modified: Date.now(),
    },
    dirty: true,
  })),

  moveFolder: (id, newParentId) => {
    // Guard: don't allow a folder to become descendant of itself.
    const folders = get().project.folders ?? [];
    let cur: string | null = newParentId;
    while (cur) {
      if (cur === id) return; // cycle
      cur = folders.find(f => f.id === cur)?.parentId ?? null;
    }
    set((s) => ({
      project: {
        ...s.project,
        folders: (s.project.folders ?? []).map(f => f.id === id ? { ...f, parentId: newParentId } : f),
        modified: Date.now(),
      },
      dirty: true,
    }));
  },

  toggleFolder: (id) => set((s) => ({
    project: {
      ...s.project,
      folders: (s.project.folders ?? []).map(f =>
        f.id === id ? { ...f, expanded: !(f.expanded ?? true) } : f,
      ),
    },
  })),

  moveCompToFolder: (compId, folderId) => {
    import('./compositionStore').then(({ useCompositionStore }) => {
      useCompositionStore.getState().updateComposition(compId, { folderId } as any);
    });
    set((s) => ({ ...s, dirty: true }));
  },
}));
