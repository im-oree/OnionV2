import React, { useEffect, useCallback, useState } from 'react';
import { useUIStore } from '../../state/uiStore';
import { MenuBar } from '../menubar/MenuBar';
import { TitleBar } from './TitleBar';
import { Toolbar } from '../toolbar/Toolbar';
import { RightSidebar } from './RightSidebar';
import { StatusBar } from './StatusBar';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useCompositionStore } from '../../state/compositionStore';
import { WelcomeScreen } from '../WelcomeScreen';
// Right panel — direct imports (no lazy/Suspense — panels are small, lazy causes stuck "Loading...")
import { PropertiesPanel as RightPropertiesPanel } from '../panels/properties/PropertiesPanel';
import AlignPanel from '../panels/align/AlignPanel';
import InfoPanel from '../panels/info/InfoPanel';
import RenderPanel from '../panels/render/RenderPanel';
import CharacterPanel from '../panels/character/CharacterPanel';
import PerformancePanel from '../panels/performance/PerformancePanel';
import EffectsPanelWrapper from '../panels/properties/EffectsPanelWrapper';
import EffectLibraryPanel from '../panels/effects/EffectLibraryPanel';
import { TransitionLibraryPanel } from '../panels/effects/TransitionLibraryPanel';
import { CameraPanel } from '../panels/camera/CameraPanel';

const ProjectBrowserPanel = React.lazy(() => import('../panels/project/ProjectBrowserPanel'));
const ViewportPanel = React.lazy(() => import('../panels/viewport/ViewportPanel'));
const TimelinePanel = React.lazy(() => import('../panels/timeline/TimelinePanel'));
const GraphEditorPanel = React.lazy(() => import('../panels/grapheditor/GraphEditorPanel'));

const Fallback = () => <div className="panel-empty h-full">Loading...</div>;

export const AppShell: React.FC = () => {
  const leftW = useUIStore((s) => s.leftPanelWidth);
  const rightW = useUIStore((s) => s.rightPanelWidth);
  const tlH = useUIStore((s) => s.timelineHeight);
  const graphW = useUIStore((s) => s.graphEditorWidth);
  const showLeft = useUIStore((s) => s.showLeftPanel);
  const showRight = useUIStore((s) => s.showRightPanel);
  const showTimeline = useUIStore((s) => s.showTimeline);
  const showGraph = useUIStore((s) => s.showGraphEditor);
  const setWs = useUIStore((s) => s.setWindowSize);
  const hasComposition = useCompositionStore((s) => s.compositions.length > 0);

  const handleResize = useCallback(() => setWs({ width: window.innerWidth, height: window.innerHeight }), [setWs]);
  useEffect(() => { window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, [handleResize]);

  const G = 10;
  const TB = 44;
  const RSB = 36;

  return (
    <div className="h-full w-full overflow-hidden" style={{ display: 'flex', flexDirection: 'column' }}>
    <TitleBar />
    <div className="flex-1 min-h-0 overflow-hidden"
      style={{
        display: 'grid', padding: `0 ${G}px ${G}px ${G}px`,
        gridTemplateColumns: `${TB}px ${G}px ${showLeft ? `${leftW}px` : '0px'} ${G}px 1fr ${G}px ${showRight ? `${rightW}px` : '0px'} ${G}px ${showRight ? `${RSB}px` : '0px'}`,
        gridTemplateRows: `var(--size-menubar-height) ${G}px 1fr ${G}px ${showTimeline ? `${tlH}px` : '0px'} var(--size-panel-header)`,
        gap: 0,
      }}>
      <div style={{ gridColumn: '1 / -1', gridRow: '1', overflow: 'visible' }}><MenuBar /></div>
      <div style={{ gridColumn: '1 / -1', gridRow: '2' }} />
      <div style={{ gridColumn: '1', gridRow: '3 / 6' }} className="overflow-hidden"><Toolbar /></div>
      <div style={{ gridColumn: '2', gridRow: '3 / 6' }} />
      {showLeft && (
        <div style={{ gridColumn: '3', gridRow: '3' }} className="overflow-hidden">
          <ErrorBoundary name="Project Browser"><React.Suspense fallback={<Fallback />}><ProjectBrowserPanel /></React.Suspense></ErrorBoundary>
        </div>
      )}
      {showLeft && <div style={{ gridColumn: '4', gridRow: '3' }}><VSplitDrag which="left" /></div>}
      {!hasComposition ? (
        <div style={{ gridColumn: '5', gridRow: '3 / 6' }} className="relative">
          <WelcomeScreen />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 }}><StatusBar /></div>
        </div>
      ) : (
        <>
          <ErrorBoundary name="Viewport">
            <div style={{ gridColumn: '5', gridRow: '3' }} className="overflow-hidden relative">
              <React.Suspense fallback={<Fallback />}><ViewportPanel /></React.Suspense>
            </div>
          </ErrorBoundary>
          {showTimeline && <div style={{ gridColumn: '3 / 8', gridRow: '4' }}><HSplitDrag /></div>}
          {showTimeline && (
            <ErrorBoundary name="Timeline">
              <div style={{ gridColumn: '3 / 8', gridRow: '5', display: 'flex', gap: G }} className="overflow-hidden">
                <div className="flex-1 overflow-hidden" style={{ minWidth: 0 }}>
                  <React.Suspense fallback={<Fallback />}><TimelinePanel /></React.Suspense>
                </div>
                {showGraph && (
                  <>
                    <GraphHSplit />
                    <div className="flex-shrink-0 overflow-hidden" style={{ width: graphW }}>
                      <React.Suspense fallback={<Fallback />}><GraphEditorPanel /></React.Suspense>
                    </div>
                  </>
                )}
              </div>
            </ErrorBoundary>
          )}
          <div style={{ gridColumn: '3 / 8', gridRow: '6' }} className="overflow-hidden"><StatusBar /></div>
        </>
      )}
      {showRight && <div style={{ gridColumn: '6', gridRow: '3' }}><VSplitDrag which="right" /></div>}
      {showRight && (
        <div style={{ gridColumn: '7', gridRow: '3' }} className="min-h-0 overflow-hidden"><RightPanelContent /></div>
      )}
      {showRight && <div style={{ gridColumn: '8', gridRow: '3 / 6' }} />}
      {showRight && (
        <div style={{ gridColumn: '9', gridRow: '3 / 6' }} className="overflow-hidden"><RightSidebar /></div>
      )}
    </div>
    </div>
  );
};

