import React, { useEffect, useCallback } from 'react';
import { useUIStore } from '../../state/uiStore';

import { MenuBar } from '../menubar/MenuBar';
import { WorkspaceTabs } from './WorkspaceTabs';
import { Toolbar } from '../toolbar/Toolbar';

import { RightSidebar } from './RightSidebar';

const ProjectBrowserPanel = React.lazy(() => import('../panels/project/ProjectBrowserPanel'));
const ViewportPanel = React.lazy(() => import('../panels/viewport/ViewportPanel'));
const TimelinePanel = React.lazy(() => import('../panels/timeline/TimelinePanel'));

const Fallback = () => <div className="panel-empty h-full">Loading...</div>;

export const AppShell: React.FC = () => {
  const leftW = useUIStore((s) => s.leftPanelWidth);
  const rightW = useUIStore((s) => s.rightPanelWidth);
  const tlH = useUIStore((s) => s.timelineHeight);
  const showLeft = useUIStore((s) => s.showLeftPanel);
  const showRight = useUIStore((s) => s.showRightPanel);
  const showTimeline = useUIStore((s) => s.showTimeline);
  const setWs = useUIStore((s) => s.setWindowSize);


  const handleResize = useCallback(
    () => setWs({ width: window.innerWidth, height: window.innerHeight }),
    [setWs],
  );
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Column widths (0 if hidden)
  const leftCol = showLeft ? `${leftW}px` : '0px';
  const leftSplit = showLeft ? '3px' : '0px';
  const rightTabStrip = showRight ? '32px' : '0px';
  const rightCol = showRight ? `${rightW}px` : '0px';
  const rightSplit = showRight ? '3px' : '0px';
  const tlRow = showTimeline ? `${tlH}px` : '0px';
  const tlSplit = showTimeline ? '3px' : '0px';

  return (
    <div
      className="h-full w-full overflow-hidden bg-app"
      style={{
        display: 'grid',
        gridTemplateColumns: `40px ${leftCol} ${leftSplit} 1fr ${rightSplit} ${rightTabStrip} ${rightCol}`,
        gridTemplateRows: `28px 28px 1fr ${tlSplit} ${tlRow}`,
        gap: 0,
      }}
    >
      {/* Row 0: Menubar */}
      <div style={{ gridColumn: '1 / -1', gridRow: '1' }} className="overflow-hidden">
        <MenuBar />
      </div>

      {/* Row 1: Workspace tabs */}
      <div style={{ gridColumn: '1 / -1', gridRow: '2' }} className="overflow-hidden">
        <WorkspaceTabs />
      </div>

      {/* Row 2: Main content area */}
      {/* Col 0: Toolbar */}
      <div
        style={{ gridColumn: '1', gridRow: '3 / 6' }}
        className="overflow-hidden bg-surface border-r border-border"
      >
        <Toolbar />
      </div>

      {/* Col 1: Project Browser (left panel) */}
      {showLeft && (
        <div
          style={{ gridColumn: '2', gridRow: '3 / 6' }}
          className="overflow-hidden bg-panel border-r border-border"
        >
          <React.Suspense fallback={<Fallback />}>
            <ProjectBrowserPanel />
          </React.Suspense>
        </div>
      )}

      {/* Col 2: Left splitter */}
      {showLeft && (
        <div style={{ gridColumn: '3', gridRow: '3 / 6' }}>
          <VSplitDrag which="left" />
        </div>
      )}

      {/* Col 3: Center Viewport */}
      <div style={{ gridColumn: '4', gridRow: '3' }} className="overflow-hidden relative bg-app">
        <React.Suspense fallback={<Fallback />}>
          <ViewportPanel />
        </React.Suspense>
      </div>

      {showTimeline && (
        <div style={{ gridColumn: '4', gridRow: '4' }}>
          <HSplitDrag />
        </div>
      )}

      {showTimeline && (
        <div style={{ gridColumn: '4', gridRow: '5' }} className="overflow-hidden bg-panel">
          <React.Suspense fallback={<Fallback />}>
            <TimelinePanel />
          </React.Suspense>
        </div>
      )}

      {/* Col 4: Right splitter */}
      {showRight && (
        <div style={{ gridColumn: '5', gridRow: '3 / 6' }}>
          <VSplitDrag which="right" />
        </div>
      )}

      {/* Col 5: Right tab strip */}
      {showRight && (
        <div
          style={{ gridColumn: '6', gridRow: '3 / 6' }}
          className="overflow-hidden bg-surface border-r border-border"
        >
          <RightSidebar />
        </div>
      )}

      {/* Col 6: Right panel content */}
      {showRight && (
        <div
          style={{ gridColumn: '7', gridRow: '3 / 6' }}
          className="overflow-hidden bg-panel"
        >
          <RightPanelContent />
        </div>
      )}
    </div>
  );
};

