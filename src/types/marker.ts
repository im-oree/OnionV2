/** Composition markers — like AE's timeline markers for labeling key frames/comments on the timeline */

export interface CompositionMarker {
  id: string;
  /** Time in seconds */
  time: number;
  /** Frame number (cached for rendering) */
  frame: number;
  /** User-visible label */
  label: string;
  /** Display color */
  color: string;
  /** Duration in seconds (0 = single-frame marker) */
  duration: number;
}

export const MARKER_COLORS = [
  '#e8b84b', // gold
  '#e04040', // red
  '#40b0e0', // blue
  '#40e040', // green
  '#e08040', // orange
  '#c040e0', // purple
  '#40e0c0', // teal
  '#e0e040', // yellow
] as const;

export function defaultMarker(time: number, frame: number): CompositionMarker {
  return {
    id: `marker_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    time,
    frame,
    label: '',
    color: MARKER_COLORS[0],
    duration: 0,
  };
}
