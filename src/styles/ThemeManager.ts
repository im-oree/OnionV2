/**
 * ThemeManager — runtime-swappable theme engine.
 * Each theme is a set of CSS variable overrides applied to :root.
 * Themes apply instantly — no reload needed.
 */
export interface ThemeVars { [key: string]: string; }

export interface ThemeDefinition {
  id: string;
  name: string;
  type: 'built-in' | 'custom';
  vars: ThemeVars;
}

const STORAGE_KEY = 'onion_active_theme';
const CUSTOM_THEMES_KEY = 'onion_custom_themes';

/** Only these variable prefixes are saved when exporting a custom theme */
const THEME_PREFIXES = ['--color-', '--timeline-', '--viewport-', '--radius-', '--size-', '--font-', '--shadow-', '--label-', '--accent-'];

const BUILT_IN_THEMES: ThemeDefinition[] = [
  { id: 'dark', name: 'Dark', type: 'built-in', vars: {} },
  { id: 'darker', name: 'Darker', type: 'built-in', vars: {} },
  { id: 'blender-classic', name: 'Blender Classic', type: 'built-in', vars: {} },
  { id: 'light', name: 'Light', type: 'built-in', vars: {} },
  { id: 'high-contrast', name: 'High Contrast', type: 'built-in', vars: {} },
];

class ThemeManagerClass {
  private _currentThemeId = 'dark';
  private _customThemes: ThemeDefinition[] = [];
  private _previewEl: HTMLStyleElement | null = null;

  constructor() { this._loadPersisted(); }

  get currentThemeId(): string { return this._currentThemeId; }
  get currentTheme(): ThemeDefinition {
    return this._getTheme(this._currentThemeId) ?? BUILT_IN_THEMES[0];
  }
  getThemes(): ThemeDefinition[] { return [...BUILT_IN_THEMES, ...this._customThemes]; }
  getTheme(id: string): ThemeDefinition | undefined { return this._getTheme(id); }

  private _getTheme(id: string): ThemeDefinition | undefined {
    return BUILT_IN_THEMES.find((t) => t.id === id) ?? this._customThemes.find((t) => t.id === id);
  }

  loadTheme(id: string): void {
    const theme = this._getTheme(id);
    if (!theme) return;
    this._currentThemeId = id;
    document.documentElement.setAttribute('data-theme', id);
    if (theme.vars && Object.keys(theme.vars).length > 0) {
      this._applyVars(theme.vars);
    } else {
      this._clearPreview();
    }
    this._persist();
  }

  previewTheme(vars: ThemeVars): void { this._applyVars(vars); }
  clearPreview(): void { this.loadTheme(this._currentThemeId); }

  importCustomTheme(json: string): ThemeDefinition | null {
    try {
      const data = JSON.parse(json);
      if (!data.id || !data.name || !data.vars) return null;
      const theme: ThemeDefinition = { id: data.id, name: data.name, type: 'custom', vars: data.vars };
      this._customThemes = this._customThemes.filter((t) => t.id !== theme.id);
      this._customThemes.push(theme);
      this._saveCustomThemes();
      return theme;
    } catch { return null; }
  }

  exportCurrentTheme(): string {
    return JSON.stringify(this.currentTheme, null, 2);
  }

  saveAsCustomTheme(id: string, name: string): ThemeDefinition {
    const vars = this._readThemeVars();
    const theme: ThemeDefinition = { id, name, type: 'custom', vars };
    this._customThemes = this._customThemes.filter((t) => t.id !== id);
    this._customThemes.push(theme);
    this._saveCustomThemes();
    return theme;
  }

  deleteCustomTheme(id: string): void {
    this._customThemes = this._customThemes.filter((t) => t.id !== id);
    this._saveCustomThemes();
    if (this._currentThemeId === id) this.loadTheme('dark');
  }

  private _applyVars(vars: ThemeVars): void {
    if (!this._previewEl) {
      this._previewEl = document.createElement('style');
      this._previewEl.id = 'theme-preview-override';
      document.head.appendChild(this._previewEl);
    }
    let css = ':root {\n';
    for (const [key, val] of Object.entries(vars)) css += `  ${key}: ${val};\n`;
    css += '}';
    this._previewEl.textContent = css;
  }

  private _clearPreview(): void {
    if (this._previewEl) { this._previewEl.remove(); this._previewEl = null; }
  }

  /** Only read theme-relevant CSS variables, not all 300+ browser-computed vars */
  private _readThemeVars(): ThemeVars {
    const vars: ThemeVars = {};
    const style = getComputedStyle(document.documentElement);
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      if (THEME_PREFIXES.some((p) => prop.startsWith(p))) {
        vars[prop] = style.getPropertyValue(prop).trim();
      }
    }
    return vars;
  }

  private _persist(): void {
    try { localStorage.setItem(STORAGE_KEY, this._currentThemeId); } catch { }
  }

  private _loadPersisted(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && this._getTheme(saved)) {
        this._currentThemeId = saved;
        document.documentElement.setAttribute('data-theme', saved);
      }
      const custom = localStorage.getItem(CUSTOM_THEMES_KEY);
      if (custom) this._customThemes = JSON.parse(custom);
    } catch { }
  }

  private _saveCustomThemes(): void {
    try { localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(this._customThemes)); } catch { }
  }
}

export const themeManager = new ThemeManagerClass();
