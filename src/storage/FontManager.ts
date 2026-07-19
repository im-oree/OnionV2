/**
 * FontManager — handles custom font upload, persistence via IndexedDB,
 * and registration with the browser's FontFace API.
 * 
 * Users can upload .ttf, .otf, .woff, .woff2 font files which are stored
 * in IndexedDB and re-registered on app startup so they persist across sessions.
 */

export interface FontEntry {
  id: string;
  name: string;
  family: string;      // CSS font-family name (derived from file or user input)
  source: 'system' | 'custom';
  fileName: string;
  mimeType: string;
  data: ArrayBuffer;    // raw font binary
  loaded: boolean;      // whether registered with FontFace API
}

const DB_NAME = 'onion-fonts';
const DB_VERSION = 1;
const STORE_NAME = 'fonts';

class FontManager {
  private _fonts = new Map<string, FontEntry>();
  private _db: IDBDatabase | null = null;
  private _ready: Promise<void>;

  constructor() {
    this._ready = this._initDB();
  }

  /** Initialize IndexedDB and load persisted fonts */
  private async _initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        this._db = req.result;
        this._loadAll().then(resolve).catch(resolve);
      };
      req.onerror = () => {
        console.warn('[FontManager] IndexedDB unavailable — fonts won\'t persist');
        resolve();
      };
    });
  }

  /** Load all fonts from IndexedDB and register them */
  private async _loadAll(): Promise<void> {
    if (!this._db) return;
    return new Promise((resolve, reject) => {
      const tx = this._db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = async () => {
        const entries: FontEntry[] = req.result ?? [];
        for (const entry of entries) {
          this._fonts.set(entry.id, entry);
          await this._registerFont(entry);
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
  }

  /** Register a font with the browser's FontFace API */
  private async _registerFont(entry: FontEntry): Promise<void> {
    if (entry.loaded) return;
    try {
      const fontFace = new FontFace(entry.family, entry.data);
      await fontFace.load();
      document.fonts.add(fontFace);
      entry.loaded = true;
    } catch (err) {
      console.warn(`[FontManager] Failed to register font "${entry.family}":`, err);
    }
  }

  /** Wait for the manager to be ready */
  async ready(): Promise<void> {
    await this._ready;
  }

  /** Import a font file (accepts File objects from input[type=file]) */
  async importFont(file: File, familyName?: string): Promise<FontEntry> {
    await this._ready;

    const data = await file.arrayBuffer();
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const validExts = ['ttf', 'otf', 'woff', 'woff2'];
    if (!validExts.includes(ext)) {
      throw new Error(`Unsupported font format: .${ext}`);
    }

    // Derive family name from file name if not provided
    const family = familyName ?? file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();

    const id = `font_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const entry: FontEntry = {
      id,
      name: file.name,
      family,
      source: 'custom',
      fileName: file.name,
      mimeType: file.type || `font/${ext}`,
      data,
      loaded: false,
    };

    await this._registerFont(entry);
    this._fonts.set(id, entry);

    // Persist to IndexedDB
    await this._save(entry);

    return entry;
  }

  /** Save a font entry to IndexedDB */
  private async _save(entry: FontEntry): Promise<void> {
    if (!this._db) return;
    return new Promise((resolve, reject) => {
      const tx = this._db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // non-critical
    });
  }

  /** Delete a custom font */
  async removeFont(id: string): Promise<void> {
    const entry = this._fonts.get(id);
    if (!entry || entry.source !== 'custom') return;

    // Remove from FontFace API
    const faces = Array.from(document.fonts);
    const match = faces.find(f => f.family === entry.family);
    if (match) document.fonts.delete(match);

    this._fonts.delete(id);

    // Remove from IndexedDB
    if (this._db) {
      return new Promise((resolve) => {
        const tx = this._db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  }

  /** Get all available fonts (system + custom) */
  getFontFamilies(): string[] {
    const systemFonts = [
      'Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
      'Courier New', 'Verdana', 'Trebuchet MS', 'Impact',
      'Comic Sans MS', 'monospace', 'system-ui',
    ];
    const customFamilies = Array.from(this._fonts.values()).map(f => f.family);
    // Merge, dedupe, custom first
    return [...new Set([...customFamilies, ...systemFonts])];
  }

  /** Get all custom font entries */
  getCustomFonts(): FontEntry[] {
    return Array.from(this._fonts.values()).filter(f => f.source === 'custom');
  }

  /** Check if a font family is a custom (uploaded) font */
  isCustomFont(family: string): boolean {
    return Array.from(this._fonts.values()).some(f => f.family === family && f.source === 'custom');
  }
}

/** Singleton */
export const fontManager = new FontManager();
