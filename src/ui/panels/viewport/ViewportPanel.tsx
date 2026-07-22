/**
 * ViewportPanel — main viewport container. Renders the Three.js canvas,
 * all SVG/HTML overlays, HUD controls, and handles asset drag-and-drop.
 */
import React, {
  useRef,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useRenderer } from './hooks/useRenderer';
import { useViewportInput } from './hooks/useViewportInput';
import { useViewportSize } from './hooks/useViewportSize';
import { useCursor } from './hooks/useCursor';
import { ViewportHUD } from './ViewportHUD';
import { TransformHUD } from './TransformHUD';
import { Rulers } from './Rulers';
import { Guides } from './Guides';
import { AxisGizmo } from './AxisGizmo';
import { useCompositionStore } from '../../../state/compositionStore';
import { useViewportStore } from '../../../state/viewportStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { ContextMenu } from '../../common/ContextMenu';
import { useContextMenu } from '../../common/useContextMenu';
import {
  buildViewportContextMenu,
  buildInsertKeyframeMenu,
} from './contextMenus';
import { Breadcrumb } from './Breadcrumb';
import { GradientOverlay } from './GradientOverlay';
import { CompBoundsCSS } from './CompBoundsCSS';
import { OnionSkinOverlay } from './OnionSkinOverlay';
import { MotionPathOverlay } from './MotionPathOverlay';
import { PenToolOverlay } from './PenToolOverlay';
import { PickWhipOverlay } from './PickWhipOverlay';
import { ShapeDrawOverlay } from './ShapeDrawOverlay';
import { ShapeContextToolbar } from './ShapeContextToolbar';
import { MaskContextToolbar } from './MaskContextToolbar';
import { SnapGuidesOverlay } from './SnapGuidesOverlay';
import { TextureLoadingOverlay } from './TextureLoadingOverlay';
import { MotionBlurBadgeOverlay } from './MotionBlurBadgeOverlay';
import { MaskOverlay } from './MaskOverlay';
import { PerspectiveOverlay } from './PerspectiveOverlay';
import { SplineOverlay } from './SplineOverlay';
import { TransformGizmo3D } from './TransformGizmo3D';
import { CameraFrameGuide } from './CameraFrameGuide';
import { CameraFrustumOverlay } from './CameraFrustumOverlay';
import { CameraPreview } from './CameraPreview';
import { PerfHUD } from './PerfHUD';
import { ViewportToolbar } from './ViewportToolbar';
import { assetManager } from '../../../storage/AssetManager';
import { createLayerInstance } from '../../../utils/createLayerInstance';
import { useNotificationStore } from '../../../state/notificationStore';
import { useProjectStore } from '../../../state/projectStore';

// ── Types ────────────────────────────────────────────────────

interface AssetLike {
  id: string;
  name: string;
  type: string;
  url?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  duration?: number;
  [key: string]: unknown;
}

// ── Helper: build layer data from asset ──────────────────────

function buildLayerData(
  asset: AssetLike,
  type: 'image' | 'video' | 'audio',
) {
  const base = { assetId: asset.id };

  switch (type) {
    case 'audio':
      return {
        ...base,
        duration: asset.duration ?? 10,
        volume: 1,
        muted: false,
        playbackRate: 1,
      };

    case 'video':
      return {
        ...base,
        naturalWidth: asset.naturalWidth ?? 100,
        naturalHeight: asset.naturalHeight ?? 100,
        duration: asset.duration ?? 10,
        muted: false,
        volume: 1,
        playbackRate: 1,
      };

    default:
      return {
        ...base,
        naturalWidth: asset.naturalWidth ?? 100,
        naturalHeight: asset.naturalHeight ?? 100,
      };
  }
}

function assetTypeToLayerType(
  assetType: string,
): 'image' | 'video' | 'audio' {
  if (assetType === 'video') return 'video';
  if (assetType === 'audio') return 'audio';
  return 'image';
}

// ── Drop highlight component ─────────────────────────────────

const DropHighlight: React.FC = React.memo(() => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      zIndex: 30,
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        background: 'rgba(71,114,179,0.12)',
        border: '2px dashed rgba(100,140,255,0.5)',
        borderRadius: 10,
        padding: '20px 40px',
        color: 'rgba(130,170,255,0.9)',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'system-ui, sans-serif',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.7 }}
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Drop to add layer
    </div>
  </div>
));

