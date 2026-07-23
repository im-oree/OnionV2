import type { MenuItemDefinition } from '../MenuDropdown';
import { useLayoutStore } from '../../../state/layoutStore';
import { getAllPanelDefs } from '../../layout/PanelRegistry';

function buildPanelToggleItems(): MenuItemDefinition[] {
  const state = useLayoutStore.getState();
  return getAllPanelDefs().map((def) => {
    const isOpen = state.hasPanel(def.type);
    return {
      id: `window.panel.${def.type}`,
      label: `${isOpen ? '✓ ' : '   '}${def.label}`,
      onClick: () => {
        if (!isOpen) {
          useLayoutStore.getState().addPanel(def.type);
        }
      },
    };
  });
}

function buildWorkspaceItems(): MenuItemDefinition[] {
  const state = useLayoutStore.getState();
  const names = Object.keys(state.workspaces).sort();
  if (names.length === 0) return [];
  return names.map((name) => ({
    id: `window.workspace.${name}`,
    label: `${state.activeWorkspaceName === name ? '● ' : '   '}${name}`,
    onClick: () => useLayoutStore.getState().loadWorkspace(name),
  }));
}

export const windowMenu: MenuItemDefinition[] = [
  {
    id: 'window.panels',
    label: 'Panels',
    // Note: MenuDropdown must call this getter at render time for dynamic items
    get children() { return buildPanelToggleItems(); },
  } as any,
  { id: 'window.sep1', label: '', divider: true, onClick: () => {} },
  {
    id: 'window.workspaces',
    label: 'Workspaces',
    get children() {
      const items = buildWorkspaceItems();
      if (items.length === 0) {
        return [{
          id: 'window.workspaces.empty',
          label: '(No saved workspaces)',
          disabled: true,
          onClick: () => {},
        }];
      }
      return items;
    },
  } as any,
  {
    id: 'window.saveWorkspace',
    label: 'Save Current Layout as Workspace…',
    onClick: () => {
      const name = prompt('Workspace name:');
      if (name?.trim()) {
        useLayoutStore.getState().saveWorkspace(name.trim());
      }
    },
  },
  {
    id: 'window.deleteWorkspace',
    label: 'Delete Workspace…',
    onClick: () => {
      const state = useLayoutStore.getState();
      const names = Object.keys(state.workspaces);
      if (names.length === 0) {
        alert('No workspaces to delete.');
        return;
      }
      const name = prompt(
        `Delete which workspace?\n${names.join('\n')}`,
      );
      if (name?.trim() && state.workspaces[name.trim()]) {
        useLayoutStore.getState().deleteWorkspace(name.trim());
      }
    },
  },
  { id: 'window.sep2', label: '', divider: true, onClick: () => {} },
  {
    id: 'window.resetLayout',
    label: 'Reset to Default Layout',
    onClick: () => {
      if (confirm('Reset the layout to default? Current arrangement will be lost.')) {
        useLayoutStore.getState().resetToDefault();
      }
    },
  },
  { id: 'window.sep3', label: '', divider: true, onClick: () => {} },
  {
    id: 'window.fullScreen',
    label: 'Full Screen',
    shortcut: 'F11',
    onClick: () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    },
  },
];