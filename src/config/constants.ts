export const APP = { NAME:'OnionV2', VERSION:'0.1.0', BUILD:'Phase 11' } as const;

export const COMPOSITION = {
  DEFAULT_WIDTH:1920, DEFAULT_HEIGHT:1080, MIN_SIZE:64, MAX_SIZE:8192,
  DEFAULT_FPS:30, DEFAULT_DURATION:10, PIXEL_ASPECT:1,

} as const;

export const TIME_DISPLAY = { FRAMES:'frames', SECONDS:'seconds', SMPTE:'smpte' } as const;
export const FRAME_RATES = [23.976,24,25,29.97,30,50,59.94,60] as const;

export const LAYER_TYPES = {
  SOLID:'solid', SHAPE:'shape', TEXT:'text',
  IMAGE:'image', VIDEO:'video', NULL:'null', ADJUSTMENT:'adjustment',
  CAMERA:'camera', LIGHT:'light',
} as const;

export const TOOLS = {
  SELECT:'select', MOVE:'move', HAND:'hand', ZOOM:'zoom',
  ROTATE:'rotate', SCALE:'scale',
  SHAPE_RECT:'shapeRect', SHAPE_ELLIPSE:'shapeEllipse', SHAPE_POLYGON:'shapePolygon',
  SHAPE:'shape',
  PEN:'pen', TEXT:'text', NULL:'null', GRADIENT:'gradient', PICK_WHIP:'pickWhip',
  ORBIT:'orbit', TRACKXY:'trackXY', DOLLY:'dolly',
  MASK:'mask',              // ← ADD THIS
  PERSPECTIVE:'perspective', // ← ADD THIS
} as const;

export const RENDERER_MODE = { DRAFT:'draft', PREVIEW:'preview', FULL:'full' } as const;
export type RendererMode = typeof RENDERER_MODE[keyof typeof RENDERER_MODE];

export const VIEW_MODE = {
  ACTIVE_CAMERA:'activeCamera', FRONT:'front', BACK:'back',
  TOP:'top', BOTTOM:'bottom', LEFT:'left', RIGHT:'right',
  CUSTOM:'custom',
} as const;

export const CAMERA_PRESETS: Record<string, { focalLength: number; label: string }> = {
  '28mm': { focalLength: 28, label: '28mm Wide' },
  '35mm': { focalLength: 35, label: '35mm' },
  '50mm': { focalLength: 50, label: '50mm Standard' },
  '80mm': { focalLength: 80, label: '80mm Portrait' },
  '135mm': { focalLength: 135, label: '135mm Tele' },
} as const;

export const PANEL_TYPES = {
  VIEWPORT:'viewport', OUTLINER:'outliner', PROPERTIES:'properties',
  TIMELINE:'timeline', GRAPH_EDITOR:'graphEditor', FILE_BROWSER:'fileBrowser',
  NODE_EDITOR:'nodeEditor', TEXT_EDITOR:'textEditor', CONSOLE:'console',
  CAMERA:'camera',
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