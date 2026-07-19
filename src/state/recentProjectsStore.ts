/**
 * recentProjectsStore — manages recent project history (up to 20 entries).
 * Persisted via IndexedDB metadata store.
 */
import { create } from 'zustand';
import type { ProjectHandle } from '../storage/StorageAdapter';

export interface RecentProjectEntry {
  id: string;
  name: string;
  lastOpened: string; // ISO timestamp
  handle: ProjectHandle;
  thumbnail?: string; // data URL
}

interface RecentProjectsState {
  projects: RecentProjectEntry[];
  addProject: (project: RecentProjectEntry) => void;
  removeProject: (id: string) => void;
  clearAll: () => void;
  getTop: (count: number) => RecentProjectEntry[];
  persist: () => Promise<void>;
  loadPersisted: () => Promise<void>;
}

const RECENT_KEY = 'recent_projects';
const MAX_RECENT = 20;

function openMetaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('OnionProjects', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const useRecentProjectsStore = create<RecentProjectsState>((set, get) => ({
  projects: [],

  addProject: (entry) => {
    set((s) => {
      const filtered = s.projects.filter((p) => p.id !== entry.id);
      return {
        projects: [entry, ...filtered].slice(0, MAX_RECENT),
      };
    });
    get().persist();
  },

  removeProject: (id) => {
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
    }));
    get().persist();
  },

  clearAll: () => {
    set({ projects: [] });
    get().persist();
  },

  getTop: (count) => {
    return get().projects.slice(0, count);
  },

  persist: async () => {
    try {
      const db = await openMetaDB();
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      store.put({ key: RECENT_KEY, value: get().projects });
    } catch {
      // Silently fail — recent projects aren't critical
    }
  },

  loadPersisted: async () => {
    try {
      const db = await openMetaDB();
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const req = store.get(RECENT_KEY);
      req.onsuccess = () => {
        if (req.result?.value) {
          set({ projects: req.result.value });
        }
      };
    } catch {
      // Silently fail
    }
  },
}));
