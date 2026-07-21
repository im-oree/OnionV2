import React from 'react';
import { Minus, Plus, Grid3X3, Magnet, Layers as LayersIcon } from 'lucide-react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useViewportStore } from '../../../state/viewportStore';
import { useOnionSkinStore } from '../../../state/onionSkinStore';
import { formatTime } from '../../../utils/time';
import { VIEWPORT_CONFIG } from '../../../config/viewportConfig';

interface ViewportHUDProps {
  fps: number;
  zoom: number;
  viewportSize: { width: number; height: number };
  selectedLayerIds?: string[];
  transformMode?: string | null;
  onZoomChange?: (zoom: number) => void;
  onFitToViewport?: () => void;
}

export const ViewportHUD: React.FC<ViewportHUDProps> = ({
  zoom, viewportSize, selectedLayerIds, transformMode, onZoomChange, onFitToViewport,
}) => {
  const comp = useCompositionStore((s) => s.activeCompositionId ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  const showGrid = useViewportStore(s => s.settings.showGrid);
  const showRuleOfThirds = useViewportStore(s => s.settings.showRuleOfThirds);
  const snapEnabled = useViewportStore(s => s.settings.snappingEnabled);

  if (!comp) return null;

  const zoomPercent = Math.round((1 / (zoom || 1)) * 100);
  const currentFrame = Math.floor(comp.currentTime * comp.fps);
  const totalFrames = Math.floor(comp.duration * comp.fps);
  const selCount = selectedLayerIds?.length ?? 0;
  const zoomIn = () => onZoomChange?.(zoom / VIEWPORT_CONFIG.ZOOM_FACTOR);
  const zoomOut = () => onZoomChange?.(zoom * VIEWPORT_CONFIG.ZOOM_FACTOR);

  const chipBtn: React.CSSProperties = {
    width: 24, height: 24,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-panel-raised)',
    color: 'var(--color-text-secondary)',
    border: 0, cursor: 'pointer',
    transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
  };
  const activeChip = { ...chipBtn, background: 'var(--color-accent-muted)', color: 'var(--color-accent)' };

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Top-left toggles */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-auto">
        <button style={showGrid ? activeChip : chipBtn} onClick={() => useViewportStore.getState().toggleGrid()} title="Toggle Grid">
          <Grid3X3 size={13} strokeWidth={1.75} />
        </button>
        <button style={showRuleOfThirds ? activeChip : chipBtn} onClick={() => useViewportStore.getState().toggleRuleOfThirds()} title="Toggle Rule-of-Thirds Overlay">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
            <rect x="1" y="1" width="11" height="11" rx="1" />
            <line x1="1" y1="4.67" x2="12" y2="4.67" />
            <line x1="1" y1="8.33" x2="12" y2="8.33" />
            <line x1="4.67" y1="1" x2="4.67" y2="12" />
            <line x1="8.33" y1="1" x2="8.33" y2="12" />
          </svg>
        </button>
        <button style={snapEnabled ? activeChip : chipBtn} onClick={() => useViewportStore.getState().toggleSnapping()} title="Toggle Snapping">
          <Magnet size={13} strokeWidth={1.75} />
        </button>
        <OnionSkinToggle chipBtn={chipBtn} activeChip={activeChip} />
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 font-mono" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{comp.name}</span>
          <span>·</span><span>{comp.width}×{comp.height}</span>
          <span>·</span><span>{comp.fps}fps</span>
          <span>·</span><span>{formatTime(comp.currentTime, comp.fps)} / {formatTime(comp.duration, comp.fps)}</span>
          <span>·</span><span>F{currentFrame}/{totalFrames}</span>
        </div>

        <div className="flex items-center gap-2">
          {transformMode && (
            <div className="font-mono font-semibold" style={{
              padding: '2px 8px', background: 'var(--color-accent)', color: '#fff',
              borderRadius: 'var(--radius-sm)', fontSize: 10,
            }}>
              {transformMode}
            </div>
          )}
          {selCount > 0 && (
            <span className="font-mono" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
              {selCount} layer{selCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 font-mono pointer-events-auto" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
          <button style={chipBtn} onClick={zoomOut} title="Zoom Out"><Minus size={12} strokeWidth={2} /></button>
          <button style={{ ...chipBtn, width: 'auto', padding: '0 8px' }} onClick={onFitToViewport} title="Fit to Viewport">
            {zoom <= 0.95 ? 'Fit' : `${zoomPercent}%`}
          </button>
          <button style={chipBtn} onClick={zoomIn} title="Zoom In"><Plus size={12} strokeWidth={2} /></button>
          <span className="ml-1">·</span><span>{viewportSize.width}×{viewportSize.height}</span>
        </div>
      </div>
    </div>
  );
};

const OnionSkinToggle: React.FC<{ chipBtn: React.CSSProperties; activeChip: React.CSSProperties }> = ({ chipBtn, activeChip }) => {
  const enabled = useOnionSkinStore((s) => s.settings.enabled);
  const toggle = useOnionSkinStore((s) => s.toggle);
  return (
    <button style={enabled ? activeChip : chipBtn} onClick={toggle} title="Toggle Onion Skinning">
      <LayersIcon size={13} strokeWidth={1.75} />
    </button>
  );
};