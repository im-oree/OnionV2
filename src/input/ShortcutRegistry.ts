/**
 * ShortcutRegistry — stores all keyboard shortcut bindings.
 * Shortcuts can be added/removed and are checked by KeyboardManager.
 * Supports context-based activation (e.g., only fire when viewport is focused).
 *
 * K1: Uses lazy import to check ModalTransform.activeAnywhere — when a modal
 * transform is active (G/R/S), global shortcuts like 'X' for delete are suspended
 * so the modal transform's own key handlers work without conflict.
 */

// Lazy reference to avoid circular imports
let _getModalActive: (() => boolean) | null = null;
function getModalActive(): boolean {
  return _getModalActive ? _getModalActive() : false;
}

export function registerModalActiveCheck(fn: () => boolean): void {
  _getModalActive = fn;
}

export interface ShortcutBinding {
  id: string;
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  /** Context in which this shortcut is active (e.g. 'viewport', 'timeline', 'global') */
  context?: string;
  handler: () => void;
  /** Whether this shortcut can be remapped */
  remappable: boolean;
}

type ShortcutMap = Map<string, ShortcutBinding[]>;

class ShortcutRegistryClass {
  private shortcuts: ShortcutMap = new Map();
  private activeContext = 'global';

  /**
   * Register a keyboard shortcut.
   * Key format: combination of modifiers + key, e.g. 'ctrl+z', 'n', 'ctrl+shift+z'
   */
  register(binding: ShortcutBinding): void {
    const key = this.buildKey(binding);
    const existing = this.shortcuts.get(key) ?? [];
    existing.push(binding);
    this.shortcuts.set(key, existing);
  }

  /** Remove a shortcut by its ID */
  unregister(id: string): void {
    for (const [key, bindings] of this.shortcuts.entries()) {
      const filtered = bindings.filter((b) => b.id !== id);
      if (filtered.length === 0) {
        this.shortcuts.delete(key);
      } else {
        this.shortcuts.set(key, filtered);
      }
    }
  }

  /** Set the active context (e.g., 'viewport', 'timeline', 'global') */
  setActiveContext(context: string): void {
    this.activeContext = context;
  }

  /** Match a keyboard event against registered shortcuts and execute the handler */
  handleEvent(e: KeyboardEvent): boolean {
    // Don't fire when typing in input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return false;
    }

    // K1: Skip ALL global shortcuts while a modal transform is active
    // The modal transform's own docKeydown handler in useViewportInput handles X/Y/Esc/Enter/numbers
    if (getModalActive()) {
      return false;
    }

    const key = this.buildKeyFromEvent(e);
    const bindings = this.shortcuts.get(key);
    if (!bindings || bindings.length === 0) return false;

    // Find the first matching binding for the current context
    for (const binding of bindings) {
      if (!binding.context || binding.context === 'global' || binding.context === this.activeContext) {
        e.preventDefault();
        binding.handler();
        return true;
      }
    }
    return false;
  }

  /** Clear all shortcuts */
  clear(): void {
    this.shortcuts.clear();
  }

  private buildKey(b: ShortcutBinding): string {
    const parts: string[] = [];
    if (b.ctrl) parts.push('ctrl');
    if (b.shift) parts.push('shift');
    if (b.alt) parts.push('alt');
    if (b.meta) parts.push('meta');
    parts.push(b.key.toLowerCase());
    return parts.join('+');
  }

  private buildKeyFromEvent(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    parts.push(e.key.toLowerCase());
    return parts.join('+');
  }
}

export const shortcutRegistry = new ShortcutRegistryClass();
