/**
 * ViewportToolbar â€” Blender-style right-side rail with viewport-nav buttons.
 */
import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  Hand,
  ZoomIn,
  ZoomOut,
  Camera,
  Orbit,
  Move3D,
  Grid3X3,
  Gauge,
} from 'lucide-react';
import { useViewportStore } from '../../../state/viewportStore';
import { useToolStore } from '../../../state/toolStore';
import { useCompositionStore } from '../../../state/compositionStore';
import {
  usePreviewResolutionStore,
  PREVIEW_SCALE_LABELS,
  type PreviewScale,
} from '../../../state/previewResolutionStore';
import { TOOLS } from '../../../config/constants';
import { cameraController, type ViewMode } from '../../../renderer/CameraController';
import { useRendererBackendStore } from '../../../state/rendererBackendStore';
import type { BackendId } from '../../../renderer/backend/RenderBackend';

interface Props {
  showGrid?: boolean;
  setShowGrid?: (v: boolean) => void;
  showAnchorPoints?: boolean;
  setShowAnchorPoints?: (v: boolean) => void;
  renderer: {
    cameraManager?: {
      isFreeView?: boolean;
      setFreeView?: (v: boolean) => void;
      zoom?: number;
      setZoom?: (z: number) => void;
    };
    renderLoop?: {
      requestRender?: () => void;
    };
    setGridVisible?: (v: boolean) => void;
  } | null;
}

const RailBtn: React.FC<{
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}> = React.memo(({ active, title, onClick, children }) => (
  <button
    className={`viewport-rail-btn ${active ? 'active' : ''}`}
    onClick={onClick}
    title={title}
  >
    {children}
  </button>
));
RailBtn.displayName = 'RailBtn';

const PreviewScaleMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scale = usePreviewResolutionStore((s) => s.scale);
  const playbackScale = usePreviewResolutionStore((s) => s.playbackScale);
  const autoDrop = usePreviewResolutionStore((s) => s.autoDropOnPlayback);
  const setScale = usePreviewResolutionStore((s) => s.setScale);
  const setPlaybackScale = usePreviewResolutionStore((s) => s.setPlaybackScale);
  const setAutoDrop = usePreviewResolutionStore((s) => s.setAutoDropOnPlayback);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const scales: PreviewScale[] = [1, 0.5, 0.333, 0.25];

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        className={`viewport-rail-btn ${open ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title={`Preview Resolution (${PREVIEW_SCALE_LABELS[scale]})`}
      >
        <Gauge size={14} strokeWidth={1.8} />
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: 40,
            top: 0,
            background: 'rgba(22,24,32,0.96)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            padding: 6,
            minWidth: 180,
            boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            fontSize: 11,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              padding: '4px 6px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Preview Resolution
          </div>
          {scales.map((s) => (
            <button
              key={s}
              onClick={(e) => {
                e.stopPropagation();
                setScale(s);
              }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '5px 8px',
                border: 'none',
                borderRadius: 4,
                background: scale === s ? 'rgba(88,101,255,0.22)' : 'transparent',
                color: scale === s ? '#8b95ff' : 'inherit',
                cursor: 'pointer',
                fontSize: 11,
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (scale !== s) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                }
              }}
              onMouseLeave={(e) => {
                if (scale !== s) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <span>{PREVIEW_SCALE_LABELS[s]}</span>
              <span style={{ opacity: 0.5, fontSize: 9 }}>
                {s === 1 ? '100%' : `${Math.round(s * 100)}%`}
              </span>
            </button>
          ))}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 8px',
              cursor: 'pointer',
              fontSize: 10,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <input
              type="checkbox"
              checked={autoDrop}
              onChange={(e) => {
                e.stopPropagation();
                setAutoDrop(e.target.checked);
              }}
              style={{ cursor: 'pointer' }}
            />
            Auto-drop on playback
          </label>

          {autoDrop && (
            <div style={{ padding: '2px 8px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Playback scale</div>
              <div style={{ display: 'flex', gap: 2 }}>
                {scales.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaybackScale(s);
                    }}
                    style={{
                      flex: 1,
                      padding: '3px 4px',
                      fontSize: 9,
                      border: 'none',
                      borderRadius: 3,
                      cursor: 'pointer',
                      background:
                        playbackScale === s
                          ? 'rgba(88,101,255,0.22)'
                          : 'rgba(255,255,255,0.04)',
                      color:
                        playbackScale === s ? '#8b95ff' : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {PREVIEW_SCALE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ViewportToolbar: React.FC<Props> = ({ renderer }) => {
  const [viewMode, setViewMode] = useState<ViewMode>(cameraController.mode);
  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const showGrid = useViewportStore((s) => s.settings.showGrid);
  const toggleGrid = useViewportStore((s) => s.toggleGrid);
  const cameraViewZoom = useViewportStore((s) => s.settings.cameraViewZoom);
  const setCameraViewZoom = useViewportStore((s) => s.setCameraViewZoom);
  const flyMode = useViewportStore((s) => s.settings.flyMode);

  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null
      : null,
  );
  const is3D = comp?.perspective3D ?? false;
  const isFreeView = viewMode === 'freeView';
  const moveWithView = comp?.cameraMoveWithView ?? false;

  // Subscribe to camera controller mode changes
  useEffect(() => {
    const unsub = cameraController.onModeChange((mode) => setViewMode(mode));
    return unsub;
  }, []);

  const requestRender = useCallback(() => {
    renderer?.renderLoop?.requestRender?.();
  }, [renderer]);

  const toggleView = useCallback(() => {
    cameraController.toggleMode();
    requestRender();
  }, [requestRender]);

  const toggleMoveWithView = useCallback(() => {
    if (!comp) return;
    useCompositionStore.getState().updateComposition(comp.id, {
      cameraMoveWithView: !moveWithView,
    });
    requestRender();
  }, [comp, moveWithView, requestRender]);

  const zoomIn = useCallback(() => {
    if (is3D && !isFreeView) {
      setCameraViewZoom(cameraViewZoom * 1.15);
    } else if (is3D && isFreeView) {
      cameraController.dolly(-3, comp?.cameraInvertZoom ?? false);
    } else if (renderer?.cameraManager) {
      const cm = renderer.cameraManager;
      cm.setZoom?.((cm.zoom ?? 1) * 1.15);
    }
    requestRender();
  }, [is3D, isFreeView, cameraViewZoom, setCameraViewZoom, renderer, requestRender, comp]);

  const zoomOut = useCallback(() => {
    if (is3D && !isFreeView) {
      setCameraViewZoom(cameraViewZoom / 1.15);
    } else if (is3D && isFreeView) {
      cameraController.dolly(3, comp?.cameraInvertZoom ?? false);
    } else if (renderer?.cameraManager) {
      const cm = renderer.cameraManager;
      cm.setZoom?.((cm.zoom ?? 1) / 1.15);
    }
    requestRender();
  }, [is3D, isFreeView, cameraViewZoom, setCameraViewZoom, renderer, requestRender, comp]);

  const toggleHand = useCallback(() => {
    if (activeTool === TOOLS.HAND) setActiveTool(TOOLS.SELECT as any);
    else setActiveTool(TOOLS.HAND as any);
  }, [activeTool, setActiveTool]);

  const toggleGridClick = useCallback(() => {
    toggleGrid();
    renderer?.setGridVisible?.(!showGrid);
    requestRender();
  }, [toggleGrid, showGrid, renderer, requestRender]);

  const toggleFly = useCallback(() => {
    useViewportStore.getState().toggleFlyMode();
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'F', shiftKey: true, bubbles: true,
    }));
  }, []);

  return (
    <div className="viewport-rail">
      <RailBtn title="Zoom In" onClick={zoomIn}>
        <ZoomIn size={14} strokeWidth={1.8} />
      </RailBtn>
      <RailBtn title="Zoom Out" onClick={zoomOut}>
        <ZoomOut size={14} strokeWidth={1.8} />
      </RailBtn>
      <RailBtn
        title="Pan (Hand)"
        active={activeTool === TOOLS.HAND}
        onClick={toggleHand}
      >
        <Hand size={14} strokeWidth={1.8} />
      </RailBtn>

      {is3D && (
        <button
          onClick={toggleView}
          title={
            isFreeView
              ? 'Free View — orbit scene freely. Click for Active Camera.'
              : 'Active Camera — through comp camera. Click for Free View.'
          }
          className="viewport-rail-btn"
          style={{
            background: isFreeView
              ? 'rgba(74,222,128,0.22)'
              : 'rgba(74,144,226,0.22)',
            border: `1px solid ${
              isFreeView ? 'rgba(74,222,128,0.7)' : 'rgba(74,144,226,0.7)'
            }`,
            color: isFreeView ? '#4ade80' : '#4A90E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isFreeView
              ? '0 0 8px rgba(74,222,128,0.3)'
              : '0 0 8px rgba(74,144,226,0.3)',
          }}
        >
          {isFreeView ? (
            <Orbit size={14} strokeWidth={2.2} />
          ) : (
            <Camera size={14} strokeWidth={2.2} />
          )}
        </button>
      )}

      {is3D && !isFreeView && (
        <RailBtn
          title={
            moveWithView
              ? 'Move with View: ON — MMB/RMB/WASD move the comp camera'
              : 'Move with View: OFF — camera locked. Click to allow camera moves.'
          }
          active={moveWithView}
          onClick={toggleMoveWithView}
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none"
            stroke="currentColor" strokeWidth={1.8}
            strokeLinecap="round" strokeLinejoin="round">
            {moveWithView ? (
              <>
                <rect x="3" y="6" width="8" height="6" rx="1" />
                <path d="M5 6V4a2 2 0 0 1 4 0" />
              </>
            ) : (
              <>
                <rect x="3" y="6" width="8" height="6" rx="1" />
                <path d="M5 6V4a2 2 0 0 1 4 0v2" />
                <path d="M7 9v1" />
              </>
            )}
          </svg>
        </RailBtn>
      )}

      {is3D && (
        <RailBtn
          title={flyMode ? 'Exit Fly Mode (Shift+F)' : 'Fly Mode (Shift+F) — WASD + mouse look'}
          active={flyMode}
          onClick={toggleFly}
        >
          <Move3D size={14} strokeWidth={1.8} />
        </RailBtn>
      )}

      <RailBtn
        title={showGrid ? 'Hide Grid' : 'Show Grid'}
        active={showGrid}
        onClick={toggleGridClick}
      >
        <Grid3X3 size={14} strokeWidth={1.8} />
      </RailBtn>

      <PreviewScaleMenu />
    </div>
  );
};

const BackendPill: React.FC = () => {
  const actual = useRendererBackendStore(s => s.actualBackend);
  const preferred = useRendererBackendStore(s => s.preferredBackend);
  const swapping = useRendererBackendStore(s => s.swapping);
  const isWebGPU = actual === 'webgpu';
  const mismatch = actual !== preferred;

  const cycle = async () => {
    const target: BackendId = isWebGPU ? 'webgl' : 'webgpu';
    useRendererBackendStore.getState().setPreferredBackend(target);
    const r: any = (window as any).__renderer;
    if (r?.swapBackend) await r.swapBackend(target);
  };

  return (
    <button
      onClick={cycle}
      title={
        swapping
          ? 'Switching backend...'
          : mismatch
            ? `Preferred: ${preferred} · Active: ${actual}. Click to toggle.`
            : `Active backend: ${actual}. Click to toggle.`
      }
      className="viewport-rail-btn"
      style={{
        background: isWebGPU ? 'rgba(191,64,255,0.2)' : 'rgba(60,120,220,0.2)',
        border: `1px solid ${isWebGPU ? 'rgba(191,64,255,0.6)' : 'rgba(60,120,220,0.6)'}`,
        color: isWebGPU ? '#c37cff' : '#5cc0ff',
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.03em',
        fontFamily: 'var(--font-family-mono)',
        opacity: swapping ? 0.5 : 1,
        cursor: swapping ? 'wait' : 'pointer',
      }}
    >
      {isWebGPU ? 'GPU' : 'GL'}
    </button>
  );
};