/** Renders the currently selected right-tab panel content */
const RightPanelContent: React.FC = () => {
  const tab = useUIStore((s) => s.activeRightTab);
  const PropertiesPanel = React.useMemo(
    () => React.lazy(() => import('../panels/properties/PropertiesPanel')),
    [],
  );
  const EffectsPanel = React.useMemo(
    () => React.lazy(() => import('../panels/properties/EffectsPanelWrapper')),
    [],
  );
  const AlignPanel = React.useMemo(
    () => React.lazy(() => import('../panels/align/AlignPanel')),
    [],
  );
  const InfoPanel = React.useMemo(
    () => React.lazy(() => import('../panels/info/InfoPanel')),
    [],
  );
  const RenderPanel = React.useMemo(
    () => React.lazy(() => import('../panels/render/RenderPanel')),
    [],
  );
  const CharacterPanel = React.useMemo(
    () => React.lazy(() => import('../panels/character/CharacterPanel')),
    [],
  );

  return (
    <React.Suspense fallback={<Fallback />}>
      {tab === 'properties' && <PropertiesPanel />}
      {tab === 'effects' && <EffectsPanel />}
      {tab === 'align' && <AlignPanel />}
      {tab === 'info' && <InfoPanel />}
      {tab === 'render' && <RenderPanel />}
      {tab === 'character' && <CharacterPanel />}
    </React.Suspense>
  );
};

const VSplitDrag: React.FC<{ which: 'left' | 'right' }> = ({ which }) => {
  const setLeft = useUIStore((s) => s.setLeftPanelWidth);
  const setRight = useUIStore((s) => s.setRightPanelWidth);
  const onDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW =
        which === 'left'
          ? useUIStore.getState().leftPanelWidth
          : useUIStore.getState().rightPanelWidth;
      const mm = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const w = which === 'left' ? startW + delta : startW - delta;
        const clamped = Math.max(180, Math.min(600, w));
        if (which === 'left') setLeft(clamped);
        else setRight(clamped);
      };
      const mu = () => {
        document.removeEventListener('mousemove', mm);
        document.removeEventListener('mouseup', mu);
        document.body.style.cursor = '';
      };
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', mm);
      document.addEventListener('mouseup', mu);
    },
    [which, setLeft, setRight],
  );
  return (
    <div
      onMouseDown={onDown}
      className="w-full h-full cursor-col-resize bg-border hover:bg-accent transition-colors"
    />
  );
};

const HSplitDrag: React.FC = () => {
  const setTh = useUIStore((s) => s.setTimelineHeight);
  const onDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = useUIStore.getState().timelineHeight;
      const mm = (ev: MouseEvent) => {
        const h = Math.max(120, Math.min(600, startH + startY - ev.clientY));
        setTh(h);
      };
      const mu = () => {
        document.removeEventListener('mousemove', mm);
        document.removeEventListener('mouseup', mu);
        document.body.style.cursor = '';
      };
      document.body.style.cursor = 'row-resize';
      document.addEventListener('mousemove', mm);
      document.addEventListener('mouseup', mu);
    },
    [setTh],
  );
  return (
    <div
      onMouseDown={onDown}
      className="w-full h-full cursor-row-resize bg-border hover:bg-accent transition-colors"
    />
  );
};