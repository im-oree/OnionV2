import React, { useEffect, useCallback } from 'react';
import { useUIStore } from '../../state/uiStore';
import { MenuBar } from '../menubar/MenuBar';
import { TitleBar } from './TitleBar';
import { StatusBar } from './StatusBar';
import { useCompositionStore } from '../../state/compositionStore';
import { WelcomeScreen } from '../WelcomeScreen';
import { LayoutRoot } from './LayoutRoot';

export const AppShell: React.FC = () => {
  const setWs = useUIStore((s) => s.setWindowSize);
  const hasComposition = useCompositionStore((s) => s.compositions.length > 0);

  const handleResize = useCallback(
    () => setWs({ width: window.innerWidth, height: window.innerHeight }),
    [setWs],
  );

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--color-app-bg, #16181d)',
      }}
    >
      {/* TitleBar — only shows in Electron, returns null in browser */}
      <TitleBar />

      {/* MenuBar — explicit height */}
      <div style={{ height: 32, flexShrink: 0, background: 'var(--color-panel, #1f2229)' }}>
        <MenuBar />
      </div>

      {/* Main content area — takes all remaining space */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <LayoutRoot />

        {/* Welcome overlay covers layout while no comp exists */}
        {!hasComposition && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 90,
              background: 'var(--color-app-bg, #16181d)',
            }}
          >
            <WelcomeScreen />
          </div>
        )}
      </div>

      {/* StatusBar — explicit height */}
      <div style={{ height: 28, flexShrink: 0 }}>
        <StatusBar />
      </div>
    </div>
  );
};