/**
 * paletteActions — registers all app actions with the command palette store.
 * Called once at app startup.
 */
import { useCommandPaletteStore } from '../state/commandPaletteStore';
import { useCompositionStore } from '../state/compositionStore';
import { useHistoryStore } from '../state/historyStore';
import { animationClock } from '../ui/panels/timeline/PlaybackControls';
import { createLayerInstance } from '../utils/createLayerInstance';
import { useSelectionStore } from '../state/selectionStore';

export function registerPaletteActions(): void {
  const store = useCommandPaletteStore.getState();

  store.registerActions([
    // ── File ──
    { id: 'file.newComp', label: 'New Composition', category: 'File', shortcut: 'Ctrl+N', onClick: () => { useCompositionStore.getState().addComposition(); } },
    { id: 'file.save', label: 'Save Project', category: 'File', shortcut: 'Ctrl+S', onClick: () => document.dispatchEvent(new CustomEvent('app:save')) },
    { id: 'file.preferences', label: 'Preferences', category: 'File', shortcut: 'Ctrl+,', onClick: () => document.dispatchEvent(new CustomEvent('app:preferences')) },

    // ── Edit ──
    { id: 'edit.undo', label: 'Undo', category: 'Edit', shortcut: 'Ctrl+Z', onClick: () => { useHistoryStore.getState().undo(); } },
    { id: 'edit.redo', label: 'Redo', category: 'Edit', shortcut: 'Ctrl+Shift+Z', onClick: () => { useHistoryStore.getState().redo(); } },

    // ── Layer ──
    { id: 'layer.newSolid', label: 'New Solid Layer', category: 'Layer', shortcut: 'Ctrl+Y', onClick: () => {
      const cs = useCompositionStore.getState();
      if (cs.activeCompositionId) {
        const comp = cs.compositions.find(c => c.id === cs.activeCompositionId);
        if (comp) {
          const layer = createLayerInstance('solid', comp);
          cs.addLayer(cs.activeCompositionId, layer);
          useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: cs.activeCompositionId });
        }
      }
    } },
    { id: 'layer.newText', label: 'New Text Layer', category: 'Layer', shortcut: 'Ctrl+T', onClick: () => {
      const cs = useCompositionStore.getState();
      if (cs.activeCompositionId) {
        const comp = cs.compositions.find(c => c.id === cs.activeCompositionId);
        if (comp) {
          const layer = createLayerInstance('text', comp);
          cs.addLayer(cs.activeCompositionId, layer);
          useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: cs.activeCompositionId });
        }
      }
    } },

    // ── Animation ──
    { id: 'anim.play', label: 'Play / Pause', category: 'Animation', shortcut: 'Space', onClick: () => animationClock.togglePlay() },
    { id: 'anim.stop', label: 'Stop', category: 'Animation', shortcut: 'Shift+Space', onClick: () => animationClock.stop() },
    { id: 'anim.nextFrame', label: 'Next Frame', category: 'Animation', shortcut: 'PageDown', onClick: () => animationClock.stepForward() },
    { id: 'anim.prevFrame', label: 'Previous Frame', category: 'Animation', shortcut: 'PageUp', onClick: () => animationClock.stepBackward() },
    { id: 'anim.goToStart', label: 'Go to Start', category: 'Animation', shortcut: 'Home', onClick: () => animationClock.goToStart() },
    { id: 'anim.goToEnd', label: 'Go to End', category: 'Animation', shortcut: 'End', onClick: () => animationClock.goToEnd() },

    // ── View ──
    { id: 'view.fullscreen', label: 'Full Screen', category: 'View', shortcut: 'F11', onClick: () => {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen();
    } },
  ]);
}
