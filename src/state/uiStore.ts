import { create } from 'zustand';
import { WORKSPACES } from '../config/constants';

export type WorkspaceType = typeof WORKSPACES[keyof typeof WORKSPACES];

export interface UIState {
  windowSize: { width: number; height: number };
  activeWorkspace: string;
  setWindowSize: (s: { width: number; height: number }) => void;
  setActiveWorkspace: (w: string) => void;
  requestRendererRender: () => void;
}

let _requestRender: (() => void) | null = null;
export function setRequestRender(fn: () => void): void { _requestRender = fn; }
export function triggerRequestRender(): void { _requestRender?.(); }

export const useUIStore = create<UIState>((set) => ({
  windowSize: { width: window.innerWidth, height: window.innerHeight },
  activeWorkspace: 'layout',
  setWindowSize: (s) => set({ windowSize: s }),
  setActiveWorkspace: (w) => set({ activeWorkspace: w }),
  requestRendererRender: () => triggerRequestRender(),
}));