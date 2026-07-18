/**
 * KeyboardManager — listens to global keydown events and delegates
 * matching shortcuts to the ShortcutRegistry.
 */
import { useEffect } from 'react';
import { shortcutRegistry } from './ShortcutRegistry';
import { useToolStore } from '../state/toolStore';
import { useUIStore } from '../state/uiStore';
import { useViewportStore } from '../state/viewportStore';
import { useCompositionStore } from '../state/compositionStore';
import { useSelectionStore } from '../state/selectionStore';
import { createLayerInstance } from '../utils/createLayerInstance';
import type { Composition } from '../types/composition';

export function useKeyboardManager(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      shortcutRegistry.handleEvent(e);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}

function getCompWithCheck(): { compId: string; comp: Composition } | null {
  const compState = useCompositionStore.getState();
  const compId = compState.activeCompositionId;
  if (!compId) return null;
  const comp = compState.compositions.find((c) => c.id === compId);
  if (!comp) return null;
  return { compId, comp };
}

function genLayerId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function duplicateSelected(): void {
  const ctx = getCompWithCheck();
  if (!ctx) return;
  const selectedIds = useSelectionStore.getState().getSelectedIds();
  for (const id of selectedIds) {
    const orig = ctx.comp.layers.find((l: any) => l.id === id);
    if (orig) {
      const dup = { ...JSON.parse(JSON.stringify(orig)), id: genLayerId(), name: `${orig.name} (copy)`, zIndex: ctx.comp.layers.length + 1 };
      useCompositionStore.getState().addLayer(ctx.compId, dup);
    }
  }
}

function deleteSelected(): void {
  const ctx = getCompWithCheck();
  if (!ctx) return;
  const selectedIds = useSelectionStore.getState().getSelectedIds();
  for (const id of selectedIds) useCompositionStore.getState().removeLayer(ctx.compId, id);
  useSelectionStore.getState().clearSelection();
}

/**
 * Register all shortcuts once during app startup.
 */
