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
  const [isFreeView, setIsFreeView] = useState(false);
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

  useEffect(() => {
    const update = () => {
      setIsFreeView(
        !!(renderer?.cameraManager as any)?.isFreeView ??
          !!(window as any).__freeViewMode,
      );
    };
    document.addEventListener('viewport:viewmode', update);
    update();
    return () => document.removeEventListener('viewport:viewmode', update);
  }, [renderer]);

  const requestRender = useCallback(() => {
    renderer?.renderLoop?.requestRender?.();
  }, [renderer]);

  const toggleView = useCallback(() => {
    const next = !isFreeView;
    (window as any).__freeViewMode = next;
    if (renderer?.cameraManager?.setFreeView) {
      renderer.cameraManager.setFreeView(next);
    }
    setIsFreeView(next);
    document.dispatchEvent(new CustomEvent('viewport:viewmode', { detail: { free: next } }));
    requestRender();
  }, [isFreeView, renderer, requestRender]);

  const zoomIn = useCallback(() => {
    if (is3D && !isFreeView) {
      setCameraViewZoom(cameraViewZoom * 1.15);
    } else if (renderer?.cameraManager) {
      const cm = renderer.cameraManager;
      cm.setZoom?.((cm.zoom ?? 1) * 1.15);
    }
    requestRender();
  }, [is3D, isFreeView, cameraViewZoom, setCameraViewZoom, renderer, requestRender]);

  const zoomOut = useCallback(() => {
    if (is3D && !isFreeView) {
      setCameraViewZoom(cameraViewZoom / 1.15);
    } else if (renderer?.cameraManager) {
      const cm = renderer.cameraManager;
      cm.setZoom?.((cm.zoom ?? 1) / 1.15);
    }
    requestRender();
  }, [is3D, isFreeView, cameraViewZoom, setCameraViewZoom, renderer, requestRender]);

  const toggleHand = useCallback(() => {
    if (activeTool === TOOLS.HAND) setActiveTool(TOOLS.SELECT as any);
    else setActiveTool(TOOLS.HAND as any);
  }, [activeTool, setActiveTool]);

  const toggleGridClick = useCallback(() => {
    toggleGrid();
    renderer?.setGridVisible?.(!showGrid);
    requestRender();
  }, [toggleGrid, showGrid, renderer, requestRender]);

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
        <RailBtn
          title={isFreeView ? 'Switch to Camera View' : 'Switch to Free View'}
          active={isFreeView}
          onClick={toggleView}
        >
          {isFreeView ? (
            <Orbit size={14} strokeWidth={1.8} />
          ) : (
            <Camera size={14} strokeWidth={1.8} />
          )}
        </RailBtn>
      )}

      {is3D && (
        <RailBtn
          title={flyMode ? 'Exit Fly Mode (Shift+`)' : 'Fly Mode (Shift+`)'}
          active={flyMode}
          onClick={() => useViewportStore.getState().toggleFlyMode()}
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