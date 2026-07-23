import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useNotificationStore } from '../../../state/notificationStore';
import { PlaybackControls, animationClock } from './PlaybackControls';
import { TimelineHeader } from './TimelineHeader';
import { EditToolbar } from './EditToolbar';
import { TimelineRuler } from './TimelineRuler';
import { KeyframeArea } from './KeyframeArea';
import { OutlinerTracks } from './OutlinerTracks';
import { ContextMenu } from '../../common/ContextMenu';
import { useContextMenu } from '../../common/useContextMenu';
import { buildTimelineContextMenu } from './timelineContextMenus';
import { useKeyframeModal } from './useKeyframeModal';
import { useKeyframeShortcuts } from './useKeyframeShortcuts';
import { useSplitLayer, useTrimToPlayhead, useRippleDelete } from './useSplitLayer';

import { createLayerInstance } from '../../../utils/createLayerInstance';

export const TimelinePanel: React.FC = () => {
  const comp = useCompositionStore(s =>
    s.activeCompositionId ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null : null,
  );
  const zoom = useTimelineStore(s => s.zoom);
  const setZoom = useTimelineStore(s => s.setZoom);
  const scrollX = useTimelineStore(s => s.scrollX);
  const setScrollX = useTimelineStore(s => s.setScrollX);
  const playbackStateForPoll = useTimelineStore(s => s.playbackState);

  const [outlinerWidth, setOutlinerWidth] = useState(350);
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

  const [timelineDrop, setTimelineDrop] = useState(false);

  useKeyframeModal(zoom, totalFrames);
  useKeyframeShortcuts();
  const splitLayer = useSplitLayer();
  const trimToPlayhead = useTrimToPlayhead();
  const rippleDelete = useRippleDelete();

  // Timeline-specific keyboard shortcuts: split, trim, ripple
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // Split at playhead — Ctrl+Shift+D
      if (isCtrl && isShift && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault(); splitLayer(); return;
      }
      // Trim in / delete before — Ctrl+[
      if (isCtrl && e.key === '[') {
        e.preventDefault(); trimToPlayhead('in'); return;
      }
      // Trim out / delete after — Ctrl+]
      if (isCtrl && e.key === ']') {
        e.preventDefault(); trimToPlayhead('out'); return;
      }
      // Ripple trim — Alt+[ / Alt+]
      if (e.altKey && e.key === '[') {
        e.preventDefault(); trimToPlayhead('in'); return;
      }
      if (e.altKey && e.key === ']') {
        e.preventDefault(); trimToPlayhead('out'); return;
      }
      // Ripple delete — Shift+Del (exclusive: no Ctrl/Alt)
      if (isShift && !isCtrl && !e.altKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault(); rippleDelete(); return;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [splitLayer, trimToPlayhead, rippleDelete]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const enter = () => { (document as any)._lastMouseInTimeline = true; };
    const leave = () => { (document as any)._lastMouseInTimeline = false; };
    el.addEventListener('mouseenter', enter); el.addEventListener('mouseleave', leave);
    return () => { el.removeEventListener('mouseenter', enter); el.removeEventListener('mouseleave', leave); };
  }, []);

  useEffect(() => {
    const g = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    const s = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
    document.addEventListener('kfmodal:grab', g);
    document.addEventListener('kfmodal:scale', s);
    return () => { document.removeEventListener('kfmodal:grab', g); document.removeEventListener('kfmodal:scale', s); };
  }, []);

  // Position the playhead. During idle/pause we read from currentFrame prop.
  // During playback we run our own RAF loop reading animationClock directly —
  // because playback silently mutates currentTime (no Zustand notification)
  // to avoid the React re-render cascade at 30fps.
  useEffect(() => {
    if (playheadRef.current) {
      playheadRef.current.style.left = `${currentFrame * zoom - scrollX}px`;
    }
  }, [currentFrame, zoom, scrollX]);

  useEffect(() => {
    if (playbackStateForPoll !== 'playing') return;
    let rafId = 0;
    const tick = () => {
      if (playheadRef.current) {
        const f = animationClock.currentFrame;
        playheadRef.current.style.left = `${f * zoom - scrollX}px`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playbackStateForPoll, zoom, scrollX]);

  const onOutlinerScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (tracksScrollRef.current) tracksScrollRef.current.scrollTop = e.currentTarget.scrollTop;
  }, []);
  const onTracksScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget;
    setScrollX(t.scrollLeft);
    if (outlinerScrollRef.current) outlinerScrollRef.current.scrollTop = t.scrollTop;
  }, [setScrollX]);

  useEffect(() => {
    const el = rootRef.current; // ← attach to WHOLE timeline panel, not just tracks
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey || e.shiftKey)) return;

      // Only handle if the mouse is over the tracks area (right side of panel)
      const rightSide = rightSideRef.current;
      if (!rightSide) return;
      const rect = rightSide.getBoundingClientRect();
      if (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom
      ) return;

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const mouseX = e.clientX - rect.left;
        const st = useTimelineStore.getState();
        const oldZ = st.zoom;
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const newZ = Math.max(0.01, Math.min(500, oldZ * factor));
        if (newZ === oldZ) return; // hit clamp — nothing to do
        const frameUnder = (mouseX + st.scrollX) / oldZ;
        setZoom(newZ);
        const newSx = Math.max(0, frameUnder * newZ - mouseX);
        setScrollX(newSx);
        if (tracksScrollRef.current) tracksScrollRef.current.scrollLeft = newSx;
        return;
      }

      if (e.shiftKey && tracksScrollRef.current) {
        e.preventDefault();
        e.stopPropagation();
        tracksScrollRef.current.scrollLeft += e.deltaY;
      }
    };

    // ⚠ Register in CAPTURE phase so we run BEFORE the global App handler
    // that calls preventDefault on all Ctrl+wheel events
    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => el.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
  }, [setZoom, setScrollX]);

  // Handle zoom-to-fit event
  useEffect(() => {
    const handler = () => {
      if (!comp) return;
      const el = rightSideRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const availableWidth = Math.max(200, rect.width - 40);
      const idealZoom = availableWidth / Math.max(1, totalFrames);
      const clamped = Math.max(0.01, Math.min(500, idealZoom));
      setZoom(clamped);
      setScrollX(0);
      if (tracksScrollRef.current) tracksScrollRef.current.scrollLeft = 0;
    };
    document.addEventListener('timeline:zoomToFit', handler);
    return () => document.removeEventListener('timeline:zoomToFit', handler);
  }, [comp, totalFrames, setZoom, setScrollX]);

  useEffect(() => {
    const el = rightSideRef.current; if (!el) return;
    let panning = false, lx = 0, ly = 0;
    const stop = () => { if (!panning) return; panning = false; document.body.style.cursor = ''; };
    const onDown = (e: MouseEvent) => {
      if (e.button !== 1) return; e.preventDefault();
      panning = true; lx = e.clientX; ly = e.clientY;
      document.body.style.cursor = 'grabbing';
    };
    const onMove = (e: MouseEvent) => {
      if (!panning) return;
      if ((e.buttons & 4) === 0) { stop(); return; }
      if (tracksScrollRef.current) {
        tracksScrollRef.current.scrollLeft -= e.clientX - lx;
        tracksScrollRef.current.scrollTop  -= e.clientY - ly;
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

  // Handle asset or effect drop from project panel onto timeline
  const handleTimelineDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setTimelineDrop(false);
    if (!comp) return;

    // 0. Transition dropped — create transition layer at playhead
    const transitionData = e.dataTransfer.getData('application/onion-transition');
    if (transitionData) {
      try {
        const { type: transitionType, name: transitionName } = JSON.parse(transitionData);
        const currentFrame = Math.floor(comp.currentTime * comp.fps);
        const layer = createLayerInstance('transition', comp, {
          name: transitionName || transitionType,
          startFrame: currentFrame,
          endFrame: currentFrame + Math.round(comp.fps),
          zIndex: comp.layers.length + 1,
        });
        if (layer.data && typeof layer.data === 'object') {
          (layer.data as any).transitionType = transitionType;
        }
        useCompositionStore.getState().addLayer(comp.id, layer);
        useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: comp.id });
        useNotificationStore.getState().addNotification({
          type: 'success', message: `Added "${transitionName}" transition`, autoDismiss: 2000,
        });
        try { (window as any).__renderer?.renderLoop?.requestRender?.(); } catch {}
      } catch { /* parse error */ }
      return;
    }

    // 1. Effect dropped onto empty timeline — create an adjustment layer
    const effectType = e.dataTransfer.getData('application/onion-effect');
    if (effectType) {
      const cs = useCompositionStore.getState();
      const adjLayer = createLayerInstance('adjustment', comp, {
        name: `Adjustment: ${effectType}`,
        zIndex: comp.layers.length + 1,
      });
      cs.addLayer(comp.id, adjLayer);
      import('../../../state/effectsStore').then(({ useEffectsStore }) => {
        useEffectsStore.getState().addEffect(adjLayer.id, effectType as any);
      });
      useSelectionStore.getState().select({ type: 'layer', id: adjLayer.id, compositionId: comp.id });
      useNotificationStore.getState().addNotification({
        type: 'success', message: 'Adjustment layer created — affects layers below', autoDismiss: 2500,
      });
      try { (window as any).__renderer?.renderLoop?.requestRender?.(); } catch { /* ok */ }
      return;
    }

    // 2. Asset dropped — use unified add-to-timeline (handles 3D, video, audio, image correctly)
    const assetId = e.dataTransfer.getData('application/onion-asset');
    if (assetId) {
      const { addAssetIdToTimeline } = await import('../../../utils/unifiedImport');
      addAssetIdToTimeline(assetId, { compId: comp.id });
      return;
    }

    // 3. OS files dropped directly onto timeline — import + add to timeline
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const { importFiles } = await import('../../../utils/unifiedImport');
      await importFiles(files, {
        compIdForSvg: comp.id,
        addToTimeline: true,
      });
    }
  }, [comp]);

  if (!comp) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center"
        style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)', background: 'var(--color-panel)' }}
      >
        No composition
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="flex flex-col h-full select-none"
      style={{ background: 'var(--color-panel)', borderRadius: 'var(--radius-panel)', overflow: 'hidden', outline: timelineDrop ? '2px dashed var(--color-accent)' : 'none', outlineOffset: -2 }}
      onDragOver={(e) => {
        const types = Array.from(e.dataTransfer.types);
        if (types.includes('application/onion-asset') || types.includes('application/onion-effect') || types.includes('application/onion-transition')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setTimelineDrop(true);
        }
      }}
      onDragLeave={() => setTimelineDrop(false)}
      onDrop={handleTimelineDrop}
    >
      <PlaybackControls comp={comp} totalFrames={totalFrames} currentFrame={currentFrame} />
      <TimelineHeader comp={comp} currentFrame={currentFrame} totalFrames={totalFrames} />
      <EditToolbar />

      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex-shrink-0 overflow-hidden flex flex-col"
          style={{ width: outlinerWidth, background: 'var(--color-panel)', borderRight: '1px solid var(--color-border)' }}
        >
          <OutlinerTracksHeader compId={comp.id} />
          <div ref={outlinerScrollRef} className="flex-1 overflow-auto" onScroll={onOutlinerScroll}>
            <OutlinerTracks layers={layers} compId={comp.id} />
          </div>
        </div>

        <div
          className="flex-shrink-0 cursor-col-resize transition-colors"
          style={{ width: 1, background: 'var(--color-border)' }}
          onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-accent)'}
          onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-border)'}
          onMouseDown={(e) => {
            e.preventDefault();
            const sx = e.clientX, sw = outlinerWidth;
            const mm = (ev: MouseEvent) => setOutlinerWidth(Math.max(250, Math.min(600, sw + ev.clientX - sx)));
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
            workAreaEnabled={!!comp.workAreaEnabled}
          />
          <div ref={tracksScrollRef} className="flex-1 overflow-auto relative" onScroll={onTracksScroll}
               style={{ background: 'var(--timeline-track-bg)' }}>
            <div style={{
              width: totalFrames * zoom + 800, // extra space past comp end for out-of-comp visualization
              minHeight: '100%',
              position: 'relative',
            }}>
              <KeyframeArea
                layers={layers} currentFrame={currentFrame}
                zoom={zoom} totalFrames={totalFrames} compId={comp.id}
              />
            </div>
          </div>

          {/* Playhead — draggable from tracks area */}
          <div
            ref={playheadRef}
            className="absolute top-0 bottom-0 z-20"
            style={{ width: 2, left: currentFrame * zoom - scrollX, pointerEvents: 'none' }}
          >
            <svg width="12" height="12" style={{ position: 'absolute', top: 0, left: -5, pointerEvents: 'none' }}>
              <polygon points="1,1 11,1 6,11" fill="var(--timeline-playhead)" />
            </svg>
            <div style={{ width: 2, height: '100%', background: 'var(--timeline-playhead)', opacity: 0.9, pointerEvents: 'none' }} />
          </div>
          {/* Invisible wider hit area for dragging playhead from tracks area */}
          <PlayheadDragHitArea
            compId={comp.id} fps={fps} zoom={zoom} scrollX={scrollX}
            tracksScrollRef={tracksScrollRef}
          />

          {ctxMenu.menu && <ContextMenu items={ctxMenu.menu.items} position={ctxMenu.menu.position} onClose={ctxMenu.close} />}
        </div>
      </div>
    </div>
  );
};

