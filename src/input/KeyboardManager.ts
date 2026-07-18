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
    const handler = (e: KeyboardEvent) => { shortcutRegistry.handleEvent(e); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}

function getCtx(): { compId: string; comp: Composition } | null {
  const s = useCompositionStore.getState();
  if (!s.activeCompositionId) return null;
  const c = s.compositions.find(x => x.id === s.activeCompositionId);
  return c ? { compId: s.activeCompositionId, comp: c } : null;
}

function dupSel(): void {
  const ctx = getCtx(); if (!ctx) return;
  const selected = useSelectionStore.getState().getSelectedIds();
  const originals = selected.map(id => ctx.comp.layers.find(l => l.id === id)).filter(Boolean) as any[];
  if (originals.length === 0) return;
  import('../utils/duplicateLayer').then(({ duplicateLayers }) => {
    const dups = duplicateLayers(ctx.compId, originals);
    if (dups.length > 0) {
      useSelectionStore.getState().replaceSelection(dups.map(d => d.id), ctx.compId);
    }
  });
}

function delSel(): void {
  const ctx = getCtx(); if (!ctx) return;
  for (const id of useSelectionStore.getState().getSelectedIds())
    useCompositionStore.getState().removeLayer(ctx.compId, id);
  useSelectionStore.getState().clearSelection();
}

