import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useRenderer } from './hooks/useRenderer';
import { ViewportOverlay } from './ViewportOverlay';
import { ViewportHUD } from './ViewportHUD';
import { Rulers } from './Rulers';
import { Guides } from './Guides';
import { useCompositionStore } from '../../../state/compositionStore';

export const ViewportPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });

  // Track container size
  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [updateSize]);

  // Mount the Three.js renderer into the container
  const { ready, state, zoomToFit } = useRenderer({
    container: containerRef.current,
  });

  // Zoom to fit when composition changes
  useEffect(() => {
    if (ready && comp) {
      zoomToFit();
    }
  }, [ready, comp, zoomToFit]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[var(--viewport-bg)]">
      {/* Three.js canvas container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ zIndex: 1 }}
      />

      {/* Composition bounds indicator for when no composition is loaded */}
      {!comp && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-text-disabled">
            <span className="text-ui-lg font-medium">Viewport</span>
            <span className="text-ui-sm">— Phase 2 —</span>
            <span className="text-ui-xs">
              No composition selected. Create one from File &gt; New.
            </span>
          </div>
        </div>
      )}

      {/* Rulers (top + left) — only when composition is loaded */}
      {comp && viewportSize.width > 0 && (
        <div className="absolute inset-0 z-20" style={{ pointerEvents: 'none' }}>
          <Rulers
            zoom={state.zoom}
            viewportSize={viewportSize}
            rulerSize={20}
          />
        </div>
      )}

      {/* Grid overlay */}
      {comp && viewportSize.width > 0 && (
        <div className="absolute inset-0 z-15" style={{ pointerEvents: 'none' }}>
          <ViewportOverlay
            zoom={state.zoom}
            viewportSize={viewportSize}
          />
        </div>
      )}

      {/* Guide lines */}
      {comp && (
        <div className="absolute inset-0 z-20" style={{ pointerEvents: 'none' }}>
          <Guides viewportSize={viewportSize} />
        </div>
      )}

      {/* HUD at bottom */}
      {comp && (
        <ViewportHUD fps={state.fps} zoom={state.zoom} />
      )}

      {/* Resolution watermark (backup when no composition) */}
      {!comp && (
        <span className="absolute bottom-2 right-2 text-ui-xs text-text-disabled/40 pointer-events-none z-10">
          1920×1080 | 30fps
        </span>
      )}
    </div>
  );
};

export default ViewportPanel;
