import React, { useCallback, useMemo } from 'react';
import { ChevronDown, Grid3X3, Circle, Magnet, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, Trash2, MonitorPlay } from 'lucide-react';
import { useTimelineStore } from '../../../state/timelineStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useMarkerStore } from '../../../state/markerStore';
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu, type ContextMenuItem } from '../../common/ContextMenu';
import { FrameInput } from './FrameInput';
import { animationClock } from './PlaybackControls';
import type { Composition } from '../../../types/composition';

interface Props { comp: Composition; currentFrame: number; totalFrames: number; }

const HdrBtn: React.FC<{ onClick?: (e: React.MouseEvent) => void; title?: string; active?: boolean; children: React.ReactNode }> = ({ onClick, title, active, children }) => (
  <button
    onClick={onClick} title={title}
    className="flex items-center gap-1.5 border-0 bg-transparent cursor-pointer transition-colors shrink-0"
    style={{
      height: 26, padding: '0 10px',
      borderRadius: 'var(--radius-sm)',
      fontSize: 'var(--font-size-sm)',
      color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
      background: active ? 'var(--color-accent-muted)' : 'transparent',
    }}
    onMouseEnter={(e)=>{ if(!active){ (e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'; (e.currentTarget as HTMLElement).style.color='var(--color-text-primary)'; } }}
    onMouseLeave={(e)=>{ if(!active){ (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='var(--color-text-secondary)'; } }}
  >
    {children}
  </button>
);

const IconOnly: React.FC<{ onClick?: () => void; title?: string; children: React.ReactNode }> = ({ onClick, title, children }) => (
  <button
    onClick={onClick} title={title}
    className="flex items-center justify-center border-0 bg-transparent cursor-pointer transition-colors shrink-0"
    style={{
      width: 26, height: 26,
      borderRadius: 'var(--radius-sm)',
      color: 'var(--color-text-secondary)',
    }}
    onMouseEnter={(e)=>{ (e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'; (e.currentTarget as HTMLElement).style.color='var(--color-text-primary)'; }}
    onMouseLeave={(e)=>{ (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='var(--color-text-secondary)'; }}
  >{children}</button>
);

const Sep: React.FC = () => <div className="shrink-0" style={{ width: 1, height: 18, background: 'var(--color-border)', margin: '0 6px' }} />;

export const TimelineHeader: React.FC<Props> = ({ comp, currentFrame, totalFrames }) => {
  const ps = useTimelineStore(s => s.playbackState);
  const loop = useTimelineStore(s => s.loop);
  const setLoop = useTimelineStore(s => s.setLoop);
  const autoKey = useTimelineStore(s => s.autoKey);
  const toggleAutoKey = useTimelineStore(s => s.toggleAutoKey);
  const snapping = useTimelineStore(s => s.snapping);
  const toggleSnapping = useTimelineStore(s => s.toggleSnapping);
  const autoCache = useTimelineStore(s => s.autoCache);
  const toggleAutoCache = useTimelineStore(s => s.toggleAutoCache);
  const timeDisplay = useTimelineStore(s => s.timeDisplay);
  const setTimeDisplay = useTimelineStore(s => s.setTimeDisplay);
  const ctx = useContextMenu();
  const fps = comp.fps;

  const setDuration = useCallback((frames: number) => {
    useCompositionStore.getState().updateComposition(comp.id, { duration: Math.max(1, frames) / fps });
    animationClock.setTotalFrames(frames);
  }, [comp.id, fps]);
  const seekTo = useCallback((f: number) => {
    animationClock.seekToFrame(f);
    useCompositionStore.getState().setCurrentTime(comp.id, f / fps);
  }, [comp.id, fps]);

  const viewMenu = useMemo((): ContextMenuItem[] => [
    { id: 'v.fit', label: 'Zoom to Fit', shortcut: 'Home', onClick: () => useTimelineStore.getState().zoomToFit() },
    { id: 'v.d1', divider: true },
    { id: 'v.frames', label: 'Frames', checked: timeDisplay === 'frames', onClick: () => setTimeDisplay('frames') },
    { id: 'v.seconds', label: 'Seconds', checked: timeDisplay === 'seconds', onClick: () => setTimeDisplay('seconds') },
    { id: 'v.smpte', label: 'SMPTE', checked: timeDisplay === 'smpte', onClick: () => setTimeDisplay('smpte') },
  ], [timeDisplay, setTimeDisplay]);

  const markers = useMarkerStore(s => s.markersByComposition[comp.id] ?? []);
  const hasMarkers = markers.length > 0;
  const addMarkerH = useCallback(() => { useMarkerStore.getState().addMarker(comp.id, animationClock.currentFrame / fps, animationClock.currentFrame); }, [comp.id, fps]);
  const removeMarkerH = useCallback(() => {
    const frame = animationClock.currentFrame;
    const atFrame = useMarkerStore.getState().getMarkersForComposition(comp.id).find(m => m.frame === frame);
    if (atFrame) useMarkerStore.getState().removeMarker(comp.id, atFrame.id);
  }, [comp.id]);
  const clearMarkersH = useCallback(() => useMarkerStore.getState().clearAllMarkers(comp.id), [comp.id]);

  const markerMenu = useMemo((): ContextMenuItem[] => [
    { id: 'm.add', label: 'Add Marker at Playhead', shortcut: 'M', onClick: addMarkerH },
    { id: 'm.rem', label: 'Remove Marker at Playhead', disabled: !hasMarkers, onClick: removeMarkerH },
    { id: 'm.d1', divider: true },
    { id: 'm.clear', label: 'Clear All Markers', disabled: !hasMarkers, onClick: clearMarkersH },
  ], [addMarkerH, removeMarkerH, clearMarkersH, hasMarkers]);

  const playbackMenu = useMemo((): ContextMenuItem[] => [
    { id: 'p.loop', label: 'Loop', checked: loop, onClick: () => setLoop(!loop) },
    { id: 'p.autoKey', label: 'Auto Keying', checked: autoKey, onClick: toggleAutoKey },
    { id: 'p.autoCache', label: 'Auto Cache', checked: autoCache, onClick: toggleAutoCache },
    { id: 'p.snap', label: 'Snap', checked: snapping, onClick: toggleSnapping },
  ], [loop, setLoop, autoKey, toggleAutoKey, autoCache, toggleAutoCache, snapping, toggleSnapping]);

  return (
    <div className="flex items-center gap-1 px-3 flex-shrink-0" style={{ height: 36, borderBottom: '1px solid var(--color-border)' }}>
      {/* Left group: menus */}
      <HdrBtn onClick={(e)=>ctx.open(e, viewMenu)} title="Time Display">
        <Grid3X3 size={13} strokeWidth={1.75} />
        <span style={{ fontWeight: 600 }}>
          {timeDisplay === 'frames' ? 'Frames' : timeDisplay === 'seconds' ? 'Seconds' : 'SMPTE'}
        </span>
        <ChevronDown size={11} strokeWidth={2} />
      </HdrBtn>
      <HdrBtn onClick={(e)=>ctx.open(e, markerMenu)} title="Marker">
        <span>Marker</span> <ChevronDown size={11} strokeWidth={2} />
      </HdrBtn>
      <HdrBtn onClick={(e)=>ctx.open(e, playbackMenu)} title="Playback">
        <span>Playback</span> <ChevronDown size={11} strokeWidth={2} />
      </HdrBtn>

      <div className="flex-1" />

      {/* Center group: transport */}
      <button onClick={toggleAutoKey} title={autoKey ? 'Auto Keying ON' : 'Auto Keying OFF'}
        className="flex items-center justify-center border-0 cursor-pointer transition-all shrink-0"
        style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', background: autoKey ? 'rgba(255,80,80,0.14)' : 'transparent', color: autoKey ? '#ff6060' : 'var(--color-text-disabled)' }}
      >
        <Circle size={12} strokeWidth={2} fill={autoKey ? 'currentColor' : 'none'} />
      </button>

      <Sep />

      <IconOnly title="Go to start" onClick={() => animationClock.goToStart()}><SkipBack size={13} strokeWidth={1.75} /></IconOnly>
      <IconOnly title="Prev keyframe" onClick={() => document.dispatchEvent(new CustomEvent('playback:prevKeyframe'))}><ChevronLeft size={13} strokeWidth={2} /></IconOnly>
      <IconOnly title="Prev frame" onClick={() => animationClock.stepBackward()}><ChevronLeft size={13} strokeWidth={2.5} /></IconOnly>
      <IconOnly title="Play/Pause" onClick={() => animationClock.togglePlay()}>
        {ps === 'playing' ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
      </IconOnly>
      <IconOnly title="Next frame" onClick={() => animationClock.stepForward()}><ChevronRight size={13} strokeWidth={2.5} /></IconOnly>
      <IconOnly title="Next keyframe" onClick={() => document.dispatchEvent(new CustomEvent('playback:nextKeyframe'))}><ChevronRight size={13} strokeWidth={2} /></IconOnly>
      <IconOnly title="Go to end" onClick={() => animationClock.goToEnd()}><SkipForward size={13} strokeWidth={1.75} /></IconOnly>

      <Sep />

      <button onClick={toggleSnapping} title={snapping ? 'Snap ON' : 'Snap OFF'}
        className="flex items-center justify-center border-0 cursor-pointer transition-all shrink-0"
        style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', background: snapping ? 'var(--color-accent-muted)' : 'transparent', color: snapping ? 'var(--color-accent)' : 'var(--color-text-disabled)' }}
      >
        <Magnet size={13} strokeWidth={1.75} />
      </button>

      <div className="flex-1" />

      {/* Right group: frame inputs + preview/cache */}
      <FrameInput value={currentFrame} onChange={seekTo} min={0} max={totalFrames} width={58} />
      <span
        style={{ fontSize: 9, color: 'var(--color-accent)', fontFamily: 'var(--font-family-mono)', fontWeight: 600, letterSpacing: '0.04em', lineHeight: 1 }}
        title={`Displaying ${timeDisplay} — click time display button to change`}
      >
        {timeDisplay === 'frames' ? 'f' : timeDisplay === 'seconds' ? 's' : 'tc'}
      </span>
      <div className="w-2" />
      <FrameInput value={0} onChange={() => {}} label="Start" width={96} />
      <FrameInput value={totalFrames} onChange={setDuration} min={1} label="End" width={96} />

      <Sep />

      <RAMPreviewButton compId={comp.id} />
      <Sep />
      <ClearCacheButton />

      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}
    </div>
  );
};

const ClearCacheButton: React.FC = () => {
  const [mb, setMb] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      const fc = (window as any).__frameCache;
      if (fc) setMb(Math.round(fc.getMemoryUsage() / (1024 * 1024)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <HdrBtn onClick={() => { const fc = (window as any).__frameCache; if (fc) { fc.invalidateAllCompositions(); setMb(0); } }} title={`Clear cache (${mb} MB used)`}>
      <Trash2 size={12} strokeWidth={1.75} />
      {mb > 0 && <span style={{ fontSize: 10, fontFamily: 'var(--font-family-mono)' }}>{mb}MB</span>}
    </HdrBtn>
  );
};

const RAMPreviewButton: React.FC<{ compId: string }> = ({ compId }) => {
  const [status, setStatus] = React.useState<'idle' | 'building' | 'complete'>('idle');
  React.useEffect(() => { setStatus('idle'); }, [compId]);
  const handleClick = () => {
    const builder = (window as any).__ramPreviewBuilder;
    if (!builder) return;
    if (builder.isBuilding) { builder.cancel(); setStatus('idle'); return; }
    setStatus('building'); builder.startManualPreview(compId, 'half');
    builder.onProgress = (p: { state: string }) => {
      if (p.state === 'complete') setStatus('complete');
      else if (p.state === 'cancelled' || p.state === 'idle') setStatus('idle');
    };
  };
  const isBuilding = status === 'building';
  const color = isBuilding ? '#facc15' : status === 'complete' ? '#4ade80' : undefined;
  return (
    <button onClick={handleClick} title={isBuilding ? 'Cancel RAM Preview' : status === 'complete' ? 'RAM Preview (cached)' : 'Start RAM Preview'}
      className="flex items-center gap-1.5 border-0 bg-transparent cursor-pointer transition-colors shrink-0"
      style={{ height: 26, padding: '0 10px', borderRadius: 'var(--radius-sm)', color: color ?? 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}
      onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
      onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='transparent'}
    >
      <MonitorPlay size={12} strokeWidth={1.75} />
      <span>{isBuilding ? 'Preview...' : status === 'complete' ? 'Cached' : 'Preview'}</span>
    </button>
  );
};