DropHighlight.displayName = 'DropHighlight';

// ── Empty state ──────────────────────────────────────────────

const EmptyState: React.FC = React.memo(() => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      pointerEvents: 'none',
    }}
  >
    <div
      style={{
        textAlign: 'center',
        color: 'rgba(255,255,255,0.25)',
        fontSize: 12,
        fontFamily: 'system-ui, sans-serif',
        lineHeight: 1.6,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>
        ⎚
      </div>
      <div>
        Add a layer from the <strong>Add</strong> menu
      </div>
      <div>or drag assets here</div>
    </div>
  </div>
));

EmptyState.displayName = 'EmptyState';

// ── Overlay group (reduces comp&& repetition) ────────────────

const ViewportOverlays: React.FC<{
  cameraManager: any;
  viewportSize: { width: number; height: number };
  modalTransform: any;
  renderer: any;
  isFreeView: boolean;
}> = React.memo(
  ({
    cameraManager,
    viewportSize,
    modalTransform,
    renderer,
    isFreeView,
  }) => (
    <>
      <GradientOverlay
        cameraManager={cameraManager}
        viewportSize={viewportSize}
      />
      <PenToolOverlay
        cameraManager={cameraManager}
        viewportSize={viewportSize}
      />
      <ShapeDrawOverlay
        cameraManager={cameraManager}
        viewportSize={viewportSize}
      />
      <MotionPathOverlay
        cameraManager={cameraManager}
        viewportSize={viewportSize}
      />
      <OnionSkinOverlay
        cameraManager={cameraManager}
        viewportSize={viewportSize}
      />
      <PickWhipOverlay />
      <TextureLoadingOverlay
        cameraManager={cameraManager}
        viewportSize={viewportSize}
      />
      <MotionBlurBadgeOverlay
        cameraManager={cameraManager}
        viewportSize={viewportSize}
      />
      <MaskOverlay
        cameraManager={cameraManager}
        viewportSize={viewportSize}
      />
      <PerspectiveOverlay
        cameraManager={cameraManager}
        viewportSize={viewportSize}
      />
      <SplineOverlay
        cameraManager={cameraManager}
        viewportSize={viewportSize}
      />
      <TransformGizmo3D
        cameraManager={cameraManager}
        viewportSize={viewportSize}
      />
      <CameraFrameGuide
        viewportSize={viewportSize}
        isFreeView={isFreeView}
      />
      <CameraFrustumOverlay
        cameraManager={cameraManager}
        viewportSize={viewportSize}
        isFreeView={isFreeView}
      />
      <CameraPreview
        isFreeView={isFreeView}
        renderer={renderer}
      />
      <SnapGuidesOverlay
        modalTransform={modalTransform}
        cameraManager={cameraManager}
        viewportSize={viewportSize}
      />
      <TransformHUD
        modalTransform={modalTransform}
        cameraManager={cameraManager}
      />
    </>
  ),
);

ViewportOverlays.displayName = 'ViewportOverlays';

// ── Main component ──────────────────────────────────────────

