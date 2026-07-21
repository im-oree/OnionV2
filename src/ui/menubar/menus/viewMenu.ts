/**
 * View menu definitions — viewport visual toggles and framing actions.
 * Each item calls the corresponding viewportStore action or renderer method.
 */
import type { MenuItemDefinition } from '../MenuDropdown';
import { useViewportStore } from '../../../state/viewportStore';

export const viewMenu: MenuItemDefinition[] = [
  {
    id: 'view.timeDisplay',
    label: 'Time Display',
    children: [
      { id: 'view.timeFrames', label: 'Frames', onClick: () => import('../../../state/timelineStore').then(m => m.useTimelineStore.getState().setTimeDisplay('frames')) },
      { id: 'view.timeSeconds', label: 'Seconds', onClick: () => import('../../../state/timelineStore').then(m => m.useTimelineStore.getState().setTimeDisplay('seconds')) },
      { id: 'view.timeSMPTE', label: 'SMPTE Timecode', onClick: () => import('../../../state/timelineStore').then(m => m.useTimelineStore.getState().setTimeDisplay('smpte')) },
    ],
  },
  {
    id: 'view.toggleLoopPlayback',
    label: 'Loop Playback',
    onClick: () => {
      import('../../../state/timelineStore').then(m => {
        const s = m.useTimelineStore.getState();
        s.setLoop(!s.loop);
      });
    },
  },
  {
    id: 'view.sep0',
    label: '',
    divider: true,
    onClick: () => {},
  },
  {
    id: 'view.toggleGrid',
    label: 'Show Grid',
    shortcut: 'Ctrl+G',
    checked: true,
    onClick: () => {
      useViewportStore.getState().toggleGrid();
    },
  },
  {
    id: 'view.toggleRulers',
    label: 'Show Rulers',
    shortcut: 'Ctrl+R',
    checked: true,
    onClick: () => {
      useViewportStore.getState().toggleRulers();
    },
  },
  {
    id: 'view.toggleGuides',
    label: 'Show Guides',
    checked: true,
    onClick: () => {
      useViewportStore.getState().toggleGuides();
    },
  },
  {
    id: 'view.lockGuides',
    label: 'Lock Guides',
    checked: false,
    onClick: () => {
      const s = useViewportStore.getState();
      s.setGuidesLocked(!s.settings.guidesLocked);
    },
  },
  {
    id: 'view.clearGuides',
    label: 'Clear All Guides',
    onClick: () => {
      useViewportStore.getState().clearGuides();
    },
  },
  {
    id: 'view.sep1',
    label: '',
    divider: true,
    onClick: () => {},
  },
  {
    id: 'view.toggleSafeZones',
    label: 'Show Safe Zones',
    shortcut: 'Ctrl+Shift+S',
    checked: false,
    onClick: () => {
      useViewportStore.getState().toggleSafeZones();
    },
  },
  {
    id: 'view.toggleSnapping',
    label: 'Enable Snapping',
    shortcut: 'Shift+Tab',
    checked: true,
    onClick: () => {
      useViewportStore.getState().toggleSnapping();
    },
  },
  {
    id: 'view.toggleClipToComp',
    label: 'Clip Layer Contents to Composition',
    shortcut: 'Alt+/',
    checked: true,
    onClick: () => {
      const r = (window as any).__renderer;
      if (r) {
        const next = !r.clipToCompositionBounds;
        r.setClipToCompositionBounds(next);
        try {
          const { useNotificationStore } = require('../../../state/notificationStore');
          useNotificationStore.getState().addNotification({
            type: 'info',
            message: `Composition clipping ${next ? 'ON' : 'OFF'}`,
            autoDismiss: 1500,
          });
        } catch { /* ignore */ }
      }
    },
  },
  {
    id: 'view.sep2',
    label: '',
    divider: true,
    onClick: () => {},
  },
  {
    id: 'view.frameAll',
    label: 'Frame All',
    shortcut: 'Home',
    onClick: () => {
      const r = (window as any).__renderer;
      if (r) r.cameraManager.fitToComposition();
    },
  },
  {
    id: 'view.frameSelected',
    label: 'Frame Selected',
    shortcut: 'Numpad .',
    onClick: () => {
      const r = (window as any).__renderer;
      if (r) r.cameraManager.fitToComposition();
    },
  },
  {
    id: 'view.zoom100',
    label: 'Zoom 100%',
    shortcut: 'Numpad 1',
    onClick: () => {
      const r = (window as any).__renderer;
      if (r) r.cameraManager.setZoom(1);
    },
  },
  {
    id: 'view.sep3',
    label: '',
    divider: true,
    onClick: () => {},
  },
  {
    id: 'view.toggleStats',
    label: 'Show Stats',
    checked: false,
    onClick: () => {
      useViewportStore.getState().toggleStats();
    },
  },
];
