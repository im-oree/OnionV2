/**
 * ViewportPanel — the main viewport area.
 * Two-layer approach: Three.js canvas for rendering, SVG/HTML overlay for HUD/rulers/guides.
 */
import React, { useRef } from 'react';
import { useRenderer } from './hooks/useRenderer';
import { useViewportInput } from './hooks/useViewportInput';
import { useViewportSize } from './hooks/useViewportSize';
import { ViewportHUD } from './ViewportHUD';
import { TransformHUD } from './TransformHUD';
import { Rulers } from './Rulers';
import { Guides } from './Guides';
import { useCompositionStore } from '../../../state/compositionStore';
import { useViewportStore } from '../../../state/viewportStore';
import { STRINGS } from './strings';

export const ViewportPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportSize = useViewportSize(containerRef as React.RefObject<HTMLElement | null>);
  const { state, viewportState, renderer } = useRenderer(containerRef.current);

  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });

  const showRulers = useViewportStore((s) => s.settings.showRulers);
  const showGuides = useViewportStore((s) => s.settings.showGuides);
  const showStats = useViewportStore((s) => s.settings.showStats);

  // Mount viewport input (pan/zoom/select/transform) on the canvas
  useViewportInput({
    canvas: renderer?.canvas ?? null,
    cameraManager: renderer?.cameraManager ?? null,
    hitTester: renderer?.hitTester ?? null,
    modalTransform: renderer?.modalTransform ?? null,
  });

  return (
    <div className="w-full h-full relative overflow-hidden bg-[var(--viewport-bg)]">
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {!comp && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-text-disabled">
            <span className="text-ui-lg font-medium">{STRINGS.title}</span>
            <span className="text-ui-sm">{STRINGS.placeholder}</span>
            <span className="text-ui-xs">{STRINGS.noComp}</span>
          </div>
        </div>
      )}

      {comp && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {showRulers && viewportSize.width > 0 && (
            <Rulers zoom={state.zoom} viewportSize={viewportSize} cameraManager={renderer?.cameraManager ?? null} />
          )}
          {showGuides && <Guides viewportSize={viewportSize} />}
        </div>
      )}

      {comp && (
        <TransformHUD modalTransform={renderer?.modalTransform ?? null} cameraManager={renderer?.cameraManager ?? null} />
      )}

      {comp && (
        <ViewportHUD
          fps={state.fps}
          zoom={state.zoom}
          showStats={showStats}
          viewportSize={viewportSize}
          selectedLayerIds={viewportState.selectedLayerIds}
          transformMode={viewportState.transformMode}
          onZoomChange={(z) => {
            const r = renderer;
            if (r) {
              r.cameraManager.setZoom(z);
              r.renderLoop.requestRender();
            }
          }}
          onFitToViewport={() => {
            const r = renderer;
            if (r) r.cameraManager.fitToComposition();
          }}
        />
      )}

      {!comp && (
        <span className="absolute bottom-2 right-2 text-ui-xs text-text-disabled/40 pointer-events-none z-10">
          1920×1080 | 30fps
        </span>
      )}
    </div>
  );
};

export default ViewportPanel;
