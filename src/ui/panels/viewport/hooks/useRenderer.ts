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
  const transformModeRef = useRef<string | null>(null);

  const composition = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c: Composition) => c.id === id) ?? null : null;
  });

  const layers = useCompositionStore((s) => {
    if (!s.activeCompositionId) return [];
    const comp = s.compositions.find((c) => c.id === s.activeCompositionId);
    return comp?.layers ?? [];
  });

  const selectedIds = useSelectionStore((s) =>
    s.selected.filter((x) => x.type === 'layer').map((x) => x.id),
  );

  const activeTool = useToolStore((s) => s.activeTool);

  const showGrid = useViewportStore((s) => s.settings.showGrid);
  const showSafeZones = useViewportStore((s) => s.settings.showSafeZones);
  const snappingEnabled = useViewportStore((s) => s.settings.snappingEnabled);

  // Create/mount renderer
  useEffect(() => {
    if (!container) return;
    const renderer = new Renderer(container);
    renderer.onStateChange = (newState: RendererState) => setState(newState);
    rendererRef.current = renderer;
    setReady(true);
    // Wire render request callback for animation playback (Phase 4)
    setRequestRender(() => renderer.renderLoop.requestRender());
    return () => {
      renderer.dispose();
      rendererRef.current = null;
      setReady(false);
    };
  }, [container]);

  // Track the last composition identity so we know when to re-apply (not just re-sync)
  const compIdentityRef = useRef<string>('');

  // Apply composition — only when comp ID or dimensions change (NOT on every layer add)
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !composition) return;
    const identity = `${composition.id}_${composition.width}_${composition.height}_${composition.fps}_${composition.backgroundColor}`;
    if (compIdentityRef.current === identity) return;
    compIdentityRef.current = identity;
    r.applyComposition(composition);
  }, [composition]);

  // Sync layers to scene — independent of composition setup
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !composition) return;
    r.layerSync.sync(layers);
    r.renderLoop.requestRender();
  }, [composition?.id, layers]);

  // Compute gizmo mode from active tool + modal transform state
  // L4: Also hide bounding box handles during modal transform
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const mt = r.modalTransform;
    let gizmo: GizmoMode = null;
    const isModalActive = mt.active;
    if (isModalActive && mt.mode === 'grab') gizmo = 'move';
    else if (isModalActive && mt.mode === 'rotate') gizmo = 'rotate';
    else if (isModalActive && mt.mode === 'scale') gizmo = 'scale';
    else if (activeTool === (TOOLS.MOVE as string)) gizmo = 'move';
    else if (activeTool === (TOOLS.ROTATE as string)) gizmo = 'rotate';
    else if (activeTool === (TOOLS.SCALE as string)) gizmo = 'scale';
    r.selectionOverlay.gizmoMode = gizmo;
    r.selectionOverlay.hideHandles = isModalActive;
  }, [activeTool, ready, transformMode]);

  // Update selection overlay — reacts to selection, layers, zoom, and gizmo mode
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    if (selectedIds.length === 0) {
      r.selectionOverlay.hide();
    } else {
      r.selectionOverlay.show();
      const renderers: any[] = [];
      for (const id of selectedIds) {
        const ren = r.layerSync.getRenderer(id);
        if (ren) renderers.push(ren);
      }
      r.selectionOverlay.update(renderers);
    }
  }, [selectedIds, layers, state.zoom, activeTool, transformMode]);

  // Track transform mode from ModalTransform via event-driven approach
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;

    const updateMode = () => {
      const mt = r.modalTransform;
      const mode = mt.active ? (mt.mode?.toUpperCase() ?? null) : null;
      transformModeRef.current = mode;
      setTransformMode(mode);
    };

    // Check modal state on transform events
    document.addEventListener('transform:grab', updateMode);
    document.addEventListener('transform:rotate', updateMode);
    document.addEventListener('transform:scale', updateMode);
    // Confirm/cancel via mouse events
    const onMouseUp = () => updateMode();
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') updateMode();
    };
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      document.removeEventListener('transform:grab', updateMode);
      document.removeEventListener('transform:rotate', updateMode);
      document.removeEventListener('transform:scale', updateMode);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [ready]);

  // Viewport store toggles
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

  // Update grid when zoom changes
  useEffect(() => {
    if (!rendererRef.current || !composition) return;
    rendererRef.current.sceneManager.updateGrid(state.zoom);
  }, [composition, state.zoom]);

  // Viewport event listeners
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const onFrameAll = () => renderer.cameraManager.fitToComposition();
    const onFrameSelected = () => renderer.cameraManager.fitToComposition();
    const onZoom100 = () => renderer.cameraManager.zoomTo100Percent();
    const onGrab = () => renderer.modalTransform.start('grab', renderer.canvas);
    const onRotate = () => renderer.modalTransform.start('rotate', renderer.canvas);
    const onScale = () => renderer.modalTransform.start('scale', renderer.canvas);

    document.addEventListener('viewport:frameAll', onFrameAll);
    document.addEventListener('viewport:frameSelected', onFrameSelected);
    document.addEventListener('viewport:zoom100', onZoom100);
    document.addEventListener('transform:grab', onGrab);
    document.addEventListener('transform:rotate', onRotate);
    document.addEventListener('transform:scale', onScale);

    return () => {
      document.removeEventListener('viewport:frameAll', onFrameAll);
      document.removeEventListener('viewport:frameSelected', onFrameSelected);
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
