import React, { useCallback, useMemo } from 'react';
import { ChevronDown, Grid3X3, Circle, Magnet, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, Zap, LineChart } from 'lucide-react';
import { useTimelineStore } from '../../../state/timelineStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useUIStore } from '../../../state/uiStore';
import { useMarkerStore } from '../../../state/markerStore';
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu, type ContextMenuItem } from '../../common/ContextMenu';
import { FrameInput } from './FrameInput';
import { animationClock } from './PlaybackControls';
import { RamPreviewButton } from './RamPreviewButton';
import type { Composition } from '../../../types/composition';

interface Props { comp: Composition; currentFrame: number; totalFrames: number; }

const HdrBtn: React.FC<{ onClick?: (e: React.MouseEvent) => void; onContextMenu?: (e: React.MouseEvent) => void; title?: string; active?: boolean; children: React.ReactNode }> = ({ onClick, onContextMenu, title, active, children }) => (
  <button
    onClick={onClick} onContextMenu={onContextMenu} title={title}
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

/**
 * Live-updating frame input that polls animationClock via RAF during playback.
 * Falls back to the prop value when stopped/paused, avoiding stale display
 * from silent currentTime writes.
 */
const LiveFrameInput: React.FC<{
  currentFrame: number;
  onChange: (f: number) => void;
  totalFrames: number;
}> = ({ currentFrame, onChange, totalFrames }) => {
  const playbackState = useTimelineStore((s) => s.playbackState);
  const [liveFrame, setLiveFrame] = React.useState(currentFrame);
  const rafRef = React.useRef(0);

  React.useEffect(() => {
    if (playbackState !== 'playing') {
      setLiveFrame(currentFrame);
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      setLiveFrame(animationClock.currentFrame);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playbackState, currentFrame]);

  return (
    <FrameInput
      value={liveFrame}
      onChange={onChange}
      min={0}
      max={totalFrames}
      width={58}
    />
  );
};

export const TimelineHeader: React.FC<Props> = ({ comp, currentFrame, totalFrames }) => {
  const ps = useTimelineStore(s => s.playbackState);
  const loop = useTimelineStore(s => s.loop);
  const setLoop = useTimelineStore(s => s.setLoop);
  const autoKey = useTimelineStore(s => s.autoKey);
  const toggleAutoKey = useTimelineStore(s => s.toggleAutoKey);
  const snapping = useTimelineStore(s => s.snapping);
  const toggleSnapping = useTimelineStore(s => s.toggleSnapping);
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

  // ── Motion Blur master toggle ─────────────────────────────
  const mbEnabled = !!comp.motionBlur?.enabled;
  const toggleMB = useCallback(() => {
    const cur = comp.motionBlur ?? { enabled: false, shutterAngle: 180, shutterPhase: -90, samples: 8 };
    useCompositionStore.getState().updateComposition(comp.id, {
      motionBlur: { ...cur, enabled: !cur.enabled },
    });
  }, [comp.id, comp.motionBlur]);

  const mbMenu = useMemo((): ContextMenuItem[] => {
    const cur = comp.motionBlur ?? { enabled: false, shutterAngle: 180, shutterPhase: -90, samples: 8 };
    const patch = (upd: Partial<typeof cur>) => useCompositionStore.getState().updateComposition(comp.id, { motionBlur: { ...cur, ...upd } });
    return [
      { id: 'mb.enable', label: cur.enabled ? 'Disable Motion Blur' : 'Enable Motion Blur', checked: cur.enabled, onClick: () => patch({ enabled: !cur.enabled }) },
      { id: 'mb.d1', divider: true },
      { id: 'mb.hdr', label: `Shutter Angle: ${cur.shutterAngle}°`, disabled: true },
      { id: 'mb.a90',   label: '  90°',  onClick: () => patch({ shutterAngle: 90 }) },
      { id: 'mb.a180',  label: '  180° (default)', onClick: () => patch({ shutterAngle: 180 }) },
      { id: 'mb.a360',  label: '  360°', onClick: () => patch({ shutterAngle: 360 }) },
      { id: 'mb.a720',  label: '  720°', onClick: () => patch({ shutterAngle: 720 }) },
      { id: 'mb.d2', divider: true },
      { id: 'mb.hdr2', label: `Samples: ${cur.samples}`, disabled: true },
      { id: 'mb.s4',   label: '  4 (draft)',  onClick: () => patch({ samples: 4 }) },
      { id: 'mb.s8',   label: '  8',   onClick: () => patch({ samples: 8 }) },
      { id: 'mb.s16',  label: '  16',  onClick: () => patch({ samples: 16 }) },
      { id: 'mb.s32',  label: '  32 (high quality)',  onClick: () => patch({ samples: 32 }) },
      { id: 'mb.d3', divider: true },
      { id: 'mb.settings', label: 'More Settings...', onClick: () => document.dispatchEvent(new CustomEvent('dialogs:openProjectSettings')) },
    ];
  }, [comp.id, comp.motionBlur]);

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
    { id: 'p.snap', label: 'Snap', checked: snapping, onClick: toggleSnapping },
  ], [loop, setLoop, autoKey, toggleAutoKey, snapping, toggleSnapping]);

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

      {/* Motion Blur master toggle */}
      <button
        onClick={toggleMB}
        onContextMenu={(e) => { e.preventDefault(); ctx.open(e, mbMenu); }}
        title={mbEnabled
          ? `Motion Blur ON — right-click for settings\nShutter ${comp.motionBlur?.shutterAngle ?? 180}° / ${comp.motionBlur?.samples ?? 8} samples`
          : 'Motion Blur OFF — click to enable (right-click for settings)'}
        className="flex items-center gap-1 border-0 cursor-pointer transition-all shrink-0"
        style={{
          height: 22, padding: '0 8px',
          borderRadius: 'var(--radius-sm)',
          background: mbEnabled ? 'var(--color-accent-muted)' : 'transparent',
          color: mbEnabled ? 'var(--color-accent)' : 'var(--color-text-disabled)',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
        }}
      >
        <Zap size={11} strokeWidth={2} fill={mbEnabled ? 'currentColor' : 'none'} />
        <span>MB</span>
      </button>

      <div className="flex-1" />

      {/* Right group: frame inputs + preview/cache */}
      <LiveFrameInput currentFrame={currentFrame} onChange={seekTo} totalFrames={totalFrames} />
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

      <RamPreviewButton compId={comp.id} />

      <Sep />

      {/* Graph Editor toggle */}
      <GraphEditorToggle />

      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}
    </div>
  );
};

const GraphEditorToggle: React.FC = () => {
  const showGraph = useUIStore((s) => s.showGraphEditor);
  const toggleGraph = useUIStore((s) => s.toggleGraphEditor);
  return (
    <button
      onClick={toggleGraph}
      title={showGraph ? 'Hide Graph Editor' : 'Show Graph Editor'}
      className="flex items-center gap-1.5 border-0 bg-transparent cursor-pointer transition-colors shrink-0"
      style={{
        height: 26, padding: '0 10px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--font-size-sm)',
        color: showGraph ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        background: showGraph ? 'var(--color-accent-muted)' : 'transparent',
      }}
      onMouseEnter={(e)=>{ if(!showGraph){ (e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'; (e.currentTarget as HTMLElement).style.color='var(--color-text-primary)'; } }}
      onMouseLeave={(e)=>{ if(!showGraph){ (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='var(--color-text-secondary)'; } }}
    >
      <LineChart size={13} strokeWidth={1.75} />
      <span>Graph</span>
    </button>
  );
};

