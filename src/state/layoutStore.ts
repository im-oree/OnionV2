/**
 * layoutStore — recursive dock tree for AE/Blender-style panel management.
 *
 * Tree model:
 *   LayoutNode = SplitNode | TabsNode
 *
 *   SplitNode: two children with a splitter between them, ratio = position of splitter
 *   TabsNode:  container holding one or more panel instances as tabs
 *
 * All UI mutations go through mutation actions here. Persistence is automatic
 * (debounced localStorage write) whenever the tree changes.
 */
import { create } from 'zustand';

export type SplitDirection = 'h' | 'v';

export interface PanelInstance {
  instanceId: string;
  panelType: string;
}

export interface SplitNode {
  type: 'split';
  id: string;
  direction: SplitDirection;
  ratio: number;                     // 0..1 — where the splitter sits
  a: LayoutNode;
  b: LayoutNode;
}

export interface TabsNode {
  type: 'tabs';
  id: string;
  tabs: PanelInstance[];
  activeIdx: number;
}

export type LayoutNode = SplitNode | TabsNode;

export type DropZone = 'top' | 'bottom' | 'left' | 'right' | 'center';

interface Workspace {
  name: string;
  tree: LayoutNode;
}

interface LayoutState {
  root: LayoutNode;
  workspaces: Record<string, Workspace>;
  activeWorkspaceName: string | null;

  // Tab operations
  addPanel: (panelType: string) => void;
  closeTab: (instanceId: string) => void;
  closeOthers: (instanceId: string) => void;
  setActiveTab: (containerId: string, index: number) => void;

  // Drag & drop
  moveTab: (
    instanceId: string,
    targetContainerId: string,
    zone: DropZone,
    insertIndex?: number,
  ) => void;

  // Splits
  resizeSplit: (splitId: string, ratio: number) => void;

  // Workspaces
  saveWorkspace: (name: string) => void;
  loadWorkspace: (name: string) => void;
  deleteWorkspace: (name: string) => void;
  resetToDefault: () => void;

  // Utility
  hasPanel: (panelType: string) => boolean;
  getInstanceById: (instanceId: string) => PanelInstance | null;
}

// ── ID generator ────────────────────────────────────────────────

