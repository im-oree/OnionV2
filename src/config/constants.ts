export const APP = { NAME:'OnionV2', VERSION:'0.1.0', BUILD:'Phase 1' } as const;

export const COMPOSITION = {
  DEFAULT_WIDTH:1920, DEFAULT_HEIGHT:1080, MIN_SIZE:64, MAX_SIZE:8192,
  DEFAULT_FPS:30, DEFAULT_DURATION:10, PIXEL_ASPECT:1,
} as const;

export const TIME_DISPLAY = { FRAMES:'frames', SECONDS:'seconds', SMPTE:'smpte' } as const;
export const FRAME_RATES = [23.976,24,25,29.97,30,50,59.94,60] as const;

export const LAYER_TYPES = {
  SOLID:'solid', SHAPE:'shape', TEXT:'text',
  IMAGE:'image', VIDEO:'video', NULL:'null', ADJUSTMENT:'adjustment',
} as const;

export const TOOLS = {
  SELECT:'select', MOVE:'move', HAND:'hand', ZOOM:'zoom',
  ROTATE:'rotate', SCALE:'scale',
  SHAPE_RECT:'shapeRect', SHAPE_ELLIPSE:'shapeEllipse', SHAPE_POLYGON:'shapePolygon',
  PEN:'pen', TEXT:'text', NULL:'null', GRADIENT:'gradient',
} as const;

export const PANEL_TYPES = {
  VIEWPORT:'viewport', OUTLINER:'outliner', PROPERTIES:'properties',
  TIMELINE:'timeline', GRAPH_EDITOR:'graphEditor', FILE_BROWSER:'fileBrowser',
  NODE_EDITOR:'nodeEditor', TEXT_EDITOR:'textEditor', CONSOLE:'console',
} as const;

export const WORKSPACES = {
  LAYOUT:'layout', ANIMATION:'animation', COMPOSITING:'compositing',
  EDITING:'editing', MOTION_GRAPHICS:'motionGraphics',
} as const;

export const PERFORMANCE = {
  TARGET_FPS:30, ADAPTIVE_RESOLUTION_ON:true, RAM_PREVIEW_ON:true,
  MAX_LAYERS_1080P:15, MAX_LAYERS_720P:30, FRAME_BUDGET_MS:33,
} as const;

export const MODIFIERS = { CTRL:'ctrl', SHIFT:'shift', ALT:'alt', META:'meta' } as const;
