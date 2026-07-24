/**
 * lutStore — manages loaded LUTs available to any layer's Adjust panel.
 * LUT files are stored inside the current workspace under Media/luts/
 * so they survive across sessions and can be shared between projects.
 */
import { create } from 'zustand';
import * as THREE from 'three';
import type { ParsedLUT } from './lutParser';
import { parseCubeLUT, parseCubeLUTFromFile } from './lutParser';
import { StorageManager } from '../../storage/StorageManager';
import { useNotificationStore } from '../../state/notificationStore';

const LUT_STORAGE_DIR = 'Media/luts';

export interface LUTEntry {
  /** Stable identifier — filename without extension */
  id: string;
  /** Human display name */
  name: string;
  /** LUT size (17, 33, 65, etc.) */
  size: number;
  /** Original .cube text (kept for re-serialization / export) */
  sourceText?: string;
  /** GPU texture (lazily created on first use) */
  texture: THREE.Data3DTexture | null;
  /** Built-in vs user-imported */
  builtin: boolean;
}

interface LUTStore {
  luts: LUTEntry[];
  /** Runtime revision — bumps on any add/remove for React re-renders */
  revision: number;
  /** Register a parsed LUT (creates the GPU texture on demand). */
  registerLUT: (entry: Omit<LUTEntry, 'texture'>) => LUTEntry;
  /** Import a user-provided .cube file. Persists to workspace. */
  importLUTFile: (file: File) => Promise<LUTEntry | null>;
  /** Remove a LUT (user-imported only). */
  removeLUT: (id: string) => Promise<void>;
  /** Get a LUT by id + ensure its GPU texture exists. */
  getTexture: (id: string) => THREE.Data3DTexture | null;
  /** Load all LUTs previously imported into this workspace. */
  loadFromWorkspace: () => Promise<number>;
  /** Get the LUT entry (without triggering texture creation). */
  getEntry: (id: string) => LUTEntry | undefined;
}

function makeTexture(parsed: ParsedLUT): THREE.Data3DTexture {
  const tex = new THREE.Data3DTexture(parsed.data, parsed.size, parsed.size, parsed.size);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.wrapR = THREE.ClampToEdgeWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

function sanitizeId(filename: string): string {
  return filename
    .replace(/\.(cube|CUBE|txt)$/i, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '_')
    .trim()
    .slice(0, 80);
}

/** Built-in identity LUT as a fallback */
function buildIdentityLUT(size: number = 17): ParsedLUT {
  const data = new Uint8Array(size * size * size * 4);
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const idx = (r + g * size + b * size * size) * 4;
        data[idx + 0] = Math.round((r / (size - 1)) * 255);
        data[idx + 1] = Math.round((g / (size - 1)) * 255);
        data[idx + 2] = Math.round((b / (size - 1)) * 255);
        data[idx + 3] = 255;
      }
    }
  }
  return { size, data, domainMin: [0,0,0], domainMax: [1,1,1] };
}

export const useLUTStore = create<LUTStore>((set, get) => ({
  luts: [
    {
      id: '__identity',
      name: 'None (Identity)',
      size: 17,
      texture: null,
      builtin: true,
    },
  ],
  revision: 0,

  registerLUT: (entry) => {
    const full: LUTEntry = { ...entry, texture: null };
    set(s => ({
      luts: [...s.luts.filter(l => l.id !== full.id), full],
      revision: s.revision + 1,
    }));
    return full;
  },

  importLUTFile: async (file) => {
    try {
      const parsed = await parseCubeLUTFromFile(file);
      const id = sanitizeId(file.name);
      if (!id) throw new Error('Invalid file name');
      const text = await file.text();
      const entry: LUTEntry = {
        id,
        name: parsed.title ?? id,
        size: parsed.size,
        sourceText: text,
        texture: makeTexture(parsed),
        builtin: false,
      };
      set(s => ({
        luts: [...s.luts.filter(l => l.id !== id), entry],
        revision: s.revision + 1,
      }));
      // Persist to workspace
      try {
        const adapter: any = StorageManager.getInstance().getAdapter();
        if (adapter?.saveInternalFile) {
          const blob = new Blob([text], { type: 'text/plain' });
          await adapter.saveInternalFile(`${LUT_STORAGE_DIR}/${id}.cube`, blob);
        }
      } catch (err) {
        console.warn('[LUT] Failed to persist LUT to workspace:', err);
      }
      useNotificationStore.getState().addNotification({
        type: 'success', message: `Imported LUT "${entry.name}"`, autoDismiss: 2500,
      });
      return entry;
    } catch (err: any) {
      useNotificationStore.getState().addNotification({
        type: 'error', message: `LUT import failed: ${err?.message ?? 'Unknown error'}`,
      });
      return null;
    }
  },

  removeLUT: async (id) => {
    const entry = get().luts.find(l => l.id === id);
    if (!entry || entry.builtin) return;
    // Dispose GPU texture
    if (entry.texture) {
      try { entry.texture.dispose(); } catch {}
    }
    set(s => ({
      luts: s.luts.filter(l => l.id !== id),
      revision: s.revision + 1,
    }));
    // Delete from workspace
    try {
      const adapter: any = StorageManager.getInstance().getAdapter();
      if (adapter?.deleteInternalFile) {
        await adapter.deleteInternalFile(`${LUT_STORAGE_DIR}/${id}.cube`);
      }
    } catch {}
  },

  getTexture: (id) => {
    const entry = get().luts.find(l => l.id === id);
    if (!entry) return null;
    if (entry.id === '__identity') {
      if (!entry.texture) {
        entry.texture = makeTexture(buildIdentityLUT(17));
      }
      return entry.texture;
    }
    if (entry.texture) return entry.texture;
    // Recreate from source text if available
    if (entry.sourceText) {
      try {
        const parsed = parseCubeLUT(entry.sourceText);
        entry.texture = makeTexture(parsed);
        return entry.texture;
      } catch {
        return null;
      }
    }
    return null;
  },

  getEntry: (id) => get().luts.find(l => l.id === id),

  loadFromWorkspace: async () => {
    let count = 0;
    try {
      const adapter: any = StorageManager.getInstance().getAdapter();
      if (!adapter?.loadInternalFile) return 0;
      // Attempt to list — not all adapters support directory listing
      const listFn = adapter.listInternalDirectory;
      if (typeof listFn !== 'function') return 0;
      const files: string[] = await listFn.call(adapter, LUT_STORAGE_DIR).catch(() => []);
      for (const filename of files) {
        if (!/\.cube$/i.test(filename)) continue;
        try {
          const blob: Blob | null = await adapter.loadInternalFile(`${LUT_STORAGE_DIR}/${filename}`);
          if (!blob) continue;
          const text = await blob.text();
          const parsed = parseCubeLUT(text);
          const id = sanitizeId(filename);
          const entry: LUTEntry = {
            id, name: parsed.title ?? id,
            size: parsed.size,
            sourceText: text,
            texture: null,      // lazy — created on first use
            builtin: false,
          };
          set(s => ({
            luts: [...s.luts.filter(l => l.id !== id), entry],
            revision: s.revision + 1,
          }));
          count++;
        } catch (err) {
          console.warn(`[LUT] Failed to load ${filename}:`, err);
        }
      }
    } catch (err) {
      console.warn('[LUT] loadFromWorkspace failed:', err);
    }
    return count;
  },
}));