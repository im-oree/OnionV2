import React from 'react';
import { AnimationClock } from '../../../animation/AnimationClock';
import type { Composition } from '../../../types/composition';

interface Props {
  comp: Composition;
  totalFrames: number;
  currentFrame: number;
}

/**
 * Global animation clock instance.
 * Playback wiring is owned by <PlaybackController /> at the app root
 * (see src/ui/PlaybackController.tsx), NOT by this component.
 * This ensures playback keeps working even when the Timeline panel
 * is unmounted (e.g., when the Graph Editor tab is active).
 */
export const animationClock = new AnimationClock();

/**
 * PlaybackControls — deprecated wiring component.
 * Kept as a no-op wrapper so <TimelinePanel /> can still import it
 * without changes. All playback event handling now lives in
 * <PlaybackController />.
 */
export const PlaybackControls: React.FC<Props> = () => {
  return null;
};