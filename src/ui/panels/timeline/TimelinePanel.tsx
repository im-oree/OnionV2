import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { PlaybackControls, animationClock } from './PlaybackControls';
import { TimelineHeader } from './TimelineHeader';
import { TimelineRuler } from './TimelineRuler';
import { KeyframeArea } from './KeyframeArea';
import { OutlinerTracks } from './OutlinerTracks';
import { ContextMenu } from '../../common/ContextMenu';
import { useContextMenu } from '../../common/useContextMenu';
import { buildTimelineContextMenu } from './timelineContextMenus';
import { useKeyframeModal } from './useKeyframeModal';
import { useKeyframeShortcuts } from './useKeyframeShortcuts';

export const TimelinePanel: React.FC = () => {
  const comp = useCompositionStore(s =>
    s.activeCompositionId ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null : null,
  );
  const zoom = useTimelineStore(s => s.zoom);
  const setZoom = useTimelineStore(s => s.setZoom);
  const scrollX = useTimelineStore(s => s.scrollX);
  const setScrollX = useTimelineStore(s => s.setScrollX);

  const [outlinerWidth, setOutlinerWidth] = useState(280);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const outlinerScrollRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const rightSideRef = useRef<HTMLDivElement>(null);
  const ctxMenu = useContextMenu();

  const layers = comp?.layers ?? [];
  const totalFrames = comp ? Math.floor(comp.duration * comp.fps) : 250;
  const currentFrame = comp ? Math.floor(comp.currentTime * comp.fps) : 0;
  const fps = comp?.fps ?? 30;

  // Global modal + shortcuts
  useKeyframeModal(zoom, totalFrames);
  useKeyframeShortcuts();

  // Track when mouse is inside the timeline area (for scoping shortcuts)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const enter = () => { (document as any)._lastMouseInTimeline = true; };
    const leave = () => { (document as any)._lastMouseInTimeline = false; };
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
    };
  }, []);

  // Dispatch kfmodal events → start modal grab/scale (used by context menu)
  useEffect(() => {
    const g = () => {
      const ev = new KeyboardEvent('keydown', { key: 'g' });
      document.dispatchEvent(ev);
    };
    const s = () => {
      const ev = new KeyboardEvent('keydown', { key: 's' });
      document.dispatchEvent(ev);
    };
    document.addEventListener('kfmodal:grab', g);
    document.addEventListener('kfmodal:scale', s);
    return () => {
      document.removeEventListener('kfmodal:grab', g);
      document.removeEventListener('kfmodal:scale', s);
    };
  }, []);

  useEffect(() => {
    if (playheadRef.current) {
      playheadRef.current.style.left = `${currentFrame * zoom - scrollX}px`;
    }
  }, [currentFrame, zoom, scrollX]);

  const onOutlinerScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (tracksScrollRef.current) tracksScrollRef.current.scrollTop = e.currentTarget.scrollTop;
  }, []);

  const onTracksScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget;
    setScrollX(t.scrollLeft);
    if (outlinerScrollRef.current) outlinerScrollRef.current.scrollTop = t.scrollTop;
  }, [setScrollX]);

  useEffect(() => {
    const el = rightSideRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); e.stopPropagation();
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const st = useTimelineStore.getState();
        const oldZ = st.zoom;
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const newZ = Math.max(0.5, Math.min(200, oldZ * factor));
        const frameUnder = (mouseX + st.scrollX) / oldZ;
        setZoom(newZ);
        const newSx = Math.max(0, frameUnder * newZ - mouseX);
        setScrollX(newSx);
        if (tracksScrollRef.current) tracksScrollRef.current.scrollLeft = newSx;
        return;
      }
      if (e.shiftKey && tracksScrollRef.current) {
        e.preventDefault();
        tracksScrollRef.current.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setZoom, setScrollX]);

  useEffect(() => {
    const el = rightSideRef.current;
    if (!el) return;
    let panning = false, lx = 0, ly = 0;
    const stop = () => {
      if (!panning) return;
      panning = false; document.body.style.cursor = '';
    };
    const onDown = (e: MouseEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();
      panning = true; lx = e.clientX; ly = e.clientY;
      document.body.style.cursor = 'grabbing';
    };
    const onMove = (e: MouseEvent) => {
      if (!panning) return;
      if ((e.buttons & 4) === 0) { stop(); return; }
      if (tracksScrollRef.current) {
        tracksScrollRef.current.scrollLeft -= e.clientX - lx;
        tracksScrollRef.current.scrollTop -= e.clientY - ly;
      }
      lx = e.clientX; ly = e.clientY;
    };
    const onUp = (e: MouseEvent) => { if (e.button === 1) stop(); };
    el.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
    return () => {
      el.removeEventListener('mousedown', onDown);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('pointercancel', stop);
      window.removeEventListener('blur', stop);
      document.body.style.cursor = '';
    };
  }, []);

  const handleCtx = useCallback((e: React.MouseEvent) => {
    if (!comp) return;
    const rect = tracksScrollRef.current?.getBoundingClientRect();
    const frame = rect ? Math.max(0, Math.round((e.clientX - rect.left + scrollX) / zoom)) : 0;
    ctxMenu.open(e, buildTimelineContextMenu(frame, fps, comp.id));
  }, [comp, scrollX, zoom, fps, ctxMenu]);

  if (!comp) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-ui-xs text-text-disabled">
        No composition
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex flex-col h-full bg-surface-alt select-none">
      <PlaybackControls comp={comp} totalFrames={totalFrames} currentFrame={currentFrame} />
      <TimelineHeader comp={comp} currentFrame={currentFrame} totalFrames={totalFrames} />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-shrink-0 overflow-hidden border-r border-border bg-surface flex flex-col" style={{ width: outlinerWidth }}>
          <OutlinerTracksHeader compId={comp.id} />
          <div ref={outlinerScrollRef} className="flex-1 overflow-auto" onScroll={onOutlinerScroll}>
            <OutlinerTracks layers={layers} compId={comp.id} />
          </div>
        </div>

        <div
          className="w-1 cursor-col-resize flex-shrink-0 bg-border hover:bg-accent transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            const sx = e.clientX, sw = outlinerWidth;
            const mm = (ev: MouseEvent) => setOutlinerWidth(Math.max(160, Math.min(500, sw + ev.clientX - sx)));
            const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
            document.addEventListener('mousemove', mm);
            document.addEventListener('mouseup', mu);
          }}
        />

        <div ref={rightSideRef} className="flex flex-col flex-1 overflow-hidden relative" onContextMenu={handleCtx}>
          <TimelineRuler
            totalFrames={totalFrames} currentFrame={currentFrame} zoom={zoom}
            scrollX={scrollX} compId={comp.id} fps={fps}
            workAreaStart={comp.workAreaStart != null ? Math.floor(comp.workAreaStart * fps) : undefined}
            workAreaEnd={comp.workAreaEnd != null ? Math.floor(comp.workAreaEnd * fps) : undefined}
          />
          <div ref={tracksScrollRef} className="flex-1 overflow-auto relative" onScroll={onTracksScroll}>
            <div style={{ width: totalFrames * zoom + 100, minHeight: '100%', position: 'relative' }}>
              <KeyframeArea
                layers={layers} currentFrame={currentFrame}
                zoom={zoom} totalFrames={totalFrames} compId={comp.id}
              />
            </div>
          </div>

          <div
            ref={playheadRef}
            className="absolute top-0 bottom-0 pointer-events-none z-20"
            style={{ width: 2, left: currentFrame * zoom - scrollX }}
          >
            <svg width="12" height="12" style={{ position: 'absolute', top: 0, left: -5 }}>
              <polygon points="1,1 11,1 6,11" fill="var(--timeline-playhead)" />
            </svg>
            <div style={{ width: 2, height: '100%', background: 'var(--timeline-playhead)', opacity: 0.9 }} />
          </div>

          {ctxMenu.menu && <ContextMenu items={ctxMenu.menu.items} position={ctxMenu.menu.position} onClose={ctxMenu.close} />}
        </div>
      </div>
    </div>
  );
};

