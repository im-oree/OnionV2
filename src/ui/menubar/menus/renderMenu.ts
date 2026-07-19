import type { MenuItemDefinition } from '../MenuDropdown';

export const renderMenu: MenuItemDefinition[] = [
  { id: 'render.addToQueue', label: 'Add to Render Queue', shortcut: 'Ctrl+M', onClick: () => console.log('[Menu] Render > Add to Queue') },
  { id: 'render.addFrame', label: 'Add Frame to Render Queue', onClick: () => console.log('[Menu] Render > Add Frame') },
  { id: 'render.sep1', label: '', divider: true, onClick: () => {} },
  { id: 'render.queue', label: 'Render Queue...', onClick: () => console.log('[Menu] Render > Queue') },
  { id: 'render.outputModule', label: 'Output Module Settings...', onClick: () => console.log('[Menu] Render > Output Module') },
  { id: 'render.sep2', label: '', divider: true, onClick: () => {} },

  // ── Preview submenu ──────────────────────────────────
  {
    id: 'render.preview', label: 'Preview',
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

  // ── Purge submenu ─────────────────────────────────────
  {
    id: 'render.purge', label: 'Purge',
    children: [
      { id: 'render.purge.imageCache', label: 'Image Cache Memory', onClick: () => {
        const fc = (window as any).__frameCache;
        if (fc) fc.invalidateAllCompositions();
        console.log('[Menu] Image cache purged');
      }},
      { id: 'render.purge.allMemory', label: 'All Memory', onClick: () => {
        const fc = (window as any).__frameCache;
        if (fc) fc.invalidateAllCompositions();
        console.log('[Menu] All memory purged');
      }},
      { id: 'render.purge.undo', label: 'Undo (Phase 10)', disabled: true, onClick: () => {
        console.log('[Menu] Purge Undo — placeholder');
      }},
    ],
  },

  { id: 'render.sep3', label: '', divider: true, onClick: () => {} },
  { id: 'render.adaptiveRes', label: 'Adaptive Resolution', checked: true, onClick: () => {
    const ar = (window as any).__adaptiveResolution;
    if (ar) ar.setMode(ar.mode === 'auto' ? 'full' : 'auto');
  }},
];
