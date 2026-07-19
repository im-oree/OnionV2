/**
 * CommandPalette — Ctrl+Shift+P or F3 overlay for searching and executing
 * any action in the app. Blender F3 / VS Code Ctrl+Shift+P style.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { useCommandPaletteStore } from '../../state/commandPaletteStore';

export const CommandPalette: React.FC = () => {
  const isOpen = useCommandPaletteStore((s) => s.isOpen);
  const searchQuery = useCommandPaletteStore((s) => s.searchQuery);
  const selectedIndex = useCommandPaletteStore((s) => s.selectedIndex);
  const close = useCommandPaletteStore((s) => s.close);
  const setSearchQuery = useCommandPaletteStore((s) => s.setSearchQuery);
  const setSelectedIndex = useCommandPaletteStore((s) => s.setSelectedIndex);
  const execute = useCommandPaletteStore((s) => s.execute);
  const search = useCommandPaletteStore((s) => s.search);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => search(searchQuery), [search, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || selectedIndex < 0) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(Math.max(selectedIndex - 1, 0));
      return;
    }
    if (e.key === 'Enter' && results[selectedIndex]) {
      execute(results[selectedIndex].id);
      return;
    }
  };

  if (!isOpen) return null;

  // Group results by category
  const grouped = results.reduce<Record<string, typeof results>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh]"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="flex flex-col w-full max-w-[520px] overflow-hidden"
        style={{
          background: 'var(--color-panel)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Search input */}
        <div className="flex items-center px-4 py-3" style={{ borderBottom: '1px solid var(--color-divider)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, marginRight: 10 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 outline-none bg-transparent border-0"
            style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}
          />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)' }}>{results.length}</span>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-auto" style={{ maxHeight: 360 }}>
          {results.length === 0 && (
            <div className="flex items-center justify-center py-8" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}>
              No results
            </div>
          )}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 py-1.5" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {category}
              </div>
              {items.map((item, idx) => {
                const globalIdx = results.indexOf(item);
                return (
                  <button
                    key={item.id}
                    className="flex items-center w-full text-left px-4 py-2 border-0 cursor-pointer transition-colors"
                    style={{
                      background: globalIdx === selectedIndex ? 'var(--color-panel-active)' : 'transparent',
                      color: 'var(--color-text-primary)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    onClick={() => execute(item.id)}
                  >
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.shortcut && (
                      <span className="ml-4 shrink-0" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2" style={{ borderTop: '1px solid var(--color-divider)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)' }}>
          <span>↑↓ Navigate</span>
          <span>↵ Execute</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
};
