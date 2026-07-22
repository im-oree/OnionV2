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
  { id: 'render.sep1', label: '', divider: true, onClick: () => {} },

  {
    id: 'render.preview',
    label: 'Preview',
    children: [
      { id: 'render.preview.ramPreview', label: 'RAM Preview', shortcut: 'Numpad 0', onClick: () => {
        const builder = (window as any).__ramPreviewBuilder;
        const store = (window as any).__compositionStore;
        if (builder && store) {
          const compId = store.getState().activeCompositionId;
          if (compId) builder.startManualPreview(compId, 'half');
        }
      }},
      { id: 'render.preview.ramPreviewWorkArea', label: 'RAM Preview (Work Area)', shortcut: 'Shift+Numpad 0', onClick: () => {
        const builder = (window as any).__ramPreviewBuilder;
        const store = (window as any).__compositionStore;
        if (builder && store) {
          const compId = store.getState().activeCompositionId;
          if (compId) builder.startManualPreview(compId, 'full');
        }
      }},
    ],
  },

  {
    id: 'render.purge',
    label: 'Purge',
    children: [
      { id: 'render.purge.imageCache', label: 'Image Cache Memory', onClick: () => {
        const fc = (window as any).__frameCache;
        if (fc) fc.invalidateAllCompositions();
      }},
      { id: 'render.purge.allMemory', label: 'All Memory', onClick: () => {
        const fc = (window as any).__frameCache;
        if (fc) fc.invalidateAllCompositions();
      }},
    ],
  },

  { id: 'render.sep2', label: '', divider: true, onClick: () => {} },
  {
    id: 'render.adaptiveRes',
    label: 'Adaptive Resolution',
    checked: true,
    onClick: () => {
      const ar = (window as any).__adaptiveResolution;
      if (ar) ar.setMode(ar.mode === 'auto' ? 'full' : 'auto');
    },
  },
];