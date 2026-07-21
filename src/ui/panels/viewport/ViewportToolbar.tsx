import React, { useState, useEffect } from 'react';

interface Props {
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  renderer: any;
}

export const ViewportToolbar: React.FC<Props> = ({ showGrid, setShowGrid, renderer }) => {
  const [gizmosOn, setGizmosOn] = useState(true);
  const [wireframeOn, setWireframeOn] = useState(false);
  const [isFree, setIsFree] = useState(false);

  // Track view mode changes
  useEffect(() => {
    const handler = () => setIsFree(!!(window as any).__freeViewMode);
    document.addEventListener('viewport:viewmode', handler);
    handler();
    return () => document.removeEventListener('viewport:viewmode', handler);
  }, []);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer',
    background: active ? 'rgba(74,144,226,0.15)' : 'transparent',
    color: active ? '#4A90E2' : 'var(--color-text-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s ease',
  });

  const divider = <div style={{ width: 1, height: 18, background: 'var(--color-border)', margin: '0 2px' }} />;

  return (
    <div className="absolute z-30" style={{ top: 44, left: 8, display: 'flex', gap: 3, alignItems: 'center' }}>
      {/* View Mode Toggle */}
      <button onClick={() => {
        const newMode = !isFree;
        (window as any).__freeViewMode = newMode;
        setIsFree(newMode);
        document.dispatchEvent(new CustomEvent('viewport:viewmode', { detail: { free: newMode } }));
        renderer?.renderLoop?.requestRender?.();
      }} title={isFree ? 'Switch to Camera View' : 'Switch to Free View'}
        style={{
          padding: '3px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
          background: isFree ? 'rgba(85,221,51,0.15)' : 'rgba(74,144,226,0.15)',
          color: isFree ? '#55dd33' : '#4A90E2',
          border: `1px solid ${isFree ? 'rgba(85,221,51,0.4)' : 'rgba(74,144,226,0.4)'}`,
          borderRadius: 4,
        }}>
        {isFree ? '🔓 Free' : '🎬 Camera'}
      </button>

      {divider}

      {/* Gizmo Toggle */}
      <button onClick={() => {
        const next = !gizmosOn;
        setGizmosOn(next);
        (window as any).__gizmosEnabled = next;
        renderer?.renderLoop?.requestRender?.();
      }} title={gizmosOn ? 'Hide Gizmos' : 'Show Gizmos'} style={btnStyle(gizmosOn)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="7" cy="7" r="4.5" />
          <line x1="7" y1="2.5" x2="7" y2="11.5" />
          <line x1="2.5" y1="7" x2="11.5" y2="7" />
        </svg>
      </button>

      {/* Grid Toggle */}
      <button onClick={() => {
        const next = !showGrid;
        setShowGrid(next);
        (window as any).__showGrid = next;
        renderer?.setGridVisible(next);
      }} title={showGrid ? 'Hide 3D Grid' : 'Show 3D Grid'} style={btnStyle(showGrid)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="1" width="12" height="12" rx="1" />
          <line x1="1" y1="5" x2="13" y2="5" />
          <line x1="1" y1="9" x2="13" y2="9" />
          <line x1="5" y1="1" x2="5" y2="13" />
          <line x1="9" y1="1" x2="9" y2="13" />
        </svg>
      </button>

      {/* Wireframe Toggle */}
      <button onClick={() => {
        const next = !wireframeOn;
        setWireframeOn(next);
        (window as any).__wireframeMode = next;
        renderer?.renderLoop?.requestRender?.();
      }} title={wireframeOn ? 'Solid Mode' : 'Wireframe Mode'} style={btnStyle(wireframeOn)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="10" height="10" rx="1" strokeDasharray="2 1" />
        </svg>
      </button>
    </div>
  );
};