const OutlinerTracksHeader: React.FC<{ compId: string }> = ({ compId }) => {
  const ctx = useContextMenu();
  const openAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ctx.open(e, [
      { id: 'add.hdr', label: 'Add Layer', disabled: true },
      { id: 'add.d1', divider: true },
      { id: 'add.solid', label: 'Solid', onClick: () => addFromHeader(compId, 'solid') },
      { id: 'add.shape', label: 'Shape', onClick: () => addFromHeader(compId, 'shape') },
      { id: 'add.text', label: 'Text', onClick: () => addFromHeader(compId, 'text') },
      { id: 'add.null', label: 'Null Object', onClick: () => addFromHeader(compId, 'null') },
      { id: 'add.adj', label: 'Adjustment Layer', onClick: () => addFromHeader(compId, 'adjustment') },
      { id: 'add.d2', divider: true },
      { id: 'add.image', label: 'Image', onClick: () => addFromHeader(compId, 'image') },
      { id: 'add.video', label: 'Video', onClick: () => addFromHeader(compId, 'video') },
    ]);
  };
  return (
    <div style={{ height: 28 }} className="border-b border-border bg-surface-alt flex items-center px-2 gap-1 text-ui-xs text-text-secondary">
      <span className="flex-1 truncate">Channels</span>
      <button
        onClick={openAdd}
        title="Add Layer"
        className="w-[18px] h-[18px] flex items-center justify-center rounded-sm border-0 bg-transparent text-text-secondary hover:text-text-primary hover:bg-panel-hover cursor-pointer"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}
    </div>
  );
};

function addFromHeader(compId: string, type: import('../../../types/layer').Layer['type']): void {
  import('../../../utils/createLayerInstance').then(({ createLayerInstance }) => {
    import('../../../state/compositionStore').then(({ useCompositionStore }) => {
      import('../../../state/selectionStore').then(({ useSelectionStore }) => {
        const cs = useCompositionStore.getState();
        const comp = cs.compositions.find(c => c.id === compId);
        if (!comp) return;
        const layer = createLayerInstance(type, comp);
        cs.addLayer(compId, layer);
        useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
      });
    });
  });
}

export default TimelinePanel;