import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Check, ChevronRight } from 'lucide-react';

export interface ContextMenuItem {
  id: string;
  label?: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  icon?: React.ReactNode;
  children?: ContextMenuItem[];
  divider?: boolean;
  onClick?: () => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, position, onClose }) => (
  <MenuLevel items={items} position={position} onClose={onClose} isRoot />
);

interface MenuLevelProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
  isRoot?: boolean;
}

const MenuLevel: React.FC<MenuLevelProps> = ({ items, position, onClose, isRoot }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [sub, setSub] = useState<{ id: string; pos: { x: number; y: number } } | null>(null);
  const [pos, setPos] = useState(position);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let x = position.x, y = position.y;
    if (x + r.width > window.innerWidth) x = Math.max(4, window.innerWidth - r.width - 4);
    if (y + r.height > window.innerHeight) y = Math.max(4, window.innerHeight - r.height - 4);
    if (x !== pos.x || y !== pos.y) setPos({ x, y });
  }, [position.x, position.y]);

  useEffect(() => {
    if (!isRoot) return;
    const onDown = (e: MouseEvent) => {
      const menus = document.querySelectorAll('[data-ctx-menu]');
      for (const m of menus) if (m.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onDown);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isRoot, onClose]);

  const onHover = useCallback((item: ContextMenuItem, el: HTMLElement) => {
    if (item.children?.length) {
      const r = el.getBoundingClientRect();
      setSub({ id: item.id, pos: { x: r.right - 4, y: r.top } });
    } else setSub(null);
  }, []);

  const onItemClick = useCallback((item: ContextMenuItem, el: HTMLElement) => {
    if (item.disabled) return;
    if (item.children?.length) {
      const r = el.getBoundingClientRect();
      setSub({ id: item.id, pos: { x: r.right - 4, y: r.top } });
      return;
    }
    item.onClick?.();
    onClose();
  }, [onClose]);

  const subItems = sub ? items.find(i => i.id === sub.id)?.children : null;

  return (
    <>
      <div
        ref={ref} data-ctx-menu="true"
        style={{
          left: pos.x, top: pos.y,
          background: 'var(--color-panel-raised)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-dropdown)',
          animation: 'dropdown-in 140ms var(--ease-out)',
        }}
        className="fixed z-[9999] min-w-[220px] py-1.5 select-none"
      >
        {items.map((item, i) => {
          if (item.divider) return (
            <div key={`d${i}`} className="h-px my-1.5 mx-2" style={{ background: 'var(--color-divider)' }} />
          );
          return (
            <CtxRow key={item.id} item={item}
              hasSub={!!(item.children?.length)}
              isSubOpen={sub?.id === item.id}
              onHover={onHover} onClick={onItemClick} />
          );
        })}
      </div>
      {sub && subItems && (
        <MenuLevel items={subItems} position={sub.pos} onClose={onClose} />
      )}
    </>
  );
};

interface CtxRowProps {
  item: ContextMenuItem;
  hasSub: boolean;
  isSubOpen: boolean;
  onHover: (item: ContextMenuItem, el: HTMLElement) => void;
  onClick: (item: ContextMenuItem, el: HTMLElement) => void;
}

const CtxRow: React.FC<CtxRowProps> = ({ item, hasSub, isSubOpen, onHover, onClick }) => {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref} disabled={item.disabled}
      className="flex items-center w-full text-left border-0 bg-transparent transition-colors"
      style={{
        height: 30,
        padding: '0 14px',
        gap: 10,
        fontSize: 'var(--font-size-md)',
        color: item.disabled ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
        cursor: item.disabled ? 'default' : 'pointer',
        background: isSubOpen ? 'var(--color-panel-hover)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!item.disabled) (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
        if (ref.current) onHover(item, ref.current);
      }}
      onMouseLeave={(e) => {
        if (!isSubOpen) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
      onClick={() => ref.current && onClick(item, ref.current)}
    >
      <span className="w-4 flex items-center justify-center shrink-0" style={{ color: 'var(--color-accent)' }}>
        {item.checked ? <Check size={12} strokeWidth={2.5} /> : (item.icon ?? null)}
      </span>
      <span className="flex-1 whitespace-nowrap">{item.label}</span>
      {item.shortcut && (
        <span
          className="ml-6 whitespace-nowrap font-mono"
          style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}
        >
          {item.shortcut}
        </span>
      )}
      {hasSub && <ChevronRight size={12} strokeWidth={2} style={{ color: 'var(--color-text-tertiary)', marginLeft: 4 }} />}
    </button>
  );
};