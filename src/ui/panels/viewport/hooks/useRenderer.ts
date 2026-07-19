import { useEffect, useRef, useState, useCallback } from 'react';
import { Renderer, type RendererState } from '../../../../renderer/Renderer';
import { useCompositionStore } from '../../../../state/compositionStore';
import { useSelectionStore } from '../../../../state/selectionStore';
import { useViewportStore } from '../../../../state/viewportStore';
import { useToolStore } from '../../../../state/toolStore';
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

  // Subscribe to identity-affecting fields individually so playback frame ticks don't retrigger
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
    setReady(true);
    setRequestRender(() => renderer.renderLoop.requestRender());

    return () => {
      renderer.dispose();
      rendererRef.current = null;
      setReady(false);
    };
  }, [container]);

  // Apply composition identity changes (dimensions, fps, bg color)
  // Depend only on identity-affecting fields so playback frame ticks don't retrigger.
  // `composition` is intentionally omitted from deps — the individual selectors above
  // capture all identity-affecting fields. Stale `composition` is harmless because
  // the identity string check prevents any spurious applyComposition call.
  const compIdentityRef = useRef('');
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !composition) return;
    const identity = `${compId}_${compWidth}_${compHeight}_${compFps}_${compBgColor}`;
    if (compIdentityRef.current === identity) return;
    compIdentityRef.current = identity;
    r.applyComposition(composition);
  }, [compId, compWidth, compHeight, compFps, compBgColor]);

  // Sync layers whenever they change
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !composition) return;
    r.layerSync.sync(layers);
    r.renderLoop.requestRender();
  }, [layers, composition?.id]);

  // Request render when currentTime changes (Renderer.beforeRender handles evaluation)
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
      if (activeTool === (TOOLS.MOVE as string)) gizmo = 'move';
      else if (activeTool === (TOOLS.ROTATE as string)) gizmo = 'rotate';
      else if (activeTool === (TOOLS.SCALE as string)) gizmo = 'scale';
    }
    r.selectionOverlay.gizmoMode = gizmo;
    r.selectionOverlay.hideHandles = mt.active || gizmo === null;
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
    const renderers = selectedIds
      .map((id) => r.layerSync.getRenderer(id))
      .filter(Boolean) as any[];
    r.selectionOverlay.update(renderers);
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