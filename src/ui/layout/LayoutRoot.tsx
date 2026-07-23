/**
 * LayoutRoot — mounts the recursive layout tree from layoutStore.
 * Sits between MenuBar and StatusBar in AppShell.
 */
import React from 'react';
import { useLayoutStore } from '../../state/layoutStore';
import { LayoutNodeView } from './LayoutNode';

export const LayoutRoot: React.FC = () => {
  const root = useLayoutStore((s) => s.root);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        overflow: 'hidden',
        background: 'var(--color-app-bg, #16181d)',
      }}
    >
      <LayoutNodeView node={root} />
    </div>
  );
};