export function registerAllShortcuts(): void {
  // ── Tool switching shortcuts ────────────────────────────
  shortcutRegistry.register({ id: 'tool.select', key: 'v', context: 'global', handler: () => useToolStore.getState().setActiveTool('select'), remappable: true });
  shortcutRegistry.register({ id: 'tool.hand', key: 'h', context: 'global', handler: () => useToolStore.getState().setActiveTool('hand'), remappable: true });
  shortcutRegistry.register({ id: 'tool.zoom', key: 'z', context: 'global', handler: () => useToolStore.getState().setActiveTool('zoom'), remappable: true });
  shortcutRegistry.register({ id: 'tool.rect', key: 'r', shift: true, context: 'global', handler: () => useToolStore.getState().setActiveTool('shapeRect'), remappable: true });
  shortcutRegistry.register({ id: 'tool.ellipse', key: 'e', shift: true, context: 'global', handler: () => useToolStore.getState().setActiveTool('shapeEllipse'), remappable: true });
  shortcutRegistry.register({ id: 'tool.pen', key: 'p', context: 'global', handler: () => useToolStore.getState().setActiveTool('pen'), remappable: true });
  shortcutRegistry.register({ id: 'tool.text', key: 't', context: 'global', handler: () => useToolStore.getState().setActiveTool('text'), remappable: true });

  // ── Phase 1: UI toggles ───────────────────────────────
  shortcutRegistry.register({
    id: 'ui.toggleSidePanel', key: 'n', context: 'global',
    handler: () => {
      const s = useUIStore.getState();
      s.setRightPanelWidth(s.rightPanelWidth > 10 ? 0 : 320);
    }, remappable: true,
  });
  shortcutRegistry.register({ id: 'edit.undo', key: 'z', ctrl: true, context: 'global', handler: () => console.log('[Shortcut] Ctrl+Z'), remappable: true });
  shortcutRegistry.register({ id: 'edit.redo', key: 'z', ctrl: true, shift: true, context: 'global', handler: () => console.log('[Shortcut] Ctrl+Shift+Z'), remappable: true });
  // ── Phase 4: Playback shortcuts ──────────────────────────
  const togglePlayback = () => {
    import('../ui/panels/timeline/PlaybackControls').then((m) => {
      m.animationClock.togglePlay();
    });
  };
  shortcutRegistry.register({ id: 'playback.toggle', key: ' ', context: 'global', handler: togglePlayback, remappable: true });
  shortcutRegistry.register({ id: 'file.save', key: 's', ctrl: true, context: 'global', handler: () => console.log('[Shortcut] Ctrl+S'), remappable: true });

  // ── Phase 2: Viewport shortcuts ─────────────────────────
  shortcutRegistry.register({ id: 'viewport.fitToViewport', key: 'Home', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('viewport:frameAll')), remappable: true });
  shortcutRegistry.register({ id: 'viewport.toggleGrid', key: 'g', ctrl: true, context: 'global', handler: () => useViewportStore.getState().toggleGrid(), remappable: true });
  shortcutRegistry.register({ id: 'viewport.toggleRulers', key: 'r', ctrl: true, context: 'global', handler: () => useViewportStore.getState().toggleRulers(), remappable: true });
  shortcutRegistry.register({ id: 'viewport.toggleSnapping', key: 'Tab', shift: true, context: 'global', handler: () => useViewportStore.getState().toggleSnapping(), remappable: true });
  shortcutRegistry.register({ id: 'viewport.frameSelected', key: '.', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('viewport:frameSelected')), remappable: true });
  shortcutRegistry.register({ id: 'viewport.zoom100', key: '1', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('viewport:zoom100')), remappable: true });

  // ── Phase 3: Layer shortcuts ──────────────────────────
  // ── Phase 4: More playback shortcuts ─────────────────────
  shortcutRegistry.register({ id: 'playback.start', key: 'Home', context: 'global', handler: () => {
    import('../ui/panels/timeline/PlaybackControls').then((m) => m.animationClock.goToStart());
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.end', key: 'End', context: 'global', handler: () => {
    import('../ui/panels/timeline/PlaybackControls').then((m) => m.animationClock.goToEnd());
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.prevFrame', key: 'ArrowLeft', context: 'global', handler: () => {
    import('../ui/panels/timeline/PlaybackControls').then((m) => m.animationClock.stepBackward());
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.nextFrame', key: 'ArrowRight', context: 'global', handler: () => {
    import('../ui/panels/timeline/PlaybackControls').then((m) => m.animationClock.stepForward());
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.skipBack', key: 'ArrowLeft', shift: true, context: 'global', handler: () => {
    import('../ui/panels/timeline/PlaybackControls').then((m) => m.animationClock.jumpBackward(10));
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.skipForward', key: 'ArrowRight', shift: true, context: 'global', handler: () => {
    import('../ui/panels/timeline/PlaybackControls').then((m) => m.animationClock.jumpForward(10));
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.prevKeyframe', key: 'j', context: 'global', handler: () => {
    Promise.all([
      import('../state/keyframeStore'),
      import('../state/selectionStore'),
      import('../ui/panels/timeline/PlaybackControls'),
    ]).then(([kfStore, selStore, pc]) => {
      const sel = selStore.useSelectionStore.getState().getSelectedIds();
      if (sel.length > 0) {
        const kfs = kfStore.useKeyframeStore.getState().engine.getAllKeyframesForLayer(sel[0]);
        const prev = [...kfs].reverse().find((k: any) => k.time < pc.animationClock.currentFrame);
        if (prev) pc.animationClock.seekToFrame(prev.time);
      }
    });
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.nextKeyframe', key: 'k', context: 'global', handler: () => {
    Promise.all([
      import('../state/keyframeStore'),
      import('../state/selectionStore'),
      import('../ui/panels/timeline/PlaybackControls'),
    ]).then(([kfStore, selStore, pc]) => {
      const sel = selStore.useSelectionStore.getState().getSelectedIds();
      if (sel.length > 0) {
        const kfs = kfStore.useKeyframeStore.getState().engine.getAllKeyframesForLayer(sel[0]);
        const next = kfs.find((k: any) => k.time > pc.animationClock.currentFrame);
        if (next) pc.animationClock.seekToFrame(next.time);
      }
    });
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.workAreaStart', key: 'b', context: 'global', handler: () => {
    Promise.all([
      import('../state/compositionStore'),
      import('../ui/panels/timeline/PlaybackControls'),
    ]).then(([compStore, pc]) => {
      const compId = compStore.useCompositionStore.getState().activeCompositionId;
      if (compId) {
        const frame = pc.animationClock.currentFrame;
        const comp = compStore.useCompositionStore.getState().compositions.find((c: any) => c.id === compId);
        const fps = comp?.fps ?? 30;
        compStore.useCompositionStore.getState().updateComposition(compId, { workAreaStart: frame / fps });
      }
    });
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.workAreaEnd', key: 'n', context: 'global', handler: () => {
    Promise.all([
      import('../state/compositionStore'),
      import('../ui/panels/timeline/PlaybackControls'),
    ]).then(([compStore, pc]) => {
      const compId = compStore.useCompositionStore.getState().activeCompositionId;
      if (compId) {
        const frame = pc.animationClock.currentFrame;
        const comp = compStore.useCompositionStore.getState().compositions.find((c: any) => c.id === compId);
        const fps = comp?.fps ?? 30;
        compStore.useCompositionStore.getState().updateComposition(compId, { workAreaEnd: frame / fps });
      }
    });
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.setInPoint', key: 'i', context: 'global', handler: () => {
    Promise.all([
      import('../state/compositionStore'),
      import('../state/selectionStore'),
      import('../ui/panels/timeline/PlaybackControls'),
    ]).then(([compStore, selStore, pc]) => {
      const sel = selStore.useSelectionStore.getState().getSelectedIds();
      const compId = compStore.useCompositionStore.getState().activeCompositionId;
      const frame = pc.animationClock.currentFrame;
      if (compId && sel.length > 0) {
        for (const id of sel) {
          compStore.useCompositionStore.getState().updateLayer(compId, id, { startFrame: frame });
        }
      }
    });
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.setOutPoint', key: 'o', context: 'global', handler: () => {
    Promise.all([
      import('../state/compositionStore'),
      import('../state/selectionStore'),
      import('../ui/panels/timeline/PlaybackControls'),
    ]).then(([compStore, selStore, pc]) => {
      const sel = selStore.useSelectionStore.getState().getSelectedIds();
      const compId = compStore.useCompositionStore.getState().activeCompositionId;
      const frame = pc.animationClock.currentFrame;
      if (compId && sel.length > 0) {
        for (const id of sel) {
          compStore.useCompositionStore.getState().updateLayer(compId, id, { endFrame: frame });
        }
      }
    });
  }, remappable: true });
  // ── Phase 4: Additional playback shortcuts ───────────────
  shortcutRegistry.register({ id: 'playback.reverseToggle', key: ' ', shift: true, context: 'global', handler: () => {
    import('../ui/panels/timeline/PlaybackControls').then((m) => {
      const clock = m.animationClock;
      clock.setPlaybackRate(clock.playbackRate > 0 ? -1 : 1);
      clock.togglePlay();
    });
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.stop', key: 'Escape', context: 'global', handler: () => {
    import('../ui/panels/timeline/PlaybackControls').then((m) => m.animationClock.stop());
  }, remappable: true });
  shortcutRegistry.register({ id: 'playback.easeSelected', key: 'F9', context: 'global', handler: () => {
    import('../state/keyframeStore').then((m) => {
      const state = m.useKeyframeStore.getState();
      state.selectedKeyframeIds.forEach((id) => state.setInterpolation(id, 'bezier'));
    });
  }, remappable: true });

  shortcutRegistry.register({ id: 'playback.addKeyframe', key: 'k', alt: true, context: 'global', handler: () => {
    document.dispatchEvent(new CustomEvent('animation:addKeyframe'));
  }, remappable: true });

  shortcutRegistry.register({ id: 'layer.grab', key: 'g', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('transform:grab')), remappable: true });
  shortcutRegistry.register({ id: 'layer.rotate', key: 'r', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('transform:rotate')), remappable: true });
  shortcutRegistry.register({ id: 'layer.scale', key: 's', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('transform:scale')), remappable: true });

  shortcutRegistry.register({
    id: 'layer.selectAll', key: 'a', context: 'global',
    handler: () => {
      const ctx = getCompWithCheck();
      if (!ctx) return;
      useSelectionStore.getState().selectAll(ctx.compId, ctx.comp.layers.map((l: any) => l.id));
    }, remappable: true,
  });
  shortcutRegistry.register({ id: 'layer.deselectAll', key: 'a', alt: true, context: 'global', handler: () => useSelectionStore.getState().deselectAll(), remappable: true });
  shortcutRegistry.register({ id: 'layer.duplicate', key: 'd', ctrl: true, context: 'global', handler: () => duplicateSelected(), remappable: true });

  shortcutRegistry.register({
    id: 'layer.newSolid', key: 'y', ctrl: true, context: 'global',
    handler: () => {
      const ctx = getCompWithCheck();
      if (!ctx) return;
      const layer = createLayerInstance('solid', ctx.comp);
      useCompositionStore.getState().addLayer(ctx.compId, layer);
      useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: ctx.compId });
    }, remappable: true,
  });
  shortcutRegistry.register({
    id: 'layer.newText', key: 't', ctrl: true, context: 'global',
    handler: () => {
      const ctx = getCompWithCheck();
      if (!ctx) return;
      const layer = createLayerInstance('text', ctx.comp);
      useCompositionStore.getState().addLayer(ctx.compId, layer);
      useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: ctx.compId });
    }, remappable: true,
  });

  shortcutRegistry.register({ id: 'layer.delete', key: 'Delete', context: 'global', handler: () => deleteSelected(), remappable: true });
  shortcutRegistry.register({ id: 'layer.deleteAlt', key: 'x', context: 'global', handler: () => deleteSelected(), remappable: true });
  shortcutRegistry.register({ id: 'layer.rename', key: 'F2', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('layer:rename')), remappable: true });
}