const GraphHSplit: React.FC = () => {
  const setW = useUIStore((s) => s.setGraphEditorWidth);
  const [hovered, setHovered] = useState(false);
  const onDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const sx = e.clientX;
    const sw = useUIStore.getState().graphEditorWidth;
    const mm = (ev: MouseEvent) => setW(Math.max(280, Math.min(1000, sw - (ev.clientX - sx))));
    const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); document.body.style.cursor = ''; };
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
  }, [setW]);
  return (
    <div onMouseDown={onDown} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: 6, cursor: 'col-resize', background: hovered ? 'var(--color-accent)' : 'transparent', opacity: hovered ? 0.3 : 0, transition: 'opacity 120ms ease-out', flexShrink: 0 }} />
  );
};

const VSplitDrag: React.FC<{ which: 'left' | 'right' }> = ({ which }) => {
  const setLeft = useUIStore((s) => s.setLeftPanelWidth);
  const setRight = useUIStore((s) => s.setRightPanelWidth);
  const [hovered, setHovered] = useState(false);
  const onDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = which === 'left' ? useUIStore.getState().leftPanelWidth : useUIStore.getState().rightPanelWidth;
    const mm = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const w = which === 'left' ? startW + delta : startW - delta;
      const clamped = Math.max(180, Math.min(600, w));
      if (which === 'left') setLeft(clamped); else setRight(clamped);
    };
    const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); document.body.style.cursor = ''; };
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
  }, [which, setLeft, setRight]);
  return (
    <div onMouseDown={onDown} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="w-full h-full cursor-col-resize"
      style={{ background: hovered ? 'var(--color-accent)' : 'transparent', opacity: hovered ? 0.3 : 0, transition: 'opacity 120ms ease-out' }} />
  );
};

const HSplitDrag: React.FC = () => {
  const setTh = useUIStore((s) => s.setTimelineHeight);
  const [hovered, setHovered] = useState(false);
  const onDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = useUIStore.getState().timelineHeight;
    const mm = (ev: MouseEvent) => setTh(Math.max(120, Math.min(600, startH + startY - ev.clientY)));
    const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); document.body.style.cursor = ''; };
    document.body.style.cursor = 'row-resize';
    document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
  }, [setTh]);
  return (
    <div onMouseDown={onDown} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="w-full h-full cursor-row-resize"
      style={{ background: hovered ? 'var(--color-accent)' : 'transparent', opacity: hovered ? 0.3 : 0, transition: 'opacity 120ms ease-out' }} />
  );
};

const RightPanelContent: React.FC = () => {
  const tab = useUIStore((s) => s.activeRightTab);
  return (
    <>
      {tab === 'properties' && <RightPropertiesPanel />}
      {tab === 'effects' && <EffectsPanelWrapper />}
      {tab === 'effectLibrary' && <EffectLibraryPanel />}
      {tab === 'transitionLibrary' && <TransitionLibraryPanel />}
      {tab === 'camera' && <CameraPanel />}
      {tab === 'align' && <AlignPanel />}
      {tab === 'info' && <InfoPanel />}
      {tab === 'render' && <RenderPanel />}
      {tab === 'character' && <CharacterPanel />}
      {tab === 'performance' && <PerformancePanel />}
    </>
  );
};