const OutlinerTracksHeader: React.FC<{ compId: string }> = ({ compId }) => {
  const ctx = useContextMenu();
  const layers = useCompositionStore(s => {
    const comp = s.compositions.find(c => c.id === compId);
    return comp?.layers ?? [];
  });
  const allVisible = layers.length > 0 && layers.every(l => l.visible);
  const someHidden = layers.length > 0 && layers.some(l => !l.visible);

  const openAdd = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    ctx.open(e, [
      { id: 'add.hdr', label: 'Add Layer', disabled: true },
      { id: 'add.d1', divider: true },
      { id: 'add.solid', label: 'Solid', onClick: () => addFromHeader(compId, 'solid') },
      { id: 'add.shape', label: 'Shape', onClick: () => addFromHeader(compId, 'shape') },
      { id: 'add.text',  label: 'Text',  onClick: () => addFromHeader(compId, 'text') },
      { id: 'add.null',  label: 'Null Object', onClick: () => addFromHeader(compId, 'null') },
      { id: 'add.adj',   label: 'Adjustment Layer', onClick: () => addFromHeader(compId, 'adjustment') },
      { id: 'add.camera', label: 'Camera', onClick: () => addFromHeader(compId, 'camera') },
      { id: 'add.light',  label: 'Light', onClick: () => addFromHeader(compId, 'light') },
      { id: 'add.sep',   label: '', divider: true },
      { id: 'add.d2', divider: true },
      { id: 'add.image', label: 'Image', onClick: () => addFromHeader(compId, 'image') },
      { id: 'add.video', label: 'Video', onClick: () => addFromHeader(compId, 'video') },
    ]);
  };

  const toggleMasterVisibility = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const cs = useCompositionStore.getState();
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;
    if (e.altKey) {
      // Alt+click: invert visibility of all layers
      for (const l of comp.layers) {
        cs.updateLayer(compId, l.id, { visible: !l.visible });
      }
    } else if (allVisible) {
      // All visible → hide all
      for (const l of comp.layers) {
        if (l.visible) cs.updateLayer(compId, l.id, { visible: false });
      }
    } else {
      // Some hidden → show all
      for (const l of comp.layers) {
        if (!l.visible) cs.updateLayer(compId, l.id, { visible: true });
      }
    }
  };

  const btnStyle: React.CSSProperties = {
    width: 22, height: 22, color: 'var(--color-text-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, border: 0, background: 'transparent', cursor: 'pointer',
    transition: 'background 120ms, color 120ms',
  };

  return (
    <div
      className="flex items-center px-3 gap-2"
      style={{
        height: 32,
        background: 'transparent',
        borderBottom: '1px solid var(--color-border)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-secondary)',
        fontWeight: 500,
      }}
    >
      <span className="flex-1 truncate">Layers</span>
      {/* Master visibility toggle */}
      <button
        onClick={toggleMasterVisibility}
        title={allVisible ? 'Hide All Layers (Alt+Click to invert)' : someHidden ? 'Show All Layers (Alt+Click to invert)' : 'Hide All Layers (Alt+Click to invert)'}
        style={{
          ...btnStyle,
          color: allVisible ? 'var(--color-text-secondary)' : someHidden ? 'var(--color-accent)' : 'var(--color-text-disabled)',
          opacity: allVisible ? 0.7 : someHidden ? 0.9 : 0.4,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {allVisible ? <Eye size={14} strokeWidth={1.75} /> : <EyeOff size={14} strokeWidth={1.75} />}
      </button>
      {/* Add layer button */}
      <button
        onClick={openAdd}
        title="Add Layer"
        style={btnStyle}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}
      >
        <Plus size={14} strokeWidth={2} />
      </button>
      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}
    </div>
  );
};

