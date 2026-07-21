/**
 * ExampleEffectsGallery — modal panel showing installable example effects.
 * Click an example → creates a new custom effect from it.
 */
import React, { useState, useMemo } from 'react';
import { X, Download, Search } from 'lucide-react';
import { EXAMPLE_EFFECTS } from './exampleEffectsCatalog';
import { useCustomEffectsStore } from '../../../state/customEffectsStore';

interface Props {
  onClose: () => void;
  onInstalled: (newEffectId: string) => void;
}

export const ExampleEffectsGallery: React.FC<Props> = ({ onClose, onInstalled }) => {
  const [search, setSearch] = useState('');
  const createFromTemplate = useCustomEffectsStore(s => s.createFromTemplate);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EXAMPLE_EFFECTS;
    return EXAMPLE_EFFECTS.filter(e =>
      e.template.displayName.toLowerCase().includes(q) ||
      e.template.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q));
  }, [search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const arr = map.get(e.category) ?? [];
      arr.push(e);
      map.set(e.category, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const install = (entry: typeof EXAMPLE_EFFECTS[0]) => {
    const def = createFromTemplate(entry.template);
    onInstalled(def.id);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: 520, maxHeight: '80vh',
        background: 'var(--color-panel-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-dropdown)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center px-3 shrink-0"
          style={{ height: 40, borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', flex: 1 }}>
            Example Effects Gallery
          </span>
          <button onClick={onClose}
            className="border-0 bg-transparent cursor-pointer"
            style={{ color: 'var(--color-text-secondary)', padding: 4 }}>
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2" style={{
            height: 26, padding: '0 8px',
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}>
            <Search size={11} style={{ color: 'var(--color-text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search examples..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none"
              style={{ color: 'var(--color-text-primary)', fontSize: 11 }}
              autoFocus
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3">
          {grouped.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--color-text-disabled)', textAlign: 'center', padding: '20px 0' }}>
              No examples match your search.
            </div>
          )}
          {grouped.map(([category, entries]) => (
            <div key={category} style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                color: 'var(--color-text-tertiary)', letterSpacing: '0.05em',
                marginBottom: 4,
              }}>
                {category}
              </div>
              {entries.map(entry => (
                <div key={entry.templateId} className="flex items-center gap-2"
                  style={{
                    padding: '6px 8px', marginBottom: 4,
                    background: 'var(--color-panel)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                  }}>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {entry.template.displayName}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                      {entry.template.description}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--color-text-disabled)', marginTop: 2 }}>
                      {entry.template.parameters.length} params
                      {entry.template.usesTime && ' · animated'}
                    </div>
                  </div>
                  <button
                    onClick={() => install(entry)}
                    className="flex items-center gap-1 border-0 cursor-pointer"
                    style={{
                      height: 22, padding: '0 8px', borderRadius: 3,
                      fontSize: 10, fontWeight: 600,
                      background: 'var(--color-accent)', color: '#fff',
                    }}
                  >
                    <Download size={10} /> Install
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{
          padding: '6px 12px', borderTop: '1px solid var(--color-border)',
          fontSize: 10, color: 'var(--color-text-tertiary)',
        }}>
          Each install creates a new editable custom effect in your workspace.
        </div>
      </div>
    </div>
  );
};