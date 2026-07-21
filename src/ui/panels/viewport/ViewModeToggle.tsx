import React, { useState, useEffect } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';

/**
 * ViewModeToggle — switches between "Active Camera" and "Free View".
 *
 * Active Camera: viewport shows what the composition camera sees.
 * Free View: bird's-eye orbiting camera for scene arrangement.
 */
export const ViewModeToggle: React.FC = () => {
  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null
  );

  const [, forceUpdate] = useState(0);

  // Listen for external state changes (e.g. from keyboard shortcut)
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    document.addEventListener('viewport:viewmode', handler);
    return () => document.removeEventListener('viewport:viewmode', handler);
  }, []);

  // Auto-enable grid when entering 3D mode for the first time
  useEffect(() => {
    if (comp?.perspective3D && !(window as any).__gridAutoEnabled) {
      (window as any).__showGrid = true;
      (window as any).__gridAutoEnabled = true;
      // Delay to let renderer initialize
      setTimeout(() => {
        const renderer = (window as any).__renderer;
        if (renderer?.sceneManager) {
          renderer.sceneManager.grid.show();
        }
      }, 100);
    }
    if (!comp?.perspective3D) {
      (window as any).__gridAutoEnabled = false;
    }
  }, [comp?.perspective3D]);

  if (!comp?.perspective3D) return null;

  const isFree = !!(window as any).__freeViewMode;

  const toggle = () => {
    const next = !isFree;
    (window as any).__freeViewMode = next;
    document.dispatchEvent(new CustomEvent('viewport:viewmode', { detail: { free: next } }));
    forceUpdate(n => n + 1);
  };

  return (
    <div className="absolute z-30" style={{ top: 44, left: 8 }}>
      <button onClick={toggle} style={{
        padding: '3px 10px', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
        background: isFree ? 'rgba(85,221,51,0.15)' : 'rgba(74,144,226,0.15)',
        color: isFree ? '#55dd33' : '#4A90E2',
        border: `1px solid ${isFree ? 'rgba(85,221,51,0.4)' : 'rgba(74,144,226,0.4)'}`,
        borderRadius: 4,
        letterSpacing: '0.03em',
        transition: 'all 0.15s ease',
      }}
        title={isFree
          ? 'Free View — orbit around scene, see camera frustum. Click to switch to Active Camera.'
          : 'Active Camera — view through the scene camera. Click to switch to Free View.'
        }
      >
        {isFree ? '🔓 Free View' : '🎬 Active Camera'}
      </button>
    </div>
  );
};