/** Invisible hit area overlaying the tracks area for dragging the playhead */
const PlayheadDragHitArea: React.FC<{
  compId: string; fps: number; zoom: number; scrollX: number;
  tracksScrollRef: React.RefObject<HTMLDivElement | null>;
}> = ({ compId, fps, zoom, scrollX, tracksScrollRef }) => {
  const frameFromX = useCallback((clientX: number): number => {
    const rect = tracksScrollRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const x = clientX - rect.left + scrollX;
    return Math.max(0, Math.round(x / zoom));
  }, [zoom, scrollX, tracksScrollRef]);

  const handleDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = tracksScrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
    const cf = comp ? Math.floor(comp.currentTime * fps) : 0;
    const playheadPx = cf * zoom - scrollX;
    const clickPx = e.clientX - rect.left;
    if (Math.abs(clickPx - playheadPx) > 12) return;

    e.preventDefault();
    e.stopPropagation();
    const f = frameFromX(e.clientX);
    animationClock.seekToFrame(f);
    useCompositionStore.getState().setCurrentTime(compId, f / fps);
    const onMove = (ev: MouseEvent) => {
      const fr = frameFromX(ev.clientX);
      animationClock.seekToFrame(fr);
      useCompositionStore.getState().setCurrentTime(compId, fr / fps);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [compId, fps, zoom, scrollX, frameFromX, tracksScrollRef]);

  const currentFrame = useCompositionStore(s => {
    const c = s.compositions.find(x => x.id === compId);
    return c ? Math.floor(c.currentTime * fps) : 0;
  });

  return (
    <div
      className="absolute top-0 bottom-0 z-30"
      style={{
        width: 12,
        left: currentFrame * zoom - scrollX - 6,
        cursor: 'ew-resize',
        pointerEvents: 'auto',
      }}
      onMouseDown={handleDown}
    />
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