export const ViewportPanel: React.FC = () => {
  // CRITICAL FIX: use state, not just a ref, so that when the DOM node
  // mounts we trigger a re-render and useRenderer's effect actually runs.
  // A ref alone stays null on first render and never triggers re-renders,
  // so the Renderer was never created → blank viewport.
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setContainer = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    setContainerEl(el);
  }, []);

  const isHovering = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [dropHighlight, setDropHighlight] = useState(false);
  const [isFreeView, setIsFreeView] = useState(false);

  const viewportSize = useViewportSize(
    containerRef as React.RefObject<HTMLElement | null>,
  );
  const { state, viewportState, renderer } = useRenderer(containerEl);

  useCursor(renderer?.canvas ?? null);

  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id
      ? (s.compositions.find((c) => c.id === id) ?? null)
      : null;
  });

  const showRulers = useViewportStore(
    (s) => s.settings.showRulers,
  );
  const showGuides = useViewportStore(
    (s) => s.settings.showGuides,
  );
  const showAnchorPoints = useViewportStore(
    (s) => s.settings.showAnchorPoints,
  );

  const ctxMenu = useContextMenu();

  useViewportInput({
    canvas: renderer?.canvas ?? null,
    cameraManager: renderer?.cameraManager ?? null,
    hitTester: renderer?.hitTester ?? null,
    modalTransform: renderer?.modalTransform ?? null,
    requestRender: renderer
      ? () => renderer.renderLoop.requestRender()
      : undefined,
  });

  // Track free view mode changes
  useEffect(() => {
    const handler = () => {
      setIsFreeView(
        !!(renderer?.cameraManager as any)?.isFreeView,
      );
    };

    document.addEventListener('viewport:viewmode', handler);
    handler();

    return () => {
      document.removeEventListener('viewport:viewmode', handler);
    };
  }, [renderer]);

  // Mouse tracking for context menu positioning
  useEffect(() => {
    const el = containerEl;
    if (!el) return;

    const onEnter = () => {
      isHovering.current = true;
    };
    const onLeave = () => {
      isHovering.current = false;
    };
    const onMove = (e: MouseEvent) => {
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('mousemove', onMove);

    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('mousemove', onMove);
    };
  }, [containerEl]);

  // Insert keyframe shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'i' && e.key !== 'I') return;
      if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (!isHovering.current) return;

      const items = buildInsertKeyframeMenu();
      if (items.length === 0) return;

      e.preventDefault();
      ctxMenu.open(
        {
          clientX: lastMouse.current.x,
          clientY: lastMouse.current.y,
        },
        items,
      );
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ctxMenu]);

  // ── Drop handling ─────────────────────────────────────────

  const addLayerFromAsset = useCallback(
    (
      asset: AssetLike,
      compId: string,
      comp: any,
      worldX: number,
      worldY: number,
    ) => {
      const type = assetTypeToLayerType(asset.type);

      const layer = createLayerInstance(type, comp, {
        name: asset.name,
        zIndex: comp.layers.length + 1,
        transform: {
          position: { x: worldX, y: worldY },
          scale: { x: 100, y: 100 },
          rotation: 0,
          anchorPoint: { x: 0, y: 0 },
        },
        data: buildLayerData(asset, type),
      });

      useCompositionStore.getState().addLayer(compId, layer);
      useSelectionStore.getState().select({
        type: 'layer',
        id: layer.id,
        compositionId: compId,
      });

      return layer;
    },
    [],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDropHighlight(false);

      const cs = useCompositionStore.getState();
      const compId = cs.activeCompositionId;

      if (!compId) {
        useNotificationStore.getState().addNotification({
          type: 'warning',
          message: 'Create a composition first.',
          autoDismiss: 3000,
        });
        return;
      }

      const compData = cs.compositions.find(
        (c) => c.id === compId,
      );
      if (!compData) return;

      // Get world position from mouse
      let worldX = compData.width / 2;
      let worldY = compData.height / 2;

      if (renderer?.cameraManager && containerRef.current) {
        const rect =
          containerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        try {
          const world = renderer.cameraManager.screenToWorld(
            mx,
            my,
          );
          worldX = world.x;
          worldY = world.y;
        } catch {
          // Use center fallback
        }
      }

      // Case 1: Asset from project panel
      const assetId = e.dataTransfer.getData(
        'application/onion-asset',
      );

      if (assetId) {
        let asset = assetManager.getAsset(assetId);

        if (!asset) {
          const pa = useProjectStore
            .getState()
            .project.assets.find((a) => a.id === assetId);

          if (pa) {
            asset = {
              id: pa.id,
              name: pa.name,
              type: pa.type,
              url: pa.path,
              size: pa.size,
              mimeType: pa.mimeType,
              importedAt: pa.importedAt,
              missing: false,
              naturalWidth: pa.naturalWidth ?? 100,
              naturalHeight: pa.naturalHeight ?? 100,
              duration: pa.duration,
            } as any;
          }
        }

        if (!asset) {
          useNotificationStore.getState().addNotification({
            type: 'warning',
            message: 'Asset not found — try re-importing.',
            autoDismiss: 3000,
          });
          return;
        }

        addLayerFromAsset(
          asset as AssetLike,
          compId,
          compData,
          worldX,
          worldY,
        );
        renderer?.renderLoop?.requestRender();
        return;
      }

      // Case 2: Raw files from OS
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      for (const file of files) {
        try {
          const asset = await assetManager.importFile(file);
          addLayerFromAsset(
            asset as AssetLike,
            compId,
            compData,
            worldX,
            worldY,
          );

          useNotificationStore.getState().addNotification({
            type: 'success',
            message: `Added "${asset.name}" to timeline`,
            autoDismiss: 2000,
          });
        } catch (err) {
          useNotificationStore.getState().addNotification({
            type: 'error',
            message: `Failed to import "${file.name}": ${
              (err as Error)?.message ?? 'Unknown error'
            }`,
          });
        }
      }

      renderer?.renderLoop?.requestRender();
    },
    [renderer, addLayerFromAsset],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      const types = Array.from(e.dataTransfer.types);
      if (
        types.includes('application/onion-asset') ||
        types.includes('Files')
      ) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDropHighlight(true);
      }
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDropHighlight(false);
  }, []);

  // Context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (renderer?.modalTransform?.active) return;
      ctxMenu.open(e, buildViewportContextMenu());
    },
    [renderer, ctxMenu],
  );

  // Derived values
  const cameraManager = renderer?.cameraManager ?? null;
  const modalTransform = renderer?.modalTransform ?? null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        // Use a hard dark color as the fallback so the panel never shows a
        // blue-tinted parent CSS variable while the WebGL canvas loads.
        background: '#000000',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Composition bounds background */}
      {comp && (
        <CompBoundsCSS
          comp={comp}
          viewportSize={viewportSize}
          cameraManager={cameraManager}
          zoom={state.zoom}
        />
      )}

      {/* Three.js canvas container */}
      <div
        ref={setContainer}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'transparent',
        }}
        onContextMenu={handleContextMenu}
      />

      {/* Navigation breadcrumb */}
      {comp && <Breadcrumb />}

      {/* Viewport toolbar */}
      {comp && (
        <ViewportToolbar
          showGrid={
            useViewportStore.getState().settings.showGrid
          }
          setShowGrid={() =>
            useViewportStore.getState().toggleGrid()
          }
          showAnchorPoints={showAnchorPoints}
          setShowAnchorPoints={(v) =>
            useViewportStore
              .getState()
              .setShowAnchorPoints(v)
          }
          renderer={renderer}
        />
      )}

      {/* Rulers + Guides */}
      {comp && (showRulers || showGuides) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          {showRulers && viewportSize.width > 0 && (
            <Rulers
              zoom={state.zoom}
              viewportSize={viewportSize}
              cameraManager={cameraManager}
            />
          )}
          {showGuides && <Guides viewportSize={viewportSize} />}
        </div>
      )}

      {/* All SVG/HTML overlays */}
      {comp && (
        <ViewportOverlays
          cameraManager={cameraManager}
          viewportSize={viewportSize}
          modalTransform={modalTransform}
          renderer={renderer}
          isFreeView={isFreeView}
        />
      )}

      {/* Contextual toolbars */}
      {comp && <ShapeContextToolbar />}
      {comp && <MaskContextToolbar />}

      {/* Axis gizmo */}
      {comp && <AxisGizmo onAxisClick={() => {}} />}

      {/* HUD */}
      {comp && (
        <ViewportHUD
          zoom={state.zoom}
          viewportSize={viewportSize}
          selectedLayerIds={viewportState.selectedLayerIds}
          transformMode={viewportState.transformMode}
          onZoomChange={(z) => {
            if (renderer) {
              renderer.cameraManager.setZoom(z);
              renderer.renderLoop.requestRender();
            }
          }}
          onFitToViewport={() => {
            renderer?.cameraManager.fitToComposition();
          }}
        />
      )}

      {/* Empty state */}
      {comp && comp.layers.length === 0 && <EmptyState />}

      {/* Drop highlight */}
      {dropHighlight && <DropHighlight />}

      {/* Context menu */}
      {ctxMenu.menu && (
        <ContextMenu
          items={ctxMenu.menu.items}
          position={ctxMenu.menu.position}
          onClose={ctxMenu.close}
        />
      )}

      {/* Performance HUD (Shift+F to toggle) */}
      <PerfHUD />
    </div>
  );
};

export default ViewportPanel;