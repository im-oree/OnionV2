/**
 * CameraPreview — resizable, hideable thumbnail showing what the
 * composition camera sees while in Free View mode.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useCompositionStore } from '../../../state/compositionStore';

interface Props {
  /** Whether the viewport is currently in free-view (orbit) mode */
  isFreeView: boolean;
  /** Reference to the renderer instance (avoids window global) */
  renderer: {
    renderCameraPreview: (
      canvas: HTMLCanvasElement,
      width: number,
      height: number,
    ) => void;
  } | null;
}

// ── Constants ────────────────────────────────────────────────

const MIN_WIDTH = 120;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 220;
const PREVIEW_FPS = 15;
const FRAME_INTERVAL = 1000 / PREVIEW_FPS;

const RESIZE_HANDLES = ['top', 'left', 'top-left'] as const;
type ResizeHandle = (typeof RESIZE_HANDLES)[number];

// ── Main component ──────────────────────────────────────────

export const CameraPreview: React.FC<Props> = ({
  isFreeView,
  renderer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hidden, setHidden] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(DEFAULT_WIDTH);

  // Drag resize state
  const resizeRef = useRef<{
    handle: ResizeHandle;
    startX: number;
    startY: number;
    startWidth: number;
  } | null>(null);

  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? (s.compositions.find(
          (c) => c.id === s.activeCompositionId,
        ) ?? null)
      : null,
  );

  const compAspect = useMemo(() => {
    if (!comp || comp.width <= 0 || comp.height <= 0) return 16 / 9;
    return comp.width / comp.height;
  }, [comp?.width, comp?.height]);

  const previewHeight = Math.round(previewWidth / compAspect);

  const visible = isFreeView && !!comp?.perspective3D && !hidden;

  // ── Render loop ───────────────────────────────────────────

  useEffect(() => {
    if (!visible || !renderer) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const canvas = canvasRef.current;

      if (canvas && renderer) {
        const now = performance.now();

        if (now - lastFrameRef.current >= FRAME_INTERVAL) {
          lastFrameRef.current = now;

          // Ensure canvas buffer matches display size
          if (
            canvas.width !== previewWidth ||
            canvas.height !== previewHeight
          ) {
            canvas.width = previewWidth;
            canvas.height = previewHeight;
          }

          try {
            renderer.renderCameraPreview(
              canvas,
              previewWidth,
              previewHeight,
            );
          } catch {
            // ignore render errors during rapid updates
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
  }, [visible, renderer, previewWidth, previewHeight]);

  // ── Resize handling ───────────────────────────────────────

  const handleResizeStart = useCallback(
    (handle: ResizeHandle, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      resizeRef.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: previewWidth,
      };

      const onMove = (ev: MouseEvent) => {
        const r = resizeRef.current;
        if (!r) return;

        let delta = 0;

        if (r.handle === 'left' || r.handle === 'top-left') {
          // Dragging left edge: moving left = larger
          delta = r.startX - ev.clientX;
        }

        if (r.handle === 'top' || r.handle === 'top-left') {
          // Dragging top edge: moving up = larger
          const dy = r.startY - ev.clientY;
          delta = Math.max(delta, dy * compAspect);
        }

        const newWidth = Math.round(
          Math.max(
            MIN_WIDTH,
            Math.min(MAX_WIDTH, r.startWidth + delta),
          ),
        );

        setPreviewWidth(newWidth);
      };

      const onUp = () => {
        resizeRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [previewWidth, compAspect],
  );

  // ── Show button when hidden ───────────────────────────────

  if (isFreeView && comp?.perspective3D && hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        style={{
          position: 'absolute',
          bottom: 44,
          right: 8,
          zIndex: 30,
          padding: '4px 10px',
          fontSize: 10,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.7)',
          background: 'rgba(30,30,30,0.85)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 4,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.15s',
          pointerEvents: 'all',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.color =
            'rgba(255,255,255,0.95)';
          (e.target as HTMLElement).style.borderColor =
            'rgba(74,144,226,0.5)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.color =
            'rgba(255,255,255,0.7)';
          (e.target as HTMLElement).style.borderColor =
            'rgba(255,255,255,0.15)';
        }}
      >
        ⎚ Show Camera Preview
      </button>
    );
  }

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        bottom: 44,
        right: 8,
        zIndex: 30,
        width: previewWidth,
        height: previewHeight,
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        background: '#111',
        pointerEvents: 'all',
      }}
    >
      {/* Resize handles */}
      {/* Top edge */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 12,
          right: 0,
          height: 6,
          cursor: 'ns-resize',
          zIndex: 3,
        }}
        onMouseDown={(e) => handleResizeStart('top', e)}
      />

      {/* Left edge */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 0,
          width: 6,
          bottom: 0,
          cursor: 'ew-resize',
          zIndex: 3,
        }}
        onMouseDown={(e) => handleResizeStart('left', e)}
      />

      {/* Top-left corner */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 14,
          height: 14,
          cursor: 'nwse-resize',
          zIndex: 4,
        }}
        onMouseDown={(e) => handleResizeStart('top-left', e)}
      >
        {/* Visual resize grip */}
        <svg
          width={10}
          height={10}
          style={{ position: 'absolute', top: 2, left: 2 }}
        >
          <line
            x1={0} y1={8} x2={8} y2={0}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
          <line
            x1={0} y1={5} x2={5} y2={0}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
        </svg>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={previewWidth}
        height={previewHeight}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Header bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '3px 6px 3px 8px',
          background: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0))',
          pointerEvents: 'all',
        }}
      >
        {/* Label */}
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            userSelect: 'none',
          }}
        >
          Camera View
        </span>

        {/* Hide button */}
        <button
          onClick={() => setHidden(true)}
          title="Hide camera preview"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 14,
            cursor: 'pointer',
            padding: '0 2px',
            lineHeight: 1,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.color =
              'rgba(255,255,255,0.9)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.color =
              'rgba(255,255,255,0.4)';
          }}
        >
          ✕
        </button>
      </div>

      {/* Resolution label */}
      {comp && (
        <div
          style={{
            position: 'absolute',
            bottom: 3,
            right: 6,
            fontSize: 8,
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'system-ui, sans-serif',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {comp.width}×{comp.height}
        </div>
      )}
    </div>
  );
};

export default CameraPreview;