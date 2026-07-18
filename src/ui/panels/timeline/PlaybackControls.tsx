import React, { useCallback } from 'react';
import { Icon } from '../../common/Icon';
import { Button } from '../../common/Button';
import { useTimelineStore } from '../../../state/timelineStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { AnimationClock } from '../../../animation/AnimationClock';
import { formatTime } from '../../../utils/time';
import type { Composition } from '../../../types/composition';

interface PlaybackControlsProps {
  comp: Composition;
  totalFrames: number;
  currentFrame: number;
}

/** Global clock singleton for playback */
export const animationClock = new AnimationClock();

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({ comp, totalFrames, currentFrame }) => {
  const ps = useTimelineStore((s) => s.playbackState);
  const setPlaybackState = useTimelineStore((s) => s.setPlaybackState);
  const zoom = useTimelineStore((s) => s.zoom);
  const loop = useTimelineStore((s) => s.loop);
  const setLoop = useTimelineStore((s) => s.setLoop);
  const timeDisplay = useTimelineStore((s) => s.timeDisplay);
  const zoomIn = useTimelineStore((s) => s.zoomIn);
  const zoomOut = useTimelineStore((s) => s.zoomOut);

  // Wire clock to store + PropertyBinder playback loop
  React.useEffect(() => {
    animationClock.setFps(comp.fps);
    animationClock.setTotalFrames(totalFrames);
    animationClock.setLoopMode(loop ? 'loop' : 'none');

    const cleanupFns: Array<() => void> = [];

    // PropertyBinder + renderer integration — evaluate animation and trigger render
    import('../../../animation/PropertyBinder').then(({ PropertyBinder }) => {
      import('../../../state/keyframeStore').then(({ useKeyframeStore }) => {
        import('../../../state/uiStore').then(({ useUIStore }) => {
          const binder = new PropertyBinder(useKeyframeStore.getState().engine);

          const onFrame2 = (ev: { frame: number }) => {
            binder.evaluateFrame(comp.id, ev.frame);
            // Trigger renderer to redraw after animation evaluation
            const uiState = useUIStore.getState();
            if (uiState.requestRendererRender) {
              uiState.requestRendererRender();
            }
          };

          animationClock.on('frame-changed', onFrame2);
          cleanupFns.push(() => animationClock.off('frame-changed', onFrame2));
        });
      });
    });

    const onFrame = (ev: { frame: number }) => {
      useCompositionStore.getState().setCurrentTime(comp.id, ev.frame / comp.fps);
    };
    const onPlay = () => setPlaybackState('playing');
    const onPause = () => setPlaybackState('paused');
    const onStop = () => setPlaybackState('stopped');

    animationClock.on('frame-changed', onFrame);
    animationClock.on('play', onPlay);
    animationClock.on('pause', onPause);
    animationClock.on('stop', onStop);

    return () => {
      animationClock.off('frame-changed', onFrame);
      animationClock.off('play', onPlay);
      animationClock.off('pause', onPause);
      animationClock.off('stop', onStop);
      cleanupFns.forEach((fn) => fn());
    };
  }, [comp.id, comp.fps, totalFrames, loop, setPlaybackState]);

  const toggle = useCallback(() => {
    animationClock.togglePlay();
  }, []);

  const goToStart = useCallback(() => animationClock.goToStart(), []);
  const goToEnd = useCallback(() => animationClock.goToEnd(), []);
  const prevFrame = useCallback(() => animationClock.stepBackward(), []);
  const nextFrame = useCallback(() => animationClock.stepForward(), []);
  const prevKF = useCallback(() => {
    const kfs = useKeyframeStore.getState().engine.getAllKeyframesForLayer(comp.layers[0]?.id ?? '');
    const prev = [...kfs].reverse().find((k) => k.time < currentFrame);
    if (prev) animationClock.seekToFrame(prev.time);
  }, [comp.layers, currentFrame]);
  const nextKF = useCallback(() => {
    const kfs = useKeyframeStore.getState().engine.getAllKeyframesForLayer(comp.layers[0]?.id ?? '');
    const next = kfs.find((k) => k.time > currentFrame);
    if (next) animationClock.seekToFrame(next.time);
  }, [comp.layers, currentFrame]);
  const toggleLoop = useCallback(() => setLoop(!loop), [loop, setLoop]);

  return (
    <div className="flex items-center gap-1 px-2 flex-shrink-0 h-tl-header bg-panel-header border-b border-border">
      <Button variant="icon" size="sm" icon={<Icon name="goToStart" size={14} />} title="Go to start (Home)" onClick={goToStart} />
      <Button variant="icon" size="sm" icon={<Icon name="frameBack" size={14} />} title="Previous frame (Left)" onClick={prevFrame} />
      <Button variant="icon" size="sm" icon={<Icon name="goToStart" size={14} />} title="Prev keyframe (J)" onClick={prevKF} />
      <Button variant="icon" size="sm" icon={<Icon name={ps === 'playing' ? 'pause' : 'play'} size={14} />}
        title="Play / Pause (Space)" onClick={toggle} />
      <Button variant="icon" size="sm" icon={<Icon name="goToEnd" size={14} />} title="Next keyframe (K)" onClick={nextKF} />
      <Button variant="icon" size="sm" icon={<Icon name="frameForward" size={14} />} title="Next frame (Right)" onClick={nextFrame} />
      <Button variant="icon" size="sm" icon={<Icon name="goToEnd" size={14} />} title="Go to end (End)" onClick={goToEnd} />

      {/* Time display */}
      <div className="flex items-center px-2 ml-2 font-mono text-ui-xs h-5 bg-panel-input rounded-sm border border-border text-text-primary min-w-[64px] justify-center cursor-pointer select-none"
        onClick={() => {
          const modes = ['frames', 'seconds', 'smpte'] as const;
          const idx = modes.indexOf(timeDisplay as any);
          useTimelineStore.getState().setTimeDisplay(modes[(idx + 1) % modes.length]);
        }}
        title="Click to toggle time display"
      >
        {formatTime(comp.currentTime, comp.fps)}
      </div>

      {/* Loop toggle */}
      <Button variant="icon" size="sm" icon={<Icon name="grid" size={14} />} title="Loop playback"
        className={loop ? 'text-accent' : ''} onClick={toggleLoop} />

      <div className="flex-1" />

      {/* Zoom controls */}
      <Button variant="icon" size="sm" icon={<Icon name="minus" size={12} />} title="Zoom out" onClick={zoomOut} />
      <span className="text-ui-xs text-text-disabled w-8 text-center">{zoom}</span>
      <Button variant="icon" size="sm" icon={<Icon name="plus" size={12} />} title="Zoom in" onClick={zoomIn} />

      {/* Current frame display */}
      <div className="text-ui-xs text-text-disabled ml-2 font-mono min-w-[32px] text-right">
        {currentFrame}
      </div>
    </div>
  );
};

// Need to import useKeyframeStore for the keyframe nav buttons
import { useKeyframeStore } from '../../../state/keyframeStore';
