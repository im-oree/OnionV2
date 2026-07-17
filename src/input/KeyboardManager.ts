/**
 * KeyboardManager — listens to global keydown events and delegates
 * matching shortcuts to the ShortcutRegistry.
 * Must be mounted once at the app root.
 */
import { useEffect } from 'react';
import { shortcutRegistry } from './ShortcutRegistry';

/**
 * Hook that mounts the global keyboard listener.
 * Place once in App.tsx.
 */
export function useKeyboardManager(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      shortcutRegistry.handleEvent(e);
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}

/**
 * Initialize all Phase 1 test shortcuts.
 * Called once during app startup.
 */
export function registerPhase1Shortcuts(): void {
  // N to toggle right panel visibility
  shortcutRegistry.register({
    id: 'ui.toggleSidePanel',
    key: 'n',
    context: 'global',
    handler: () => {
      import('../state/uiStore').then(({ useUIStore }) => {
        const s = useUIStore.getState();
        const newWidth = s.rightPanelWidth > 10 ? 0 : 320;
        s.setRightPanelWidth(newWidth);
        console.log('[Shortcut] N pressed — right panel', newWidth > 0 ? 'shown' : 'hidden');
      });
    },
    remappable: true,
  });

  // Ctrl+Z for undo (stub)
  shortcutRegistry.register({
    id: 'edit.undo',
    key: 'z',
    ctrl: true,
    context: 'global',
    handler: () => {
      console.log('[Shortcut] Ctrl+Z — undo');
    },
    remappable: true,
  });

  // Space for play/pause (stub)
  shortcutRegistry.register({
    id: 'playback.toggle',
    key: ' ',
    context: 'timeline',
    handler: () => {
      console.log('[Shortcut] Space — play/pause');
    },
    remappable: true,
  });

  // Ctrl+S for save (stub)
  shortcutRegistry.register({
    id: 'file.save',
    key: 's',
    ctrl: true,
    context: 'global',
    handler: () => {
      console.log('[Shortcut] Ctrl+S — save');
    },
    remappable: true,
  });

  // Delete for delete (stub)
  shortcutRegistry.register({
    id: 'edit.delete',
    key: 'Delete',
    context: 'global',
    handler: () => {
      console.log('[Shortcut] Delete — delete selection');
    },
    remappable: true,
  });
}
