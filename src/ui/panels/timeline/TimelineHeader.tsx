import React, { useCallback, useMemo } from 'react';
import { Icon } from '../../common/Icon';
import { Button } from '../../common/Button';
import { useTimelineStore } from '../../../state/timelineStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu, type ContextMenuItem } from '../../common/ContextMenu';
import { FrameInput } from './FrameInput';
import { animationClock } from './PlaybackControls';
import type { Composition } from '../../../types/composition';

interface Props { comp: Composition; currentFrame: number; totalFrames: number; }

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

  const startFrame = 0;
  const endFrame = totalFrames;
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

  const markerMenu = useMemo((): ContextMenuItem[] => [
    { id: 'm.add', label: 'Add Marker at Playhead', shortcut: 'M', disabled: true },
    { id: 'm.rem', label: 'Remove Marker', disabled: true },
    { id: 'm.d1', divider: true },
    { id: 'm.clear', label: 'Clear All Markers', disabled: true },
  ], []);

  const playbackMenu = useMemo((): ContextMenuItem[] => [
    { id: 'p.loop', label: 'Loop', checked: loop, onClick: () => setLoop(!loop) },
    { id: 'p.auto', label: 'Auto Keying', checked: autoKey, onClick: toggleAutoKey },
    { id: 'p.snap', label: 'Snap', checked: snapping, onClick: toggleSnapping },
  ], [loop, setLoop, autoKey, toggleAutoKey, snapping, toggleSnapping]);

  return (
    <div
      className="flex items-center gap-1 px-2 flex-shrink-0 bg-panel-header border-b border-border"
      style={{ height: 30 }}
    >
      {/* Editor icon + View menu */}
      <button
        className="h-[22px] px-1.5 text-ui-xs text-text-secondary hover:bg-panel-hover rounded-sm flex items-center gap-1 border-0 bg-transparent cursor-pointer"
        onClick={(e) => ctx.open(e, viewMenu)}
        title="View"
      >
        <Icon name="grid" size={12} />
        <span>View</span>
        <span className="text-[9px]">▾</span>
      </button>

      <button
        className="h-[22px] px-1.5 text-ui-xs text-text-secondary hover:bg-panel-hover rounded-sm flex items-center gap-1 border-0 bg-transparent cursor-pointer"
        onClick={(e) => ctx.open(e, markerMenu)}
        title="Marker"
      >
        <span>Marker</span>
        <span className="text-[9px]">▾</span>
      </button>

      <button
        className="h-[22px] px-1.5 text-ui-xs text-text-secondary hover:bg-panel-hover rounded-sm flex items-center gap-1 border-0 bg-transparent cursor-pointer"
        onClick={(e) => ctx.open(e, playbackMenu)}
        title="Playback"
      >
        <span>Playback</span>
        <span className="text-[9px]">▾</span>
      </button>

      <div className="flex-1" />

      {/* Auto-key toggle (red circle when ON) */}
      <button
        onClick={toggleAutoKey}
        title={autoKey ? 'Auto Keying ON' : 'Auto Keying OFF'}
        className={`w-[22px] h-[22px] flex items-center justify-center border rounded-sm bg-transparent cursor-pointer ${
          autoKey ? 'border-red-500/70 text-red-500' : 'border-border text-text-disabled hover:text-text-secondary'
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill={autoKey ? '#e04040' : 'none'} stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Transport controls */}
      <Button variant="icon" size="sm" icon={<Icon name="goToStart" size={12} />} title="Go to start" onClick={() => animationClock.goToStart()} />
      <Button variant="icon" size="sm" icon={<Icon name="frameBack" size={12} />} title="Prev keyframe" onClick={() => {
        document.dispatchEvent(new CustomEvent('playback:prevKeyframe'));
      }} />
      <Button variant="icon" size="sm" icon={<Icon name="frameBack" size={12} />} title="Prev frame" onClick={() => animationClock.stepBackward()} />
      <Button variant="icon" size="sm" icon={<Icon name={ps === 'playing' ? 'pause' : 'play'} size={13} />} title="Play/Pause" onClick={() => animationClock.togglePlay()} />
      <Button variant="icon" size="sm" icon={<Icon name="frameForward" size={12} />} title="Next frame" onClick={() => animationClock.stepForward()} />
      <Button variant="icon" size="sm" icon={<Icon name="frameForward" size={12} />} title="Next keyframe" onClick={() => {
        document.dispatchEvent(new CustomEvent('playback:nextKeyframe'));
      }} />
      <Button variant="icon" size="sm" icon={<Icon name="goToEnd" size={12} />} title="Go to end" onClick={() => animationClock.goToEnd()} />

      <div className="w-px h-4 bg-border mx-1" />

      {/* Snap toggle */}
      <button
        onClick={toggleSnapping}
        title={snapping ? 'Snap ON (Ctrl to override)' : 'Snap OFF'}
        className={`w-[22px] h-[22px] flex items-center justify-center border rounded-sm bg-transparent cursor-pointer ${
          snapping ? 'border-accent text-accent' : 'border-border text-text-disabled hover:text-text-secondary'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M3 2 v8 M9 2 v8 M3 6 h6" />
        </svg>
      </button>

      <div className="flex-1" />

      {/* Current frame */}
      <FrameInput value={currentFrame} onChange={seekTo} min={0} max={totalFrames} width={52} />

      <div className="w-1" />

      {/* Start / End frame */}
      <FrameInput value={startFrame} onChange={() => {}} label="Start" width={70} />
      <FrameInput value={endFrame} onChange={setDuration} min={1} label="End" width={72} />

      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}
    </div>
  );
};