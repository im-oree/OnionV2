import { create } from 'zustand';
import { PANEL_TYPES, WORKSPACES } from '../config/constants';

/** Panel type for header switcher */
export type PanelType = typeof PANEL_TYPES[keyof typeof PANEL_TYPES];
export type WorkspaceType = typeof WORKSPACES[keyof typeof WORKSPACES];

/** Layout node types for PanelManager (kept for future dynamic splitting) */
export interface PanelLayout { id:string; type:PanelType; label:string }
export type SplitDirection = 'horizontal'|'vertical';
export type PanelNode =
  | { type:'leaf'; id:string; panel:PanelLayout }
  | { type:'split'; id:string; direction:SplitDirection; children:[PanelNode,PanelNode]; sizes:number[] };

export interface UIState {
  /** CSS Grid layout state */
  rightPanelWidth: number;
  timelineHeight: number;
  windowSize: { width: number; height: number };
  activeWorkspace: string;
  panelVisibility: Record<string, boolean>;

  /** Layout tree for PanelManager (kept for future dynamic splitting) */
  layoutTree: PanelNode;

  // Actions
  setRightPanelWidth: (w: number) => void;
  setTimelineHeight: (h: number) => void;
  setWindowSize: (s: { width: number; height: number }) => void;
  setActiveWorkspace: (w: string) => void;
  togglePanelVisibility: (id: string) => void;
  setLayoutTree: (tree: PanelNode) => void;
  /** Request the current renderer to redraw one frame (used during animation playback) */
  requestRendererRender: () => void;
}

// Global render callback — set by useRenderer when a Renderer instance is created
let _requestRender: (() => void) | null = null;
/** Register a function to request a render frame (called by useRenderer) */
export function setRequestRender(fn: () => void): void {
  _requestRender = fn;
}

export function triggerRequestRender(): void {
  _requestRender?.();
}

function createDefaultLayoutTree(): PanelNode {
  return {
    type:'split', id:'root', direction:'horizontal', sizes:[1,320],
    children:[
      { type:'split', id:'center-area', direction:'vertical', sizes:[1,150],
        children:[
          { type:'leaf', id:'viewport', panel:{id:'viewport', type:PANEL_TYPES.VIEWPORT, label:'Viewport'} },
          { type:'leaf', id:'timeline', panel:{id:'timeline', type:PANEL_TYPES.TIMELINE, label:'Timeline'} },
        ]},
      { type:'split', id:'right-area', direction:'vertical', sizes:[0.4,0.6],
        children:[
          { type:'leaf', id:'outliner', panel:{id:'outliner', type:PANEL_TYPES.OUTLINER, label:'Outliner'} },
          { type:'leaf', id:'properties', panel:{id:'properties', type:PANEL_TYPES.PROPERTIES, label:'Properties'} },
        ]},
    ],
  };
}

export const useUIStore = create<UIState>((set) => ({
  // Layout state
  rightPanelWidth: 320,
  timelineHeight: 200,
  windowSize: { width: window.innerWidth, height: window.innerHeight },
  activeWorkspace: 'layout',
  panelVisibility: {},
  layoutTree: createDefaultLayoutTree(),

  // Layout actions
  setRightPanelWidth: (w) => set({ rightPanelWidth: w }),
  setTimelineHeight: (h) => set({ timelineHeight: h }),
  setWindowSize: (s) => set({ windowSize: s }),
  setActiveWorkspace: (w) => set({ activeWorkspace: w }),
  togglePanelVisibility: (id) =>
    set((s) => ({ panelVisibility: { ...s.panelVisibility, [id]: !s.panelVisibility[id] } })),
  setLayoutTree: (tree) => set({ layoutTree: tree }),
  requestRendererRender: () => triggerRequestRender(),
}));
