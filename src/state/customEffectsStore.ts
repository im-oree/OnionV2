/**
 * customEffectsStore — Zustand store for user-created effects.
 *
 * Handles CRUD, workspace persistence, import/export as .onionfx files,
 * and delegating registration into the runtime effect registries.
 */
import { create } from 'zustand';
import type { CustomEffectDefinition, OnionFxFile } from '../types/customEffect';
import {
  CUSTOM_EFFECT_ID_PREFIX,
  CUSTOM_EFFECT_FORMAT_VERSION,
  CUSTOM_EFFECT_STORAGE_DIR,
  makeDefaultCustomEffect,
} from '../types/customEffect';
import { StorageManager } from '../storage/StorageManager';
import { useNotificationStore } from './notificationStore';
import {
  registerCustomEffect,
  unregisterCustomEffect,
  reregisterCustomEffect,
} from '../renderer/effects/customEffectAdapter';

interface CustomEffectsState {
  effects: CustomEffectDefinition[];
  /** Effects that failed to load — kept for user visibility. */
  brokenIds: string[];
  /** Non-zero signals CustomEffectPanel to open the gallery dialog. */
  showGalleryRequest: number;

  requestGallery: () => void;
  create: (name?: string) => CustomEffectDefinition;
  createFromTemplate: (template: Omit<CustomEffectDefinition, 'id' | 'created' | 'modified'>) => CustomEffectDefinition;
  update: (id: string, patch: Partial<CustomEffectDefinition>) => { ok: boolean; error?: string };
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => CustomEffectDefinition | null;
  getById: (id: string) => CustomEffectDefinition | undefined;

  importFromFile: (file: File) => Promise<CustomEffectDefinition | null>;
  exportToFile: (id: string) => Promise<void>;

  loadAllFromWorkspace: () => Promise<number>;
  saveOne: (def: CustomEffectDefinition) => Promise<boolean>;
}

