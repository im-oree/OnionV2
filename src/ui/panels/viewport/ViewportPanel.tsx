import React, { useRef, useCallback, useEffect } from 'react';
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
import { ContextMenu } from '../../common/ContextMenu';
import { useContextMenu } from '../../common/useContextMenu';
import { buildViewportContextMenu, buildInsertKeyframeMenu } from './contextMenus';
import { Breadcrumb } from './Breadcrumb';
import { GradientOverlay } from './GradientOverlay';
import { CompBoundsCSS } from './CompBoundsCSS';

export const ViewportPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isHovering = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const viewportSize = useViewportSize(containerRef as React.RefObject<HTMLElement | null>);
  const { state, viewportState, renderer } = useRenderer(containerRef.current);

  useCursor(renderer?.canvas ?? null);

  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });

  const showRulers = useViewportStore((s) => s.settings.showRulers);
  const showGuides = useViewportStore((s) => s.settings.showGuides);
  const ctxMenu = useContextMenu();

  useViewportInput({
    canvas: renderer?.canvas ?? null,
    cameraManager: renderer?.cameraManager ?? null,
    hitTester: renderer?.hitTester ?? null,
    modalTransform: renderer?.modalTransform ?? null,
    requestRender: renderer ? () => renderer.renderLoop.requestRender() : undefined,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const enter = () => { isHovering.current = true; };
    const leave = () => { isHovering.current = false; };
    const move = (e: MouseEvent) => { lastMouse.current = { x: e.clientX, y: e.clientY }; };
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    el.addEventListener('mousemove', move);
    return () => {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
      el.removeEventListener('mousemove', move);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'i' && e.key !== 'I') return;
      if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!isHovering.current) return;
      const items = buildInsertKeyframeMenu();
      if (items.length === 0) { console.warn('[Insert Keyframe] No layer selected'); return; }
      e.preventDefault();
      ctxMenu.open({ clientX: lastMouse.current.x, clientY: lastMouse.current.y }, items);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ctxMenu]);

  const handleCtx = useCallback((e: React.MouseEvent) => {
    if (renderer?.modalTransform?.active) return;
    ctxMenu.open(e, buildViewportContextMenu());
  }, [renderer, ctxMenu]);

  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{ background: 'var(--color-app-bg)' }}
    >
      {/* Layer 0: CSS-based comp bounds (bottom) */}
      {comp && (
        <CompBoundsCSS
          comp={comp}
          viewportSize={viewportSize}
          cameraManager={renderer?.cameraManager ?? null}
          zoom={state.zoom}
        />
      )}

      {/* Layer 1: Three.js canvas (transparent, on top of bounds) */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ zIndex: 1 }}
        onContextMenu={handleCtx}
      />

      {/* Layer 2+: overlays */}
      {comp && <Breadcrumb />}

      {comp && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {showRulers && viewportSize.width > 0 && (
            <Rulers zoom={state.zoom} viewportSize={viewportSize} cameraManager={renderer?.cameraManager ?? null} />
          )}
          {showGuides && <Guides viewportSize={viewportSize} />}
        </div>
      )}

      {comp && (
        <GradientOverlay
          cameraManager={renderer?.cameraManager ?? null}
          viewportSize={viewportSize}
        />
      )}

      {comp && <AxisGizmo />}
      {comp && <TransformHUD modalTransform={renderer?.modalTransform ?? null} cameraManager={renderer?.cameraManager ?? null} />}

      {comp && comp.layers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center opacity-50">
            <p className="text-[12px] text-text-disabled">Add a layer from the Add menu, or drag files here</p>
          </div>
        </div>
      )}

      {comp && (
        <ViewportHUD
          fps={state.fps} zoom={state.zoom} viewportSize={viewportSize}
          selectedLayerIds={viewportState.selectedLayerIds}
          transformMode={viewportState.transformMode}
          onZoomChange={(z) => { if (renderer) { renderer.cameraManager.setZoom(z); renderer.renderLoop.requestRender(); } }}
          onFitToViewport={() => { if (renderer) renderer.cameraManager.fitToComposition(); }}
        />
      )}

      {ctxMenu.menu && (
        <ContextMenu items={ctxMenu.menu.items} position={ctxMenu.menu.position} onClose={ctxMenu.close} />
      )}
    </div>
  );
};

export default ViewportPanel;
