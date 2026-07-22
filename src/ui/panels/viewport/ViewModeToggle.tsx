/**
 * ViewModeToggle — switches between "Active Camera" and "Free View".
 *
 * This component is now a thin wrapper that delegates to the ViewportToolbar.
 * If used standalone (outside ViewportToolbar), it provides the same
 * view mode toggle functionality without window globals.
 */
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useViewportStore } from '../../../state/viewportStore';

interface Props {
  renderer?: {
    cameraManager?: {
      isFreeView?: boolean;
      setFreeView?: (v: boolean) => void;
    };
    renderLoop?: {
      requestRender?: () => void;
    };
    sceneManager?: {
      grid?: {
        show: () => void;
      };
    };
  } | null;
}

// ── Icons ────────────────────────────────────────────────────

const CameraIcon: React.FC = () => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="1" y="3" width="9" height="8" rx="1.5" />
    <path d="M10 6l3-2v6l-3-2" />
  </svg>
);

const OrbitIcon: React.FC = () => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="7" cy="7" r="5" />
    <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    <line x1="7" y1="2" x2="7" y2="4" />
    <line x1="7" y1="10" x2="7" y2="12" />
    <line x1="2" y1="7" x2="4" y2="7" />
    <line x1="10" y1="7" x2="12" y2="7" />
  </svg>
);

// ── Tooltip ──────────────────────────────────────────────────

const SimpleTooltip: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleEnter = useCallback(() => {
    setShow(true);
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 6,
      });
    }
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
      style={{ display: 'inline-flex' }}
    >
      {children}
      {show && (
        <div
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            transform: 'translateX(-50%)',
            padding: '4px 10px',
            background: 'rgba(15,15,20,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            fontSize: 10,
            fontFamily: 'system-ui, sans-serif',
            color: 'rgba(255,255,255,0.8)',
            whiteSpace: 'nowrap',
            zIndex: 100,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            maxWidth: 220,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

// ── Main component ──────────────────────────────────────────

export const ViewModeToggle: React.FC<Props> = ({
  renderer = null,
}) => {
  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? (s.compositions.find(
          (c) => c.id === s.activeCompositionId,
        ) ?? null)
      : null,
  );

  const [isFreeView, setIsFreeView] = useState(false);
  const gridAutoEnabled = useRef(false);

  // Sync free view state from renderer
  useEffect(() => {
    const update = () => {
      const free = !!(renderer?.cameraManager as any)
        ?.isFreeView;
      setIsFreeView(free);
    };

    document.addEventListener('viewport:viewmode', update);
    update();

    return () => {
      document.removeEventListener('viewport:viewmode', update);
    };
  }, [renderer]);

  // Auto-enable grid when entering 3D perspective mode
  useEffect(() => {
    if (!comp?.perspective3D) {
      gridAutoEnabled.current = false;
      return;
    }

    if (gridAutoEnabled.current) return;
    gridAutoEnabled.current = true;

    // Enable grid in store
    const settings = useViewportStore.getState().settings;
    if (!settings.showGrid) {
      useViewportStore.getState().toggleGrid();
    }

    // Show grid in renderer
    renderer?.sceneManager?.grid?.show();
    renderer?.renderLoop?.requestRender?.();
  }, [comp?.perspective3D, renderer]);

  const toggle = useCallback(() => {
    const next = !isFreeView;

    // Update renderer
    if (renderer?.cameraManager?.setFreeView) {
      renderer.cameraManager.setFreeView(next);
    }

    setIsFreeView(next);

    // Notify other components
    document.dispatchEvent(
      new CustomEvent('viewport:viewmode', {
        detail: { free: next },
      }),
    );

    renderer?.renderLoop?.requestRender?.();
  }, [isFreeView, renderer]);

  // Only show in 3D perspective mode
  if (!comp?.perspective3D) return null;

  const isFree = isFreeView;

  return (
    <SimpleTooltip
      label={
        isFree
          ? 'Free View — orbit the scene. Click to switch to camera view.'
          : 'Camera View — see through the scene camera. Click to orbit freely.'
      }
    >
      <button
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '0.3px',
          cursor: 'pointer',
          border: `1px solid ${
            isFree
              ? 'rgba(85,200,80,0.3)'
              : 'rgba(74,144,226,0.3)'
          }`,
          borderRadius: 5,
          background: isFree
            ? 'rgba(85,200,80,0.1)'
            : 'rgba(74,144,226,0.1)',
          color: isFree ? '#55cc50' : '#4A90E2',
          transition: 'all 0.15s ease',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.background = isFree
            ? 'rgba(85,200,80,0.18)'
            : 'rgba(74,144,226,0.18)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.background = isFree
            ? 'rgba(85,200,80,0.1)'
            : 'rgba(74,144,226,0.1)';
        }}
      >
        {isFree ? <OrbitIcon /> : <CameraIcon />}
        <span>
          {isFree ? 'Free View' : 'Camera'}
        </span>
      </button>
    </SimpleTooltip>
  );
};