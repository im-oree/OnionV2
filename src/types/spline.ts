export interface SplinePoint {
  x: number;
  y: number;
  /** Bezier in-handle relative to point */
  inHandle: { x: number; y: number };
  /** Bezier out-handle relative to point */
  outHandle: { x: number; y: number };
  /** Corner = no smooth handles */
  corner: boolean;
}

export interface SplineData {
  points: SplinePoint[];
  closed: boolean;
  /** Stroke color */
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  /** Fill — only meaningful when closed */
  fillColor: string;
  fillOpacity: number;
  /** Trim path: 0–1 start and end for draw-on animation */
  trimStart: number;
  trimEnd: number;
}

export function defaultSplinePoint(x: number, y: number): SplinePoint {
  return {
    x, y,
    inHandle: { x: -30, y: 0 },
    outHandle: { x: 30, y: 0 },
    corner: false,
  };
}

export function defaultSplineData(): SplineData {
  return {
    points: [],
    closed: false,
    strokeColor: '#ffffff',
    strokeWidth: 3,
    strokeOpacity: 100,
    fillColor: '#ffffff',
    fillOpacity: 0,
    trimStart: 0,
    trimEnd: 1,
  };
}