let _idCounter = 0;
function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${(_idCounter++).toString(36)}`;
}

function mkTabs(panels: string[]): TabsNode {
  return {
    type: 'tabs',
    id: genId('tabs'),
    tabs: panels.map((p) => ({
      instanceId: genId('panel'),
      panelType: p,
    })),
    activeIdx: 0,
  };
}

function mkSplit(
  dir: SplitDirection,
  ratio: number,
  a: LayoutNode,
  b: LayoutNode,
): SplitNode {
  return { type: 'split', id: genId('split'), direction: dir, ratio, a, b };
}

// ── Default layout (mimics current AppShell) ────────────────────

export function createDefaultLayout(): LayoutNode {
  // Root: horizontal split
  //   left:  toolbar (narrow)
  //   right: vertical split
  //     top:    horizontal split
  //       left: project
  //       mid:  viewport
  //       right: properties
  //     bottom: timeline
  return mkSplit('h', 0.035,
    mkTabs(['toolbar']),
    mkSplit('v', 0.68,
      mkSplit('h', 0.2,
        mkTabs(['project']),
        mkSplit('h', 0.75,
          mkTabs(['viewport']),
          mkTabs(['properties', 'effects', 'align', 'info']),
        ),
      ),
      mkSplit('h', 0.7,
        mkTabs(['timeline']),
        mkTabs(['graph']),
      ),
    ),
  );
}

// ── Tree walk helpers ───────────────────────────────────────────

function findContainer(node: LayoutNode, containerId: string): TabsNode | null {
  if (node.type === 'tabs') return node.id === containerId ? node : null;
  return findContainer(node.a, containerId) ?? findContainer(node.b, containerId);
}

function findContainerWithInstance(
  node: LayoutNode,
  instanceId: string,
): TabsNode | null {
  if (node.type === 'tabs') {
    return node.tabs.some((t) => t.instanceId === instanceId) ? node : null;
  }
  return (
    findContainerWithInstance(node.a, instanceId) ??
    findContainerWithInstance(node.b, instanceId)
  );
}

function findInstance(node: LayoutNode, instanceId: string): PanelInstance | null {
  if (node.type === 'tabs') {
    return node.tabs.find((t) => t.instanceId === instanceId) ?? null;
  }
  return findInstance(node.a, instanceId) ?? findInstance(node.b, instanceId);
}

/**
 * Remove an instance from the tree. If its container becomes empty,
 * the container is replaced by its sibling in the parent split.
 * Returns the new tree.
 */
function removeInstance(node: LayoutNode, instanceId: string): LayoutNode | null {
  if (node.type === 'tabs') {
    const idx = node.tabs.findIndex((t) => t.instanceId === instanceId);
    if (idx < 0) return node;
    const newTabs = node.tabs.filter((_, i) => i !== idx);
    if (newTabs.length === 0) return null;   // container empty → collapse
    const newActive = Math.min(node.activeIdx, newTabs.length - 1);
    return { ...node, tabs: newTabs, activeIdx: Math.max(0, newActive) };
  }
  // Split — recurse
  const newA = removeInstance(node.a, instanceId);
  const newB = removeInstance(node.b, instanceId);
  if (newA === null && newB === null) return null;
  if (newA === null) return newB;
  if (newB === null) return newA;
  return { ...node, a: newA, b: newB };
}

/**
 * Insert a panel instance into a target container as tab or split.
 * Returns the new tree.
 */
function insertAtContainer(
  root: LayoutNode,
  targetContainerId: string,
  zone: DropZone,
  instance: PanelInstance,
): LayoutNode {
  const rewrite = (n: LayoutNode): LayoutNode => {
    if (n.type === 'tabs') {
      if (n.id !== targetContainerId) return n;

      if (zone === 'center') {
        // Add as new tab in this container
        return {
          ...n,
          tabs: [...n.tabs, instance],
          activeIdx: n.tabs.length,
        };
      }

      // Split — wrap this container in a new split
      const newContainer = mkTabs([]);
      newContainer.tabs = [instance];
      newContainer.activeIdx = 0;

      const dir: SplitDirection =
        zone === 'left' || zone === 'right' ? 'h' : 'v';
      const newFirst = zone === 'left' || zone === 'top';
      return newFirst
        ? mkSplit(dir, 0.5, newContainer, n)
        : mkSplit(dir, 0.5, n, newContainer);
    }
    // Split — recurse
    return { ...n, a: rewrite(n.a), b: rewrite(n.b) };
  };
  return rewrite(root);
}

/** Find the largest visible tabs container (by tab count heuristic) */
function findLargestContainer(node: LayoutNode): TabsNode {
  const all: TabsNode[] = [];
  const walk = (n: LayoutNode) => {
    if (n.type === 'tabs') all.push(n);
    else {
      walk(n.a);
      walk(n.b);
    }
  };
  walk(node);
  if (all.length === 0) return { type: 'tabs', id: genId('tabs'), tabs: [], activeIdx: 0 };
  let best = all[0]!;
  for (let i = 1; i < all.length; i++) {
    const c = all[i]!;
    if (c.tabs.length > best.tabs.length) best = c;
  }
  return best;
}

// ── Persistence ─────────────────────────────────────────────────

const STORAGE_KEY = 'onion_layout_v1';
const WORKSPACES_KEY = 'onion_workspaces_v1';

function loadFromStorage(): { root: LayoutNode; workspaces: Record<string, Workspace> } {
  try {
    const rootStr = localStorage.getItem(STORAGE_KEY);
    const wsStr = localStorage.getItem(WORKSPACES_KEY);
    const root: LayoutNode = rootStr ? JSON.parse(rootStr) : createDefaultLayout();
    const workspaces: Record<string, Workspace> = wsStr ? JSON.parse(wsStr) : {};
    return { root, workspaces };
  } catch {
    return { root: createDefaultLayout(), workspaces: {} };
  }
}

let _saveTimeout: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(root: LayoutNode, workspaces: Record<string, Workspace>): void {
  if (_saveTimeout) clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
      localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
    } catch {
      // Storage might be full or blocked
    }
  }, 500);
}

// ── Store ───────────────────────────────────────────────────────

const initial = loadFromStorage();

export const useLayoutStore = create<LayoutState>((set, get) => {
  const persistAndSet = (partial: Partial<LayoutState>): void => {
    set(partial);
    const state = get();
    debouncedSave(state.root, state.workspaces);
  };

  return {
    root: initial.root,
    workspaces: initial.workspaces,
    activeWorkspaceName: null,

    addPanel: (panelType) => {
      const state = get();
      const largest = findLargestContainer(state.root);
      if (!largest) return;
      const instance: PanelInstance = {
        instanceId: genId('panel'),
        panelType,
      };
      const newRoot = insertAtContainer(state.root, largest.id, 'center', instance);
      persistAndSet({ root: newRoot });
    },

    closeTab: (instanceId) => {
      const state = get();
      const newRoot = removeInstance(state.root, instanceId);
      // Never let the root become empty — replace with empty tabs
      persistAndSet({
        root: newRoot ?? { type: 'tabs', id: genId('tabs'), tabs: [], activeIdx: 0 },
      });
    },

    closeOthers: (instanceId) => {
      const state = get();
      const container = findContainerWithInstance(state.root, instanceId);
      if (!container) return;
      const kept = container.tabs.find((t) => t.instanceId === instanceId);
      if (!kept) return;
      const keptInstance: PanelInstance = kept;
      const rewrite = (n: LayoutNode): LayoutNode => {
        if (n.type === 'tabs') {
          if (n.id !== container.id) return n;
          return { ...n, tabs: [keptInstance], activeIdx: 0 };
        }
        return { ...n, a: rewrite(n.a), b: rewrite(n.b) };
      };
      persistAndSet({ root: rewrite(state.root) });
    },

    setActiveTab: (containerId, index) => {
      const state = get();
      const rewrite = (n: LayoutNode): LayoutNode => {
        if (n.type === 'tabs') {
          if (n.id !== containerId) return n;
          return { ...n, activeIdx: Math.max(0, Math.min(n.tabs.length - 1, index)) };
        }
        return { ...n, a: rewrite(n.a), b: rewrite(n.b) };
      };
      persistAndSet({ root: rewrite(state.root) });
    },

    moveTab: (instanceId, targetContainerId, zone, insertIndex?) => {
      const state = get();
      const instance = findInstance(state.root, instanceId);
      if (!instance) return;

      const sourceContainer = findContainerWithInstance(state.root, instanceId);
      if (!sourceContainer) return;

      // Same-container reorder: no need to remove+reinsert whole subtree
      if (
        zone === 'center' &&
        sourceContainer.id === targetContainerId &&
        insertIndex !== undefined
      ) {
        const oldIdx = sourceContainer.tabs.findIndex((t) => t.instanceId === instanceId);
        if (oldIdx < 0) return;
        let newIdx = insertIndex;
        // Adjust for the removal shifting subsequent indices
        if (newIdx > oldIdx) newIdx -= 1;
        if (newIdx === oldIdx) return; // no change
        newIdx = Math.max(0, Math.min(sourceContainer.tabs.length - 1, newIdx));

        const rewrite = (n: LayoutNode): LayoutNode => {
          if (n.type === 'tabs') {
            if (n.id !== sourceContainer.id) return n;
            const tabs = [...n.tabs];
            const [moved] = tabs.splice(oldIdx, 1) as [PanelInstance];
            tabs.splice(newIdx, 0, moved);
            return { ...n, tabs, activeIdx: newIdx };
          }
          return { ...n, a: rewrite(n.a), b: rewrite(n.b) };
        };
        persistAndSet({ root: rewrite(state.root) });
        return;
      }

      // No-op: single tab dropped on its own container's center
      if (
        zone === 'center' &&
        sourceContainer.id === targetContainerId &&
        sourceContainer.tabs.length === 1
      ) {
        return;
      }

      // Different container OR edge-zone drop
      const removed = removeInstance(state.root, instanceId);
      if (!removed) {
        persistAndSet({ root: state.root });
        return;
      }

      const targetStillExists = findContainer(removed, targetContainerId);
      if (!targetStillExists) {
        persistAndSet({ root: state.root });
        return;
      }

      let inserted = insertAtContainer(removed, targetContainerId, zone, instance);

      // If center drop with an insertIndex, reorder within the target container
      if (zone === 'center' && insertIndex !== undefined) {
        const rewrite = (n: LayoutNode): LayoutNode => {
          if (n.type === 'tabs') {
            if (n.id !== targetContainerId) return n;
            const tabs = [...n.tabs];
            const currentIdx = tabs.findIndex((t) => t.instanceId === instanceId);
            if (currentIdx < 0) return n;
            const [moved] = tabs.splice(currentIdx, 1) as [PanelInstance];
            const clampedIdx = Math.max(0, Math.min(tabs.length, insertIndex));
            tabs.splice(clampedIdx, 0, moved);
            return { ...n, tabs, activeIdx: clampedIdx };
          }
          return { ...n, a: rewrite(n.a), b: rewrite(n.b) };
        };
        inserted = rewrite(inserted);
      }

      persistAndSet({ root: inserted });
    },

    resizeSplit: (splitId, ratio) => {
      const state = get();
      const clamped = Math.max(0.05, Math.min(0.95, ratio));
      const rewrite = (n: LayoutNode): LayoutNode => {
        if (n.type === 'split') {
          if (n.id === splitId) return { ...n, ratio: clamped };
          return { ...n, a: rewrite(n.a), b: rewrite(n.b) };
        }
        return n;
      };
      persistAndSet({ root: rewrite(state.root) });
    },

    saveWorkspace: (name) => {
      const state = get();
      const workspaces = {
        ...state.workspaces,
        [name]: { name, tree: state.root },
      };
      persistAndSet({ workspaces, activeWorkspaceName: name });
    },

    loadWorkspace: (name) => {
      const state = get();
      const ws = state.workspaces[name];
      if (!ws) return;
      persistAndSet({
        root: JSON.parse(JSON.stringify(ws.tree)) as LayoutNode,
        activeWorkspaceName: name,
      });
    },

    deleteWorkspace: (name) => {
      const state = get();
      const workspaces = { ...state.workspaces };
      delete workspaces[name];
      persistAndSet({
        workspaces,
        activeWorkspaceName:
          state.activeWorkspaceName === name ? null : state.activeWorkspaceName,
      });
    },

    resetToDefault: () => {
      persistAndSet({ root: createDefaultLayout(), activeWorkspaceName: null });
    },

    hasPanel: (panelType) => {
      let found = false;
      const walk = (n: LayoutNode): void => {
        if (found) return;
        if (n.type === 'tabs') {
          if (n.tabs.some((t) => t.panelType === panelType)) found = true;
          return;
        }
        walk(n.a);
        walk(n.b);
      };
      walk(get().root);
      return found;
    },

    getInstanceById: (instanceId): PanelInstance | null => {
      return findInstance(get().root, instanceId);
    },
  };
});