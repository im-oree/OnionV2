/**
 * Expression Snippet Library — data-driven categorized snippets
 * that users can insert directly into the expression editor.
 */
import type { SnippetCategory, SnippetEntry } from './types';

const motionSnippets: SnippetEntry[] = [
  {
    id: 'wiggle-default', name: 'Wiggle', category: 'motion',
    description: 'Random wiggling motion around current value',
    code: 'wiggle(2, 30)',
  },
  {
    id: 'wiggle-strong', name: 'Strong Wiggle', category: 'motion',
    description: 'Fast, high-amplitude wiggle for shake effects',
    code: 'wiggle(10, 100)',
  },
  {
    id: 'wiggle-octaves', name: 'Wiggle with Octaves', category: 'motion',
    description: 'Multi-layered wiggle for organic motion',
    code: 'wiggle(3, 50, 3, 0.5)',
  },
  {
    id: 'bounce', name: 'Bounce', category: 'motion',
    description: 'Overshoot and settle at target (elastic bounce)',
    code: 'linear(time, 0, 1, value, value * 1.2) - linear(time, 1, 1.5, 0, value * 0.2)',
  },
  {
    id: 'inertia', name: 'Inertia / Lag', category: 'motion',
    description: 'Position follows layer with delay (place near a pick-whipped reference)',
    code: 'linear(time, 0, 0.2, value, thisComp.layer(index > 1 ? index - 1 : 1).transform.position)',
  },
  {
    id: 'constant-rotation', name: 'Constant Rotation', category: 'motion',
    description: 'Continuous rotation at specified degrees per second',
    code: 'time * 45',
  },
  {
    id: 'orbit', name: 'Orbit Around Point', category: 'motion',
    description: 'Orbit around a center point with radius and speed',
    code: 'const cx = 960, cy = 540, r = 300, speed = 1.5; [cx + cos(time * speed) * r, cy + sin(time * speed) * r]',
  },
  {
    id: 'follow-delay', name: 'Follow with Delay', category: 'motion',
    description: 'Layer follows another with damping (drag to set target)',
    code: 'thisComp.layer("Target").transform.position',
  },
];

const valueSnippets: SnippetEntry[] = [
  {
    id: 'snap-increment', name: 'Snap to Increment', category: 'values',
    description: 'Snap value to nearest N increment',
    code: 'round(value / 10) * 10',
  },
  {
    id: 'clamp-range', name: 'Clamp to Range', category: 'values',
    description: 'Clamp value between 0 and 100',
    code: 'clamp(value, 0, 100)',
  },
  {
    id: 'remap-linear', name: 'Remap Value', category: 'values',
    description: 'Remap from one range to another',
    code: 'linear(value, 0, 100, 200, 400)',
  },
  {
    id: 'round-nearest', name: 'Round to Nearest', category: 'values',
    description: 'Round to nearest 5',
    code: 'round(value / 5) * 5',
  },
  {
    id: 'delay-property', name: 'Property with Offset', category: 'values',
    description: 'Same value as current but offset by 0.5 seconds (place on a layer with keyframes)',
    code: 'linear(time - 0.5, 0, 1, 0, 100)',
  },
];

const randomSnippets: SnippetEntry[] = [
  {
    id: 'random-position', name: 'Random Position', category: 'random',
    description: 'Random position within a range',
    code: '[random(-200, 200), random(-200, 200)]',
  },
  {
    id: 'wiggle-rotation', name: 'Wiggle Rotation', category: 'random',
    description: 'Random rotation shake',
    code: 'wiggle(3, 30)',
  },
  {
    id: 'random-color', name: 'Random Color', category: 'random',
    description: 'Random color from a palette',
    code: 'random(["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"])',
  },
  {
    id: 'shake-camera', name: 'Camera Shake', category: 'random',
    description: 'Camera-like shake for position',
    code: 'wiggle(15, 50)',
  },
  {
    id: 'gauss-jitter', name: 'Gaussian Jitter', category: 'random',
    description: 'Organic jitter using gaussian distribution',
    code: 'value + gaussRandom(-10, 10)',
  },
];

