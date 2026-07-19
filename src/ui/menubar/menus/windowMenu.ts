import type { MenuItemDefinition } from '../MenuDropdown';
import { useUIStore } from '../../../state/uiStore';

export const windowMenu: MenuItemDefinition[] = [
  {
    id: 'window.layout', label: 'Layout Workspace',
    onClick: () => useUIStore.getState().setActiveWorkspace('layout'),
  },
  {
    id: 'window.animation', label: 'Animation Workspace',
    onClick: () => useUIStore.getState().setActiveWorkspace('animation'),
  },
  { id: 'window.sep1', label: '', divider: true, onClick: () => {} },
  {
    id: 'window.toggleLeftPanel', label: 'Toggle Project Panel', shortcut: 'N',
    onClick: () => useUIStore.getState().toggleLeftPanel(),
  },
  {
    id: 'window.toggleRightPanel', label: 'Toggle Properties Panel',
    onClick: () => useUIStore.getState().toggleRightPanel(),
  },
  {
    id: 'window.toggleTimeline', label: 'Toggle Timeline',
    onClick: () => useUIStore.getState().toggleTimeline(),
  },
  { id: 'window.sep2', label: '', divider: true, onClick: () => {} },
  {
    id: 'window.showProperties', label: 'Properties',
    onClick: () => useUIStore.getState().setActiveRightTab('properties'),
  },
  {
    id: 'window.showEffects', label: 'Effects',
    onClick: () => useUIStore.getState().setActiveRightTab('effects'),
  },
  {
    id: 'window.showGraph', label: 'Graph Editor',
    onClick: () => useUIStore.getState().setActiveRightTab('graph'),
  },
  {
    id: 'window.showAlign', label: 'Align',
    onClick: () => useUIStore.getState().setActiveRightTab('align'),
  },
  {
    id: 'window.showInfo', label: 'Info',
    onClick: () => useUIStore.getState().setActiveRightTab('info'),
  },
  {
    id: 'window.showCharacter', label: 'Character',
    onClick: () => useUIStore.getState().setActiveRightTab('character'),
  },
  {
    id: 'window.showPerformance', label: 'Performance',
    onClick: () => useUIStore.getState().setActiveRightTab('performance'),
  },
  { id: 'window.sep3', label: '', divider: true, onClick: () => {} },
  {
    id: 'window.fullScreen', label: 'Full Screen', shortcut: 'F11',
    onClick: () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    },
  },
];