export function registerAllShortcuts(): void {
  // Tools
  shortcutRegistry.register({ id: 'tool.select', key: 'v', context: 'global', handler: () => useToolStore.getState().setActiveTool('select'), remappable: true });
  shortcutRegistry.register({ id: 'tool.hand', key: 'h', context: 'global', handler: () => useToolStore.getState().setActiveTool('hand'), remappable: true });
  shortcutRegistry.register({ id: 'tool.zoom', key: 'z', context: 'global', handler: () => useToolStore.getState().setActiveTool('zoom'), remappable: true });
  shortcutRegistry.register({ id: 'tool.rect', key: 'r', shift: true, context: 'global', handler: () => useToolStore.getState().setActiveTool('shapeRect'), remappable: true });
  shortcutRegistry.register({ id: 'tool.ellipse', key: 'e', shift: true, context: 'global', handler: () => useToolStore.getState().setActiveTool('shapeEllipse'), remappable: true });
  shortcutRegistry.register({ id: 'tool.pen', key: 'p', context: 'global', handler: () => useToolStore.getState().setActiveTool('pen'), remappable: true });
  shortcutRegistry.register({ id: 'tool.text', key: 't', context: 'global', handler: () => useToolStore.getState().setActiveTool('text'), remappable: true });

  // UI
  shortcutRegistry.register({
    id: 'ui.toggleSidePanel', key: 'n', context: 'global',
    handler: () => { const s = useUIStore.getState(); s.setRightPanelWidth(s.rightPanelWidth > 10 ? 0 : 320); },
    remappable: true,
  });
  shortcutRegistry.register({ id: 'edit.undo', key: 'z', ctrl: true, context: 'global', handler: () => {}, remappable: true });
  shortcutRegistry.register({ id: 'edit.redo', key: 'z', ctrl: true, shift: true, context: 'global', handler: () => {}, remappable: true });

  // Playback
  const clock = () => import('../ui/panels/timeline/PlaybackControls').then(m => m.animationClock);
  shortcutRegistry.register({ id: 'playback.toggle', key: ' ', context: 'global', handler: () => clock().then(c => c.togglePlay()), remappable: true });
  shortcutRegistry.register({ id: 'playback.start', key: 'Home', context: 'global', handler: () => clock().then(c => c.goToStart()), remappable: true });
  shortcutRegistry.register({ id: 'playback.end', key: 'End', context: 'global', handler: () => clock().then(c => c.goToEnd()), remappable: true });
  shortcutRegistry.register({ id: 'playback.prevFrame', key: 'ArrowLeft', context: 'global', handler: () => clock().then(c => c.stepBackward()), remappable: true });
  shortcutRegistry.register({ id: 'playback.nextFrame', key: 'ArrowRight', context: 'global', handler: () => clock().then(c => c.stepForward()), remappable: true });
  shortcutRegistry.register({ id: 'playback.skipBack', key: 'ArrowLeft', shift: true, context: 'global', handler: () => clock().then(c => c.jumpBackward(10)), remappable: true });
  shortcutRegistry.register({ id: 'playback.skipForward', key: 'ArrowRight', shift: true, context: 'global', handler: () => clock().then(c => c.jumpForward(10)), remappable: true });

  shortcutRegistry.register({ id: 'playback.prevKeyframe', key: 'j', context: 'global', handler: () => {
    Promise.all([import('../state/keyframeStore'), import('../state/selectionStore'), clock()]).then(([kf, sel, c]) => {
      const ids = sel.useSelectionStore.getState().getSelectedIds();
      if (ids.length > 0) {
        const prev = [...kf.useKeyframeStore.getState().engine.getAllKeyframesForLayer(ids[0])].reverse().find(k => k.time < c.currentFrame);
        if (prev) c.seekToFrame(prev.time);
      }
    });
  }, remappable: true });

  shortcutRegistry.register({ id: 'playback.nextKeyframe', key: 'k', context: 'global', handler: () => {
    Promise.all([import('../state/keyframeStore'), import('../state/selectionStore'), clock()]).then(([kf, sel, c]) => {
      const ids = sel.useSelectionStore.getState().getSelectedIds();
      if (ids.length > 0) {
        const next = kf.useKeyframeStore.getState().engine.getAllKeyframesForLayer(ids[0]).find(k => k.time > c.currentFrame);
        if (next) c.seekToFrame(next.time);
      }
    });
  }, remappable: true });

  shortcutRegistry.register({ id: 'playback.workAreaStart', key: 'b', context: 'global', handler: () => {
    Promise.all([import('../state/compositionStore'), clock()]).then(([cs, c]) => {
      const id = cs.useCompositionStore.getState().activeCompositionId;
      if (id) {
        const comp = cs.useCompositionStore.getState().compositions.find(x => x.id === id);
        cs.useCompositionStore.getState().updateComposition(id, { workAreaStart: c.currentFrame / (comp?.fps ?? 30) });
      }
    });
  }, remappable: true });

  // Changed from 'n' to Shift+N to avoid conflict with ui.toggleSidePanel
  shortcutRegistry.register({ id: 'playback.workAreaEnd', key: 'n', shift: true, context: 'global', handler: () => {
    Promise.all([import('../state/compositionStore'), clock()]).then(([cs, c]) => {
      const id = cs.useCompositionStore.getState().activeCompositionId;
      if (id) {
        const comp = cs.useCompositionStore.getState().compositions.find(x => x.id === id);
        cs.useCompositionStore.getState().updateComposition(id, { workAreaEnd: c.currentFrame / (comp?.fps ?? 30) });
      }
    });
  }, remappable: true });

  // Changed from 'i' to Alt+I so plain 'i' opens insert keyframe menu
  shortcutRegistry.register({ id: 'playback.setInPoint', key: 'i', alt: true, context: 'global', handler: () => {
    Promise.all([import('../state/compositionStore'), import('../state/selectionStore'), clock()]).then(([cs, sel, c]) => {
      const ids = sel.useSelectionStore.getState().getSelectedIds();
      const compId = cs.useCompositionStore.getState().activeCompositionId;
      if (compId && ids.length > 0) {
        for (const id of ids) cs.useCompositionStore.getState().updateLayer(compId, id, { startFrame: c.currentFrame });
      }
    });
  }, remappable: true });

  shortcutRegistry.register({ id: 'playback.setOutPoint', key: 'o', context: 'global', handler: () => {
    Promise.all([import('../state/compositionStore'), import('../state/selectionStore'), clock()]).then(([cs, sel, c]) => {
      const ids = sel.useSelectionStore.getState().getSelectedIds();
      const compId = cs.useCompositionStore.getState().activeCompositionId;
      if (compId && ids.length > 0) {
        for (const id of ids) cs.useCompositionStore.getState().updateLayer(compId, id, { endFrame: c.currentFrame });
      }
    });
  }, remappable: true });

  shortcutRegistry.register({ id: 'playback.reverseToggle', key: ' ', shift: true, context: 'global', handler: () => {
    clock().then(c => { c.setPlaybackRate(c.playbackRate > 0 ? -1 : 1); c.togglePlay(); });
  }, remappable: true });

  // Escape pauses instead of stop() to avoid rewinding to frame 0 (which snaps all animated properties)
  shortcutRegistry.register({ id: 'playback.pause', key: 'Escape', context: 'global', handler: () => clock().then(c => c.pause()), remappable: true });

  shortcutRegistry.register({ id: 'playback.easeSelected', key: 'F9', context: 'global', handler: () => {
    import('../state/keyframeStore').then(m => {
      const s = m.useKeyframeStore.getState();
      s.selectedKeyframeIds.forEach(id => s.setInterpolation(id, 'bezier'));
    });
  }, remappable: true });

  shortcutRegistry.register({ id: 'playback.addKeyframe', key: 'k', alt: true, context: 'global', handler: () => {
    document.dispatchEvent(new CustomEvent('animation:addKeyframe'));
  }, remappable: true });

  // Viewport
  shortcutRegistry.register({ id: 'viewport.fitToViewport', key: 'Home', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('viewport:frameAll')), remappable: true });
  shortcutRegistry.register({ id: 'viewport.toggleGrid', key: 'g', ctrl: true, context: 'global', handler: () => useViewportStore.getState().toggleGrid(), remappable: true });
  shortcutRegistry.register({ id: 'viewport.toggleRulers', key: 'r', ctrl: true, context: 'global', handler: () => useViewportStore.getState().toggleRulers(), remappable: true });
  shortcutRegistry.register({ id: 'viewport.toggleSnapping', key: 'Tab', shift: true, context: 'global', handler: () => useViewportStore.getState().toggleSnapping(), remappable: true });
  shortcutRegistry.register({ id: 'viewport.frameSelected', key: '.', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('viewport:frameSelected')), remappable: true });
  shortcutRegistry.register({ id: 'viewport.zoom100', key: '1', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('viewport:zoom100')), remappable: true });

  // Transform
  shortcutRegistry.register({ id: 'layer.grab', key: 'g', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('transform:grab')), remappable: true });
  shortcutRegistry.register({ id: 'layer.rotate', key: 'r', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('transform:rotate')), remappable: true });
  shortcutRegistry.register({ id: 'layer.scale', key: 's', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('transform:scale')), remappable: true });

  // Selection
  shortcutRegistry.register({
    id: 'layer.selectAll', key: 'a', context: 'global',
    handler: () => { const ctx = getCtx(); if (ctx) useSelectionStore.getState().selectAll(ctx.compId, ctx.comp.layers.map(l => l.id)); },
    remappable: true,
  });
  shortcutRegistry.register({ id: 'layer.deselectAll', key: 'a', alt: true, context: 'global', handler: () => useSelectionStore.getState().deselectAll(), remappable: true });
  shortcutRegistry.register({ id: 'layer.duplicate', key: 'd', ctrl: true, context: 'global', handler: dupSel, remappable: true });

  shortcutRegistry.register({
    id: 'layer.newSolid', key: 'y', ctrl: true, context: 'global',
    handler: () => {
      const ctx = getCtx(); if (!ctx) return;
      const l = createLayerInstance('solid', ctx.comp);
      useCompositionStore.getState().addLayer(ctx.compId, l);
      useSelectionStore.getState().select({ type: 'layer', id: l.id, compositionId: ctx.compId });
    }, remappable: true,
  });
  shortcutRegistry.register({
    id: 'layer.newText', key: 't', ctrl: true, context: 'global',
    handler: () => {
      const ctx = getCtx(); if (!ctx) return;
      const l = createLayerInstance('text', ctx.comp);
      useCompositionStore.getState().addLayer(ctx.compId, l);
      useSelectionStore.getState().select({ type: 'layer', id: l.id, compositionId: ctx.compId });
    }, remappable: true,
  });

  shortcutRegistry.register({ id: 'layer.delete', key: 'Delete', context: 'global', handler: delSel, remappable: true });
  shortcutRegistry.register({ id: 'layer.deleteAlt', key: 'x', context: 'global', handler: delSel, remappable: true });
  shortcutRegistry.register({ id: 'layer.rename', key: 'F2', context: 'global', handler: () => document.dispatchEvent(new CustomEvent('layer:rename')), remappable: true });
  // Markers
  shortcutRegistry.register({ id: 'marker.add', key: 'm', context: 'global', handler: () => {
    Promise.all([import('../state/markerStore'), import('../state/compositionStore'), clock()]).then(([ms, cs, c]) => {
      const id = cs.useCompositionStore.getState().activeCompositionId;
      if (id) {
        const comp = cs.useCompositionStore.getState().compositions.find(x => x.id === id);
        const frame = c.currentFrame;
        const time = frame / (comp?.fps ?? 30);
        ms.useMarkerStore.getState().addMarker(id, time, frame);
      }
    });
  }, remappable: true });

  shortcutRegistry.register({ id: 'marker.remove', key: 'm', alt: true, context: 'global', handler: () => {
    Promise.all([import('../state/markerStore'), import('../state/compositionStore'), clock()]).then(([ms, cs, c]) => {
      const id = cs.useCompositionStore.getState().activeCompositionId;
      if (id) {
        const markers = ms.useMarkerStore.getState().getMarkersForComposition(id);
        const frame = c.currentFrame;
        const atFrame = markers.find(m => m.frame === frame);
        if (atFrame) ms.useMarkerStore.getState().removeMarker(id, atFrame.id);
      }
    });
  }, remappable: true });

  shortcutRegistry.register({ id: 'file.save', key: 's', ctrl: true, context: 'global', handler: () => {}, remappable: true });
}