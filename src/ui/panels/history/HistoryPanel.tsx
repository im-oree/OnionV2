/**
 * HistoryPanel — shows chronological list of undo commands.
 * Current state is highlighted. Click any entry to jump to that state.
 */
import React, { useRef, useEffect } from 'react';
import { useHistoryStore } from '../../../state/historyStore';

export const HistoryPanel: React.FC = () => {
  const past = useHistoryStore((s) => s.past);
  const future = useHistoryStore((s) => s.future);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const clear = useHistoryStore((s) => s.clear);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current position
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [past.length]);

  // Build full history: past entries + current state marker + future entries (reversed)
  const historyItems = [
    ...past.map((entry, i) => ({ type: 'past' as const, name: entry.name, index: i })),
    { type: 'current' as const, name: 'Current State', index: 0 },
    ...future.slice().reverse().map((entry, i) => ({ type: 'future' as const, name: entry.name, index: i })),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          History
        </span>
        <div className="flex gap-1">
          <button
            onClick={undo}
            disabled={past.length === 0}
            className="border-0 bg-transparent cursor-pointer disabled:opacity-30"
            style={{ padding: 4, color: 'var(--color-text-secondary)' }}
            title="Undo (Ctrl+Z)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1,4 1,10 7,10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="border-0 bg-transparent cursor-pointer disabled:opacity-30"
            style={{ padding: 4, color: 'var(--color-text-secondary)' }}
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23,4 23,10 17,10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          {(past.length > 0 || future.length > 0) && (
            <button
              onClick={clear}
              className="border-0 bg-transparent cursor-pointer"
              style={{ padding: 4, color: 'var(--color-text-disabled)' }}
              title="Clear history"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* History list */}
      <div ref={listRef} className="flex-1 overflow-auto py-1">
        {historyItems.length === 0 && (
          <div className="flex items-center justify-center py-8" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)' }}>
            No history
          </div>
        )}
        {historyItems.map((item, idx) => {
          const isCurrent = item.type === 'current';
          const isPast = item.type === 'past';
          return (
            <div
              key={`${item.type}-${item.index}`}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors"
              style={{
                background: isCurrent ? 'var(--color-accent-muted)' : 'transparent',
                color: isCurrent ? 'var(--color-text-primary)' : isPast ? 'var(--color-text-secondary)' : 'var(--color-text-disabled)',
                fontSize: 'var(--font-size-xs)',
                borderLeft: `3px solid ${isCurrent ? 'var(--color-accent)' : 'transparent'}`,
              }}
              onClick={() => {
                if (!isPast) return;
                // Undo is synchronous (zustand setState), so a simple for-loop is instant.
                const steps = past.length - 1 - item.index;
                for (let i = 0; i < steps; i++) undo();
              }}
            >
              {isCurrent && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="var(--color-accent)" style={{ flexShrink: 0 }}>
                  <polygon points="4,0 8,4 4,8 0,4" />
                </svg>
              )}
              <span className="truncate">{isCurrent ? '← Current State' : item.name}</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5" style={{ borderTop: '1px solid var(--color-border)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)' }}>
        {past.length + future.length} steps
      </div>
    </div>
  );
};

export default HistoryPanel;
