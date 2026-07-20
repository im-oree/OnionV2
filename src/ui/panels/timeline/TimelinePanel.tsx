import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useNotificationStore } from '../../../state/notificationStore';
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
import { useSplitLayer, useTrimToPlayhead, useRippleDelete } from './useSplitLayer';
import { CacheIndicator } from './CacheIndicator';
import { assetManager } from '../../../storage/AssetManager';
import { createLayerInstance } from '../../../utils/createLayerInstance';
import { useProjectStore } from '../../../state/projectStore';

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

  const [buildProgress, setBuildProgress] = useState<{ currentFrame: number; totalFrames: number } | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [timelineDrop, setTimelineDrop] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const builder = (window as any).__ramPreviewBuilder;
      if (!builder) { setIsBuilding(false); setBuildProgress(null); return; }
      if (builder.isBuilding) {
        setIsBuilding(true);
        const p = builder.progress;
        if (p && p.totalFrames > 0) setBuildProgress({ currentFrame: p.currentFrame, totalFrames: p.totalFrames });
      } else { setIsBuilding(false); setBuildProgress(null); }
    }, 200);
    return () => clearInterval(interval);
  }, []);

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

      // Ctrl+Shift+D: Split at playhead
      if (isCtrl && isShift && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault(); splitLayer(); return;
      }
      // Ctrl+[: Trim in (set layer start to playhead)
      if (isCtrl && e.key === '[') {
        e.preventDefault(); trimToPlayhead('in'); return;
      }
      // Ctrl+]: Trim out (set layer end to playhead)
      if (isCtrl && e.key === ']') {
        e.preventDefault(); trimToPlayhead('out'); return;
      }
      // Alt+[: Ripple trim in (shift all layers left)
      if (e.altKey && e.key === '[') {
        e.preventDefault(); trimToPlayhead('in'); return;
      }
      // Alt+]: Ripple trim out (shift all layers right)
      if (e.altKey && e.key === ']') {
        e.preventDefault(); trimToPlayhead('out'); return;
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

  useEffect(() => {
    if (playheadRef.current) playheadRef.current.style.left = `${currentFrame * zoom - scrollX}px`;
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
    const el = rightSideRef.current; if (!el) return;
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
      if (e.shiftKey && tracksScrollRef.current) { e.preventDefault(); tracksScrollRef.current.scrollLeft += e.deltaY; }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setZoom, setScrollX]);

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
  const handleTimelineDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setTimelineDrop(false);
    if (!comp) return;

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

    // 2. Asset dropped — create image/video/audio layer
    const assetId = e.dataTransfer.getData('application/onion-asset');
    if (!assetId) return;
    // Try assetManager first, fall back to projectStore
    let asset = assetManager.getAsset(assetId);
    if (!asset) {
      const pa = useProjectStore.getState().project.assets.find(a => a.id === assetId);
      if (pa) {
        asset = { id: pa.id, name: pa.name, type: pa.type as any, url: pa.path, size: pa.size, mimeType: pa.mimeType, importedAt: pa.importedAt, missing: false, naturalWidth: pa.naturalWidth ?? 100, naturalHeight: pa.naturalHeight ?? 100, duration: pa.duration } as any;
      }
    }
    if (!asset) {
      useNotificationStore.getState().addNotification({ type: 'warning', message: 'Asset not found — try re-importing.', autoDismiss: 3000 });
      return;
    }
    const type = asset.type === 'video' ? 'video' : asset.type === 'audio' ? 'audio' : 'image';
    const layer = createLayerInstance(type, comp, {
      name: asset.name,
      zIndex: comp.layers.length + 1,
      data: type === 'video'
        ? { assetId: asset.id, naturalWidth: asset.naturalWidth ?? 100, naturalHeight: asset.naturalHeight ?? 100, duration: asset.duration ?? 10, muted: false, volume: 1, playbackRate: 1 }
        : type === 'audio'
          ? { assetId: asset.id, duration: asset.duration ?? 10, volume: 1, muted: false, playbackRate: 1 }
          : { assetId: asset.id, naturalWidth: asset.naturalWidth ?? 100, naturalHeight: asset.naturalHeight ?? 100 },
    });
    useCompositionStore.getState().addLayer(comp.id, layer);
    useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: comp.id });
    try { (window as any).__renderer?.renderLoop?.requestRender?.(); } catch { /* ok */ }
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
        if (types.includes('application/onion-asset') || types.includes('application/onion-effect')) {
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
          <div ref={tracksScrollRef} className="flex-1 overflow-auto relative" onScroll={onTracksScroll}
               style={{ background: 'var(--timeline-track-bg)' }}>
            <div style={{ width: totalFrames * zoom + 100, minHeight: '100%', position: 'relative' }}>
              <CacheIndicator
                compId={comp.id} totalFrames={totalFrames}
                zoom={zoom} scrollX={scrollX}
                isBuilding={isBuilding} buildProgress={buildProgress}
              />
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