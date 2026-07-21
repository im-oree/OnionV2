/**
 * CameraPreview — small thumbnail in the bottom-right corner of the viewport
 * when in Free View mode, showing what the composition camera actually sees.
 *
 * Uses Renderer.renderCameraPreview() to do a secondary render pass through
 * the composition's perspective camera (not the free-orbit camera).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';

export const CameraPreview: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);

  // Track Free View state
  useEffect(() => {
    const handler = () => {
      const isFree = !!(window as any).__freeViewMode;
      setVisible(isFree);
    };
    document.addEventListener('viewport:viewmode', handler);
    const interval = setInterval(handler, 500);
    handler();
    return () => {
      document.removeEventListener('viewport:viewmode', handler);
      clearInterval(interval);
    };
  }, []);

  // RAF-based preview capture — uses the composition camera
  useEffect(() => {
    if (!visible) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const renderer = (window as any).__renderer;
      const previewCanvas = canvasRef.current;
      if (renderer && previewCanvas) {
        // Throttle to ~15fps to avoid performance impact
        const now = performance.now();
        if (now - lastFrameRef.current > 66) {
          lastFrameRef.current = now;
          try {
            renderer.renderCameraPreview(previewCanvas);
          } catch {
            // Silently ignore render errors during rapid updates
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [visible]);

  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null
  );

  if (!visible || !comp?.perspective3D) return null;

  const previewW = 200;
  const previewH = Math.round(previewW / (comp.width / comp.height));

  return (
    <div
      className="absolute z-30"
      style={{
        bottom: 40,
        right: 8,
        width: previewW,
        height: previewH,
        border: '2px solid var(--color-accent)',
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        background: '#000',
      }}
    >
      <canvas
        ref={canvasRef}
        width={previewW}
        height={previewH}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: 4,
          fontSize: 9,
          color: 'rgba(255,255,255,0.6)',
          fontFamily: 'var(--font-family-mono, monospace)',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        Camera View
      </div>
    </div>
  );
};

export default CameraPreview;
