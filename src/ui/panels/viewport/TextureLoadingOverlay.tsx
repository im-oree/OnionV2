/**
 * TextureLoadingOverlay — renders a subtle CSS loading spinner on each
 * image layer whose texture is still being fetched.
 *
 * Listens for CustomEvent 'layer:texture-loading' dispatched by
 * ImageLayerRenderer when a load starts (detail.loading === true) or
 * finishes (detail.loading === false). On each RAF tick the overlay
 * reads the active composition to find loading layers, converts their
 * world-space positions to screen coordinates via CameraManager, and
 * renders a small spinner for each one.
 *
 * Performance: the RAF loop only runs while at least one layer is
 * loading. It starts when a loading event arrives and stops when the
 * set empties. State updates are skipped when screen positions haven't
 * changed, avoiding unnecessary React re-renders.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { CameraManager } from '../../../renderer/CameraManager';
import { useCompositionStore } from '../../../state/compositionStore';

interface SpinnerPosition {
  layerId: string;
  screenX: number;
  screenY: number;
}

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

export const TextureLoadingOverlay: React.FC<Props> = ({
  cameraManager,
  viewportSize,
}) => {
  const loadingRef = useRef<Set<string>>(new Set());
  const prevPositionsRef = useRef<SpinnerPosition[]>([]);
  const [spinners, setSpinners] = useState<SpinnerPosition[]>([]);
  const rafRef = useRef<number | null>(null);
  const cameraRef = useRef(cameraManager);
  const viewportRef = useRef(viewportSize);

  // Keep refs in sync without re-starting RAF
  cameraRef.current = cameraManager;
  viewportRef.current = viewportSize;

  // ── RAF tick function ──
  // Defined as a standalone function so the event listener can call it
  // without creating a stale closure over state variables. All mutable
  // values are accessed via refs.
  const tick = () => {
    const loading = loadingRef.current;
    const cm = cameraRef.current;
    const vpSize = viewportRef.current;

    if (loading.size === 0 || !cm) {
      rafRef.current = null; // stop RAF
      if (prevPositionsRef.current.length > 0) {
        prevPositionsRef.current = [];
        setSpinners([]);
      }
      return;
    }

    const cs = useCompositionStore.getState();
    const comp = cs.activeCompositionId
      ? cs.compositions.find(c => c.id === cs.activeCompositionId)
      : null;

    if (!comp) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // Build current positions
    const positions: SpinnerPosition[] = [];
    for (const layerId of loading) {
      const layer = comp.layers.find(l => l.id === layerId);
      if (!layer) {
        loading.delete(layerId); // layer was removed
        continue;
      }

      const screen = cm.worldToScreen(
        layer.transform.position.x,
        layer.transform.position.y,
      );

      if (
        screen.x >= -20 && screen.x <= vpSize.width + 20 &&
        screen.y >= -20 && screen.y <= vpSize.height + 20
      ) {
        positions.push({ layerId, screenX: screen.x, screenY: screen.y });
      }
    }

    // Diff against previous positions to avoid unnecessary setState
    const prev = prevPositionsRef.current;
    let changed = prev.length !== positions.length;
    if (!changed) {
      for (let i = 0; i < positions.length; i++) {
        if (
          prev[i].layerId !== positions[i].layerId ||
          Math.abs(prev[i].screenX - positions[i].screenX) > 0.5 ||
          Math.abs(prev[i].screenY - positions[i].screenY) > 0.5
        ) {
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      prevPositionsRef.current = positions;
      setSpinners(positions);
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  // ── Event listener: track loading layer IDs + start/stop RAF ──
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        { layerId: string; loading: boolean } | undefined;
      if (!detail) return;
      const set = loadingRef.current;
      if (detail.loading) {
        set.add(detail.layerId);
        // Start RAF if not already running
        if (rafRef.current === null && cameraRef.current) {
          rafRef.current = requestAnimationFrame(tick);
        }
      } else {
        set.delete(detail.layerId);
        // If nothing is loading anymore, stop RAF and clear immediately
        if (set.size === 0 && rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          if (prevPositionsRef.current.length > 0) {
            prevPositionsRef.current = [];
            setSpinners([]);
          }
        }
      }
    };
    document.addEventListener('layer:texture-loading', handler);
    return () => {
      document.removeEventListener('layer:texture-loading', handler);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []); // stable mount — useLayoutEffect would also work

  // Removed — tick is defined above before the event listener

  if (spinners.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 23, width: '100%', height: '100%' }}
    >
      <defs>
        <style>{`@keyframes texture-load-spin { to { transform: rotate(360deg); } }`}</style>
      </defs>
      {spinners.map((s) => (
        <g key={s.layerId}>
          {/* Subtle translucent circle background */}
          <circle
            cx={s.screenX}
            cy={s.screenY}
            r={14}
            fill="rgba(0,0,0,0.45)"
          />
          {/* White spinner ring via foreignObject + CSS animation */}
          <foreignObject
            x={s.screenX - 10}
            y={s.screenY - 10}
            width={20}
            height={20}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.15)',
                borderTopColor: '#ffffff',
                animation: 'texture-load-spin 0.7s linear infinite',
              }}
            />
          </foreignObject>
        </g>
      ))}
    </svg>
  );
};

export default TextureLoadingOverlay;
