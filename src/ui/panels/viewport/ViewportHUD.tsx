/**
 * ViewportHUD â€” minimal top-left overlay toggles only.
 * Composition info: Breadcrumb / composition chip (top-left)
 * Perf metrics: PerfHUD (Shift+F, top-right)
 * View nav: right-side rail toolbar
 */
import React, { useCallback, useRef, useState } from 'react';
import { Grid3X3, Magnet, Layers, Crosshair } from 'lucide-react';
import { useViewportStore } from '../../../state/viewportStore';
import { useOnionSkinStore } from '../../../state/onionSkinStore';

interface ViewportHUDProps {
  zoom: number;
  viewportSize: { width: number; height: number };
  selectedLayerIds?: string[];
  transformMode?: string | null;
  onZoomChange?: (zoom: number) => void;
  onFitToViewport?: () => void;
}

const PANEL_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  padding: '3px 4px',
  background: 'rgba(22,22,28,0.85)',
  backdropFilter: 'blur(12px)',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
};

const SEP_STYLE: React.CSSProperties = {
  width: 1,
  height: 14,
  margin: '0 3px',
  background: 'rgba(255,255,255,0.08)',
};

const Tooltip: React.FC<{
  label: string;
  shortcut?: string;
  children: React.ReactNode;
}> = ({ label, shortcut, children }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const handleEnter = useCallback(() => {
    setShow(true);
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
    }
  }, []);
  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {show && (
        <div
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            transform: 'translateX(-50%)',
            padding: '4px 8px',
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
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{label}</span>
          {shortcut && (
            <kbd
              style={{
                padding: '1px 4px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 3,
                fontSize: 9,
                color: 'rgba(255,255,255,0.45)',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  );
};

const IconBtn: React.FC<{
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  tooltip: string;
  shortcut?: string;
}> = React.memo(({ icon, active, onClick, tooltip, shortcut }) => (
  <Tooltip label={tooltip} shortcut={shortcut}>
    <button
      onClick={onClick}
      style={{
        width: 26,
        height: 26,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        background: active ? 'rgba(100,140,255,0.2)' : 'transparent',
        color: active ? 'rgba(130,170,255,0.95)' : 'rgba(255,255,255,0.45)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)';
        }
      }}
    >
      {icon}
    </button>
  </Tooltip>
));
IconBtn.displayName = 'IconBtn';

export const ViewportHUD: React.FC<ViewportHUDProps> = () => {
  const showGrid = useViewportStore((s) => s.settings.showGrid);
  const showRoT = useViewportStore((s) => s.settings.showRuleOfThirds);
  const snapEnabled = useViewportStore((s) => s.settings.snappingEnabled);
  const showAnchors = useViewportStore((s) => s.settings.showAnchorPoints);
  const onionEnabled = useOnionSkinStore((s) => s.settings.enabled);
  const onionToggle = useOnionSkinStore((s) => s.toggle);

  const toggleGrid = useCallback(() => useViewportStore.getState().toggleGrid(), []);
  const toggleRoT = useCallback(() => useViewportStore.getState().toggleRuleOfThirds(), []);
  const toggleSnap = useCallback(() => useViewportStore.getState().toggleSnapping(), []);
  const toggleAnchors = useCallback(() => useViewportStore.getState().toggleAnchorPoints(), []);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
      <div
        className="absolute pointer-events-auto"
        style={{ top: 10, left: 220, ...PANEL_STYLE }}
      >
        <IconBtn
          icon={<Grid3X3 size={14} strokeWidth={1.8} />}
          active={showGrid}
          onClick={toggleGrid}
          tooltip="Grid Overlay"
          shortcut="G"
        />
        <IconBtn
          icon={
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="1" y="1" width="12" height="12" rx="1" />
              <line x1="1" y1="5" x2="13" y2="5" />
              <line x1="1" y1="9" x2="13" y2="9" />
              <line x1="5" y1="1" x2="5" y2="13" />
              <line x1="9" y1="1" x2="9" y2="13" />
            </svg>
          }
          active={showRoT}
          onClick={toggleRoT}
          tooltip="Rule of Thirds"
        />
        <div style={SEP_STYLE} />
        <IconBtn
          icon={<Magnet size={14} strokeWidth={1.8} />}
          active={snapEnabled}
          onClick={toggleSnap}
          tooltip="Snapping"
          shortcut="S"
        />
        <IconBtn
          icon={<Crosshair size={14} strokeWidth={1.8} />}
          active={showAnchors}
          onClick={toggleAnchors}
          tooltip="Anchor Points"
        />
        <div style={SEP_STYLE} />
        <IconBtn
          icon={<Layers size={14} strokeWidth={1.8} />}
          active={onionEnabled}
          onClick={onionToggle}
          tooltip="Onion Skinning"
          shortcut="O"
        />
      </div>
    </div>
  );
};