function genIdSuffix(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function filePath(id: string): string {
  return `${CUSTOM_EFFECT_STORAGE_DIR}/${id}.json`;
}

export const useCustomEffectsStore = create<CustomEffectsState>((set, get) => ({
  effects: [],
  brokenIds: [],
  showGalleryRequest: 0,

  create: (name = 'New Custom Effect') => {
    const def = makeDefaultCustomEffect(genIdSuffix(), name);
    set(s => ({ effects: [...s.effects, def] }));
    // Register runtime immediately so it appears in the library.
    const r = registerCustomEffect(def);
    if (!r.ok) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        message: `Effect registered with default shader (edit to customize): ${r.error}`,
        autoDismiss: 4000,
      });
    }
    void get().saveOne(def);
    return def;
  },

  createFromTemplate: (template) => {
    const now = Date.now();
    const def: CustomEffectDefinition = {
      ...template,
      id: `${CUSTOM_EFFECT_ID_PREFIX}${genIdSuffix()}`,
      created: now,
      modified: now,
      version: 1,
    };
    set(s => ({ effects: [...s.effects, def] }));
    const r = registerCustomEffect(def);
    if (!r.ok) {
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: `Failed to register example: ${r.error}`,
      });
    } else {
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: `Installed "${def.displayName}"`,
        autoDismiss: 2500,
      });
    }
    void get().saveOne(def);
    return def;
  },

  update: (id, patch) => {
    const existing = get().effects.find(e => e.id === id);
    if (!existing) return { ok: false, error: 'Effect not found' };
    const merged: CustomEffectDefinition = {
      ...existing,
      ...patch,
      id: existing.id, // never allow id changes
      modified: Date.now(),
      version: (existing.version ?? 1) + (patch.fragmentShader || patch.parameters ? 1 : 0),
    };
    const r = reregisterCustomEffect(merged);
    if (!r.ok) {
      // Roll back — keep the old registered module active
      return { ok: false, error: r.error };
    }
    set(s => ({ effects: s.effects.map(e => e.id === id ? merged : e) }));
    void get().saveOne(merged);
    return { ok: true };
  },

  remove: async (id) => {
    const existing = get().effects.find(e => e.id === id);
    if (!existing) return;
    unregisterCustomEffect(id);
    set(s => ({
      effects: s.effects.filter(e => e.id !== id),
      brokenIds: s.brokenIds.filter(b => b !== id),
    }));
    try {
      const adapter: any = StorageManager.getInstance().getAdapter();
      if (adapter?.deleteInternalFile) {
        await adapter.deleteInternalFile(filePath(id));
      }
    } catch (err) {
      console.warn('[customEffects] Failed to delete file for', id, err);
    }
    useNotificationStore.getState().addNotification({
      type: 'info',
      message: `Deleted "${existing.displayName}"`,
      autoDismiss: 2500,
    });
  },

  duplicate: (id) => {
    const existing = get().effects.find(e => e.id === id);
    if (!existing) return null;
    const copy: CustomEffectDefinition = {
      ...existing,
      id: `${CUSTOM_EFFECT_ID_PREFIX}${genIdSuffix()}`,
      displayName: `${existing.displayName} Copy`,
      created: Date.now(),
      modified: Date.now(),
      version: 1,
      parameters: existing.parameters.map(p => ({ ...p })),
    };
    set(s => ({ effects: [...s.effects, copy] }));
    registerCustomEffect(copy);
    void get().saveOne(copy);
    return copy;
  },

  getById: (id) => get().effects.find(e => e.id === id),

  requestGallery: () => set({ showGalleryRequest: Date.now() }),

  importFromFile: async (file) => {
    try {
      const text = await file.text();
      const parsed: OnionFxFile = JSON.parse(text);
      if (parsed?.format !== CUSTOM_EFFECT_FORMAT_VERSION) {
        throw new Error(`Unknown format: ${parsed?.format}`);
      }
      const def = parsed.definition;
      // Give it a fresh id to avoid collisions
      def.id = `${CUSTOM_EFFECT_ID_PREFIX}${genIdSuffix()}`;
      def.modified = Date.now();
      const r = registerCustomEffect(def);
      if (!r.ok) throw new Error(r.error);
      set(s => ({ effects: [...s.effects, def] }));
      await get().saveOne(def);
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: `Imported "${def.displayName}"`,
        autoDismiss: 3000,
      });
      return def;
    } catch (err) {
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: `Import failed: ${(err as Error).message}`,
      });
      return null;
    }
  },

  exportToFile: async (id) => {
    const def = get().effects.find(e => e.id === id);
    if (!def) return;
    const payload: OnionFxFile = {
      format: CUSTOM_EFFECT_FORMAT_VERSION,
      definition: def,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${def.displayName.replace(/[^a-z0-9-_]+/gi, '_')}.onionfx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  saveOne: async (def) => {
    try {
      const adapter: any = StorageManager.getInstance().getAdapter();
      if (!adapter?.saveInternalFile) return false;
      const payload: OnionFxFile = {
        format: CUSTOM_EFFECT_FORMAT_VERSION,
        definition: def,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      await adapter.saveInternalFile(filePath(def.id), blob);
      return true;
    } catch (err) {
      console.warn('[customEffects] saveOne failed:', err);
      return false;
    }
  },

  loadAllFromWorkspace: async () => {
    let count = 0;
    try {
      const adapter: any = StorageManager.getInstance().getAdapter();
      if (!adapter?.loadInternalFile || !adapter?.listInternalDirectory) {
        // adapter doesn't support directory listing — skip silently
        return 0;
      }
      const files: string[] = await adapter.listInternalDirectory(CUSTOM_EFFECT_STORAGE_DIR);
      const loaded: CustomEffectDefinition[] = [];
      const broken: string[] = [];
      for (const filename of files) {
        if (!filename.endsWith('.json')) continue;
        try {
          const blob: Blob | null = await adapter.loadInternalFile(`${CUSTOM_EFFECT_STORAGE_DIR}/${filename}`);
          if (!blob) continue;
          const text = await blob.text();
          const parsed: OnionFxFile = JSON.parse(text);
          if (parsed?.format !== CUSTOM_EFFECT_FORMAT_VERSION) throw new Error('Wrong format');
          const def = parsed.definition;
          const r = registerCustomEffect(def);
          if (!r.ok) {
            console.warn(`[customEffects] Register failed for ${def.id}:`, r.error);
            broken.push(def.id);
            continue;
          }
          loaded.push(def);
          count++;
        } catch (err) {
          console.warn(`[customEffects] Failed to load ${filename}:`, err);
        }
      }
      set({ effects: loaded, brokenIds: broken });
    } catch (err) {
      console.warn('[customEffects] loadAllFromWorkspace failed:', err);
    }
    return count;
  },
}));