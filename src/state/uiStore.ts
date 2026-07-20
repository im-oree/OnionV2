import { create } from 'zustand';
import { PANEL_TYPES, WORKSPACES } from '../config/constants';

export type PanelType = typeof PANEL_TYPES[keyof typeof PANEL_TYPES];
export type WorkspaceType = typeof WORKSPACES[keyof typeof WORKSPACES];
export type RightSidebarTab = 'properties' | 'effects' | 'effectLibrary' | 'align' | 'info' | 'render' | 'character' | 'performance' | 'graph';

export interface PanelLayout { id: string; type: PanelType; label: string }
export type SplitDirection = 'horizontal' | 'vertical';
export type PanelNode =
  | { type: 'leaf'; id: string; panel: PanelLayout }
  | { type: 'split'; id: string; direction: SplitDirection; children: [PanelNode, PanelNode]; sizes: number[] };

export interface UIState {
  leftPanelWidth: number;
  rightPanelWidth: number;
  timelineHeight: number;
  graphEditorWidth: number;
  windowSize: { width: number; height: number };
  activeWorkspace: string;
  activeRightTab: RightSidebarTab;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  showTimeline: boolean;
  showGraphEditor: boolean;
  panelVisibility: Record<string, boolean>;
  layoutTree: PanelNode;

  setLeftPanelWidth: (w: number) => void;
  setRightPanelWidth: (w: number) => void;
  setTimelineHeight: (h: number) => void;
  setGraphEditorWidth: (w: number) => void;
  setWindowSize: (s: { width: number; height: number }) => void;
  setActiveWorkspace: (w: string) => void;
  setActiveRightTab: (t: RightSidebarTab) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleTimeline: () => void;
  toggleGraphEditor: () => void;
  togglePanelVisibility: (id: string) => void;
  setLayoutTree: (tree: PanelNode) => void;
  requestRendererRender: () => void;
}

let _requestRender: (() => void) | null = null;
export function setRequestRender(fn: () => void): void { _requestRender = fn; }
export function triggerRequestRender(): void { _requestRender?.(); }

function createDefaultLayoutTree(): PanelNode {
  return {
    type: 'leaf', id: 'viewport',
    panel: { id: 'viewport', type: PANEL_TYPES.VIEWPORT, label: 'Viewport' },
  };
}

export const useUIStore = create<UIState>((set) => ({
  leftPanelWidth: 260,
  rightPanelWidth: 320,
  timelineHeight: 240,
  graphEditorWidth: 560,
  windowSize: { width: window.innerWidth, height: window.innerHeight },
  activeWorkspace: 'layout',
  activeRightTab: 'properties',
  showLeftPanel: true,
  showRightPanel: true,
  showTimeline: true,
  showGraphEditor: true,
  panelVisibility: {},
  layoutTree: createDefaultLayoutTree(),

  setLeftPanelWidth: (w) => set({ leftPanelWidth: w }),
  setRightPanelWidth: (w) => set({ rightPanelWidth: w }),
  setTimelineHeight: (h) => set({ timelineHeight: h }),
  setGraphEditorWidth: (w) => set({ graphEditorWidth: w }),
  setWindowSize: (s) => set({ windowSize: s }),
  setActiveWorkspace: (w) => set({ activeWorkspace: w }),
  setActiveRightTab: (t) => set({ activeRightTab: t }),
  toggleLeftPanel: () => set((s) => ({ showLeftPanel: !s.showLeftPanel })),
  toggleRightPanel: () => set((s) => ({ showRightPanel: !s.showRightPanel })),
  toggleTimeline: () => set((s) => ({ showTimeline: !s.showTimeline })),
  toggleGraphEditor: () => set((s) => ({ showGraphEditor: !s.showGraphEditor })),
  togglePanelVisibility: (id) =>
    set((s) => ({ panelVisibility: { ...s.panelVisibility, [id]: !s.panelVisibility[id] } })),
  setLayoutTree: (tree) => set({ layoutTree: tree }),
  requestRendererRender: () => triggerRequestRender(),
}));