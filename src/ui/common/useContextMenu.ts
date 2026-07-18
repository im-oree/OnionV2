import { useState, useCallback } from 'react';
import type { ContextMenuItem } from './ContextMenu';

interface MenuState {
  items: ContextMenuItem[];
  position: { x: number; y: number };
}

export function useContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);

  const open = useCallback((
    e: { clientX: number; clientY: number; preventDefault?: () => void; stopPropagation?: () => void },
    items: ContextMenuItem[],
  ) => {
    e.preventDefault?.();
    e.stopPropagation?.();
    setMenu({ items, position: { x: e.clientX, y: e.clientY } });
  }, []);

  const close = useCallback(() => setMenu(null), []);

  return { menu, open, close };
}