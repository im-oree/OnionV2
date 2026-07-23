import type { MenuItemDefinition } from '../MenuDropdown';

export const renderMenu: MenuItemDefinition[] = [
  {
    id: 'render.export',
    label: 'Export...',
    shortcut: 'Ctrl+M',
    onClick: () => import('../../../state/exportStore').then(m => m.useExportStore.getState().openSettings()),
  },
  {
    id: 'render.exportFrame',
    label: 'Export Current Frame...',
    shortcut: 'Ctrl+Alt+S',
    onClick: () => import('../../../state/exportStore').then(m => {
      const store = m.useExportStore.getState();
      store.updateSettings({ format: 'frame-png' });
      store.openSettings();
    }),
  },
  {
    id: 'render.exportAudio',
    label: 'Export Audio Only...',
    onClick: () => import('../../../state/exportStore').then(m => {
      const store = m.useExportStore.getState();
      store.updateSettings({ format: 'audio-wav' });
      store.openSettings();
    }),
  },
];