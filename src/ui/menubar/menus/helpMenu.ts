import type { MenuItemDefinition } from '../MenuDropdown';

export const helpMenu: MenuItemDefinition[] = [
  {
    id: 'help.about', label: 'About OnionV2',
    onClick: () => alert('OnionV2 v0.1.0\nA web-based motion graphics editor.\nBuilt with React + Three.js + Zustand.'),
  },
  { id: 'help.sep1', label: '', divider: true, onClick: () => {} },
  {
    id: 'help.shortcuts', label: 'Keyboard Shortcuts...',
    onClick: () => {
      const shortcuts = [
        'V — Select', 'G — Move/Grab', 'R — Rotate', 'S — Scale',
        'Shift+R — Rectangle', 'Shift+E — Ellipse', 'Shift+P — Polygon',
        'P — Pen', 'T — Text', 'H — Hand', 'Shift+G — Gradient',
        '', 'Space — Play/Pause', 'Home — Go to Start', 'End — Go to End',
        '← → — Prev/Next Frame', 'J K — Prev/Next Keyframe',
        '', 'F9 — Easy Ease', 'Shift+F9 — Ease In', 'Ctrl+F9 — Ease Out',
        'Ctrl+L — Linear', 'Ctrl+H — Hold',
        '', 'Ctrl+S — Save', 'Ctrl+Shift+S — Save As', 'Ctrl+O — Open',
        'Ctrl+N — New Composition', 'Ctrl+I — Import',
        'Ctrl+D — Duplicate', 'X / Del — Delete', 'A — Select All',
        '', 'Ctrl+G — Toggle Grid', 'Ctrl+R — Toggle Rulers',
        'Shift+Tab — Toggle Snapping',
      ].join('\n');
      alert(shortcuts);
    },
  },
  { id: 'help.sep2', label: '', divider: true, onClick: () => {} },
  {
    id: 'help.reportBug', label: 'Report a Bug...',
    onClick: () => window.open('https://github.com/onion/issues', '_blank'),
  },
];