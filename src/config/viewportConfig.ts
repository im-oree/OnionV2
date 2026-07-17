/**
 * Viewport configuration — all visual viewport settings.
 * Colors reference theme.css CSS variable names for runtime retrieval via getComputedStyle.
 * Phase 2: Grid, rulers, guides, safe zones, snapping settings.
 */

export const VIEWPORT_CONFIG = {
  /** Minimum zoom percentage */
  MIN_ZOOM: 0.01,
  /** Maximum zoom percentage */
  MAX_ZOOM: 32,
  /** Default zoom (fit to viewport) */
  DEFAULT_ZOOM: 1,
  /** Zoom step factor per scroll notch */
  ZOOM_FACTOR: 1.1,
  /** Snap threshold in screen pixels */
  SNAP_THRESHOLD_PX: 8,
  /** Idle render loop pause timeout in ms */
  IDLE_PAUSE_MS: 500,
  /** Max device pixel ratio for performance */
  MAX_DPR: 2,
  /** Ruler thickness in CSS pixels */
  RULER_SIZE: 20,
  /** Guide line color CSS variable name */
  GUIDE_COLOR_VAR: '--color-accent',
  /** Snap line color CSS variable name */
  SNAP_LINE_COLOR: '#ff69b4', // Blender-style pink
  /** Safe zone percentages */
  SAFE_ZONES: {
    ACTION_SAFE: 0.9,
    TITLE_SAFE: 0.8,
  },
  /** Grid levels (world pixels between lines) */
  GRID: {
    MINOR_STEP: 10,
    MAJOR_STEP_MULTIPLIER: 10,
    AXIS_COLOR_X: '#ff4444',
    AXIS_COLOR_Y: '#44ff44',
  },
} as const;