const linkingSnippets: SnippetEntry[] = [
  {
    id: 'copy-from-layer', name: 'Copy from Layer', category: 'linking',
    description: 'Copy position from another layer',
    code: 'thisComp.layer("Source").transform.position',
  },
  {
    id: 'copy-scale', name: 'Copy Scale from Layer', category: 'linking',
    description: 'Copy scale from another layer',
    code: 'thisComp.layer("Source").transform.scale',
  },
  {
    id: 'mirror-x', name: 'Mirror X', category: 'linking',
    description: 'Mirror another layer across X axis',
    code: 'const p = thisComp.layer("Source").transform.position; [1920 - p[0], p[1]]',
  },
  {
    id: 'distance-between', name: 'Distance Between', category: 'linking',
    description: 'Outputs distance between this layer and another',
    code: 'const a = transform.position; const b = thisComp.layer("Target").transform.position; length(sub(a, b))',
  },
  {
    id: 'angle-between', name: 'Angle Between', category: 'linking',
    description: 'Angle pointing from this layer to another',
    code: 'lookAt(transform.position, thisComp.layer("Target").transform.position)',
  },
  {
    id: 'percent-of', name: 'Percentage of Another', category: 'linking',
    description: '50% of another layer\'s value',
    code: 'thisComp.layer("Source").transform.position * 0.5',
  },
  {
    id: 'slider-link', name: 'Read From Slider Control', category: 'linking',
    description: 'Read value from a Slider Control effect on a controller layer',
    code: 'thisComp.layer("Controller").effect("Slider Control")("Slider")',
  },
];

const timeSnippets: SnippetEntry[] = [
  {
    id: 'reverse-play', name: 'Play in Reverse', category: 'time',
    description: 'Play animation backwards',
    code: '(compDuration - time) * 30',
  },
  {
    id: 'speed-2x', name: 'Speed Up 2x', category: 'time',
    description: 'Play animation at 2x speed',
    code: 'linear(time * 2, 0, 1, 0, 100)',
  },
  {
    id: 'time-offset', name: 'Time Offset +1s', category: 'time',
    description: 'Offset animation by 1 second',
    code: 'linear(time + 1, 0, 2, 0, 100)',
  },
  {
    id: 'stutter', name: 'Stutter / Step', category: 'time',
    description: 'Stutter effect (posterize + jitter)',
    code: 'posterizeTime(6); wiggle(6, 10)',
  },
  {
    id: 'posterize-default', name: 'Posterize Time', category: 'time',
    description: 'Snap animation to 12fps',
    code: 'posterizeTime(12); value',
  },
];

const textSnippets: SnippetEntry[] = [
  {
    id: 'countdown', name: 'Countdown Timer', category: 'text',
    description: 'Countdown from a number',
    code: 'floor(time * 30)',
  },
  {
    id: 'time-mmss', name: 'Time MM:SS', category: 'text',
    description: 'Current time as minutes:seconds',
    code: 'String(Math.floor(time / 60)).padStart(2, \'0\') + \':\' + String(Math.floor(time % 60)).padStart(2, \'0\')',
  },
  {
    id: 'oscillate-opacity', name: 'Pulse Opacity', category: 'text',
    description: 'Pulsing opacity (good for attention)',
    code: '(Math.sin(time * 2) + 1) * 50',
  },
  {
    id: 'loop-colors', name: 'Loop Colors', category: 'text',
    description: 'Cycle through colors over time',
    code: 'const colors = [\'#ff0000\', \'#00ff00\', \'#0000ff\']; colors[Math.floor(time * 2) % colors.length]',
  },
];

export const ALL_SNIPPETS: SnippetEntry[] = [
  ...motionSnippets,
  ...valueSnippets,
  ...randomSnippets,
  ...linkingSnippets,
  ...timeSnippets,
  ...textSnippets,
];

export const SNIPPETS_BY_CATEGORY: Record<SnippetCategory, SnippetEntry[]> = {
  motion: motionSnippets,
  values: valueSnippets,
  random: randomSnippets,
  linking: linkingSnippets,
  time: timeSnippets,
  text: textSnippets,
};

export const CATEGORY_LABELS: Record<SnippetCategory, string> = {
  motion: 'Motion',
  values: 'Values',
  random: 'Random',
  linking: 'Linking',
  time: 'Time',
  text: 'Text',
};
