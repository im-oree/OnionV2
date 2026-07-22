import { useEffect, useRef, useState, useCallback } from 'react';
import { Renderer, type RendererState } from '../../../../renderer/Renderer';
import { useCompositionStore } from '../../../../state/compositionStore';
import { useSelectionStore } from '../../../../state/selectionStore';
import { useViewportStore } from '../../../../state/viewportStore';
import { useToolStore } from '../../../../state/toolStore';
import { useMaskStore } from '../../../../state/maskStore';
import { setRequestRender } from '../../../../state/uiStore';
import { TOOLS } from '../../../../config/constants';
import type { GizmoMode } from '../../../../renderer/interaction/SelectionOverlay';
import type { Composition } from '../../../../types/composition';

interface UseRendererResult {
  ready: boolean;
  state: RendererState;
  viewportState: {
    fps: number;
    zoom: number;
    frameCount: number;
    selectedLayerIds: string[];
    transformMode: string | null;
  };
  renderer: Renderer | null;
  zoomToFit: () => void;
  setZoom: (zoom: number) => void;
}

export function useRenderer(container: HTMLElement | null): UseRendererResult {
  const rendererRef = useRef<Renderer | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<RendererState>({ fps: 0, zoom: 1, frameCount: 0 });
  const [transformMode, setTransformMode] = useState<string | null>(null);

  const composition = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c: Composition) => c.id === id) ?? null : null;
  });

  const layers = useCompositionStore((s) => {
    if (!s.activeCompositionId) return [];
    const comp = s.compositions.find((c) => c.id === s.activeCompositionId);
    return comp?.layers ?? [];
  });

  const currentTime = useCompositionStore((s) => {
    if (!s.activeCompositionId) return 0;
    const comp = s.compositions.find((c) => c.id === s.activeCompositionId);
    return comp?.currentTime ?? 0;
  });

  const compFps = useCompositionStore((s) => {
    if (!s.activeCompositionId) return 30;
    const comp = s.compositions.find((c) => c.id === s.activeCompositionId);
    return comp?.fps ?? 30;
  });

  const compId = useCompositionStore(s => s.activeCompositionId);
  const compWidth = useCompositionStore((s) => {
    if (!s.activeCompositionId) return 0;
    return s.compositions.find(c => c.id === s.activeCompositionId)?.width ?? 0;
  });
  const compHeight = useCompositionStore((s) => {
    if (!s.activeCompositionId) return 0;
    return s.compositions.find(c => c.id === s.activeCompositionId)?.height ?? 0;
  });
  const compBgColor = useCompositionStore((s) => {
    if (!s.activeCompositionId) return '#000000';
    return s.compositions.find(c => c.id === s.activeCompositionId)?.backgroundColor ?? '#000000';
  });

  const selectedIds = useSelectionStore((s) =>
    s.selected.filter((x) => x.type === 'layer').map((x) => x.id),
  );

  const activeTool = useToolStore((s) => s.activeTool);
  const showGrid = useViewportStore((s) => s.settings.showGrid);
  const showSafeZones = useViewportStore((s) => s.settings.showSafeZones);
  const snappingEnabled = useViewportStore((s) => s.settings.snappingEnabled);

  // Create renderer once
  useEffect(() => {
    if (!container) return;
    const renderer = new Renderer(container);
    renderer.onStateChange = (newState: RendererState) => setState(newState);
    rendererRef.current = renderer;
    setRequestRender(() => renderer.renderLoop.requestRender());

    // Apply current composition + layers immediately, don't wait for effects.
    const cs = useCompositionStore.getState();
    const activeId = cs.activeCompositionId;
    const activeComp = activeId ? cs.compositions.find(c => c.id === activeId) : null;
    if (activeComp) {
      renderer.applyComposition(activeComp);
      renderer.layerSync.sync(activeComp.layers);
      renderer.renderLoop.requestRender();
    }

    setReady(true);

    return () => {
      renderer.dispose();
      rendererRef.current = null;
      setReady(false);
    };
  }, [container]);

  // Apply composition identity changes (dimensions, fps, bg color)
  const compIdentityRef = useRef('');
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !composition) {
      if (!composition) compIdentityRef.current = '';
      return;
    }
    const identity = `${compId}_${compWidth}_${compHeight}_${compFps}_${compBgColor}`;
    if (compIdentityRef.current === identity) return;
    compIdentityRef.current = identity;
    r.applyComposition(composition);
    // Immediately sync layers after applyComposition so nothing is missed.
    r.layerSync.sync(composition.layers);
    r.renderLoop.requestRender();
  }, [compId, compWidth, compHeight, compFps, compBgColor, ready, composition]);

  // Sync layers whenever they change
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.layerSync.sync(layers);
    r.renderLoop.requestRender();
  }, [layers, composition?.id, ready]);

  // Subscribe directly to the composition store as a safety net —
  // guarantees that any layers array change (add/remove/update) syncs to the renderer,
  // even if the selector-driven effect above misses a tick due to reference equality quirks.
  useEffect(() => {
    if (!ready) return;
    let lastLayersRef: unknown = null;
    const unsub = useCompositionStore.subscribe((s) => {
      const r = rendererRef.current;
      if (!r) return;
      const activeId = s.activeCompositionId;
      if (!activeId) return;
      const comp = s.compositions.find(c => c.id === activeId);
      if (!comp) return;
      if (comp.layers === lastLayersRef) return;
      lastLayersRef = comp.layers;
      r.layerSync.sync(comp.layers);
      r.renderLoop.requestRender();
    });
    return unsub;
  }, [ready]);

  // Re-apply masks and re-render whenever the mask store revision changes
  const maskRevision = useMaskStore(s => s.revision);
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !composition) return;
    r.layerSync.sync(layers);
    r.renderLoop.requestRender();
  }, [maskRevision, composition?.id, layers]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !composition) return;
    r.renderLoop.requestRender();
  }, [currentTime, composition?.id, compFps]);

  // Gizmo mode
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const mt = r.modalTransform;
    let gizmo: GizmoMode = null;
    if (mt.active) {
      if (mt.mode === 'grab') gizmo = 'move';
      else if (mt.mode === 'rotate') gizmo = 'rotate';
      else if (mt.mode === 'scale') gizmo = 'scale';
    } else {
      if (activeTool === (TOOLS.ROTATE as string)) gizmo = 'rotate';
      else if (activeTool === (TOOLS.SCALE as string)) gizmo = 'scale';
      else gizmo = 'move'; // default — select/move show move gizmo
    }
    r.selectionOverlay.gizmoMode = gizmo;
    // Only hide handles during an active modal transform (mid-drag).
    r.selectionOverlay.hideHandles = mt.active;
  }, [activeTool, ready, transformMode]);

  // Selection overlay
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    if (selectedIds.length === 0) {
      r.selectionOverlay.hide();
      r.renderLoop.requestRender();
      return;
    }
    r.selectionOverlay.show();
    const lastId = selectedIds[selectedIds.length - 1];
    r.selectionOverlay.lastSelectedId = lastId;
    const renderers = selectedIds
      .map((id) => r.layerSync.getRenderer(id))
      .filter(Boolean) as any[];
    r.selectionOverlay.update(renderers, layers.some(l => selectedIds.includes(l.id) && l.is3D));
    r.renderLoop.requestRender();
  }, [selectedIds, layers, state.zoom, transformMode]);

  // Track transform mode
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const updateMode = () => {
      const mt = r.modalTransform;
      setTransformMode(mt.active ? (mt.mode ?? null) : null);
    };
    document.addEventListener('transform:grab', updateMode);
    document.addEventListener('transform:rotate', updateMode);
    document.addEventListener('transform:scale', updateMode);
    document.addEventListener('mouseup', updateMode);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') updateMode();
    };
    document.addEventListener('keyup', onKey);
    return () => {
      document.removeEventListener('transform:grab', updateMode);
      document.removeEventListener('transform:rotate', updateMode);
      document.removeEventListener('transform:scale', updateMode);
      document.removeEventListener('mouseup', updateMode);
      document.removeEventListener('keyup', onKey);
    };
  }, [ready]);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setGridVisible(showGrid);
  }, [showGrid]);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setSafeZonesVisible(showSafeZones);
  }, [showSafeZones]);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setSnappingEnabled(snappingEnabled);
  }, [snappingEnabled]);

  useEffect(() => {
    if (!rendererRef.current || !composition) return;
    rendererRef.current.sceneManager.updateGrid(state.zoom);
  }, [composition?.id, state.zoom]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const onFrameAll = () => renderer.cameraManager.fitToComposition();
    const onZoom100 = () => renderer.cameraManager.zoomTo100Percent();
    const onGrab = () => {
      const ids = useSelectionStore.getState().getSelectedIds();
      if (ids.length > 0) renderer.modalTransform.start('grab', renderer.canvas);
    };
    const onRotate = () => {
      const ids = useSelectionStore.getState().getSelectedIds();
      if (ids.length > 0) renderer.modalTransform.start('rotate', renderer.canvas);
    };
    const onScale = () => {
      const ids = useSelectionStore.getState().getSelectedIds();
      if (ids.length > 0) renderer.modalTransform.start('scale', renderer.canvas);
    };
    document.addEventListener('viewport:frameAll', onFrameAll);
    document.addEventListener('viewport:zoom100', onZoom100);
    document.addEventListener('transform:grab', onGrab);
    document.addEventListener('transform:rotate', onRotate);
    document.addEventListener('transform:scale', onScale);
    return () => {
      document.removeEventListener('viewport:frameAll', onFrameAll);
      document.removeEventListener('viewport:zoom100', onZoom100);
      document.removeEventListener('transform:grab', onGrab);
      document.removeEventListener('transform:rotate', onRotate);
      document.removeEventListener('transform:scale', onScale);
    };
  }, [ready]);

  const zoomToFit = useCallback(() => {
    rendererRef.current?.cameraManager.fitToComposition();
  }, []);

  const setZoom = useCallback((zoom: number) => {
    rendererRef.current?.cameraManager.setZoom(zoom);
  }, []);

  return {
    ready,
    state,
    viewportState: {
      fps: state.fps,
      zoom: state.zoom,
      frameCount: state.frameCount,
      selectedLayerIds: selectedIds,
      transformMode,
    },
    renderer: rendererRef.current,
    zoomToFit,
    setZoom,
  };
}