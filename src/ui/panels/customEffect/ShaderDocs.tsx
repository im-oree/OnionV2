/**
 * ShaderDocs — full API reference for custom shader authoring.
 * Rendered from structured content in docsContent.ts.
 */
import React, { useState, useMemo } from 'react';
import { Search, X, BookOpen, Sparkles } from 'lucide-react';
import { DOCS_SECTIONS, type DocBlock } from './docsContent';
import { ShaderSnippets } from './ShaderSnippets';

type DocsView = 'reference' | 'snippets';

export const ShaderDocs: React.FC = () => {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<DocsView>('reference');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DOCS_SECTIONS;
    return DOCS_SECTIONS.filter(sec => {
      if (sec.title.toLowerCase().includes(q)) return true;
      for (const b of sec.content) {
        if ('text' in b && b.text.toLowerCase().includes(q)) return true;
        if ('items' in b && b.items.some(i => i.toLowerCase().includes(q))) return true;
      }
      return false;
    });
  }, [search]);

  return (
    <div className="flex flex-col h-full">
      {/* View switcher */}
      <div className="flex items-center gap-1 shrink-0" style={{ marginBottom: 8 }}>
        <button
          onClick={() => setView('reference')}
          className="flex items-center gap-1 border-0 cursor-pointer"
          style={{
            height: 22, padding: '0 8px', borderRadius: 3,
            fontSize: 10, fontWeight: view === 'reference' ? 600 : 400,
            background: view === 'reference' ? 'var(--color-accent-muted)' : 'transparent',
            color: view === 'reference' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          }}
        >
          <BookOpen size={10} /> Reference
        </button>
        <button
          onClick={() => setView('snippets')}
          className="flex items-center gap-1 border-0 cursor-pointer"
          style={{
            height: 22, padding: '0 8px', borderRadius: 3,
            fontSize: 10, fontWeight: view === 'snippets' ? 600 : 400,
            background: view === 'snippets' ? 'var(--color-accent-muted)' : 'transparent',
            color: view === 'snippets' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          }}
        >
          <Sparkles size={10} /> Snippets
        </button>
      </div>

      {view === 'reference' && (
        <>
          {/* Search */}
          <div className="flex items-center gap-2 shrink-0" style={{
            height: 24, padding: '0 6px', marginBottom: 8,
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
          }}>
            <Search size={10} style={{ color: 'var(--color-text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search docs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none"
              style={{ color: 'var(--color-text-primary)', fontSize: 11 }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="border-0 bg-transparent cursor-pointer" style={{ color: 'var(--color-text-disabled)' }}>
                <X size={10} />
              </button>
            )}
          </div>

          {/* Sections */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--color-text-disabled)', textAlign: 'center', padding: '20px 0' }}>
                No matching sections.
              </div>
            )}
            {filtered.map(section => (
              <div key={section.id} style={{ marginBottom: 12 }}>
                <h3 style={{
                  fontSize: 12, fontWeight: 700,
                  color: 'var(--color-accent)',
                  marginBottom: 6, marginTop: 0,
                  paddingBottom: 3,
                  borderBottom: '1px solid var(--color-divider)',
                }}>
                  {section.title}
                </h3>
                {section.content.map((block, i) => (
                  <DocBlockRenderer key={i} block={block} />
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'snippets' && (
        <div className="flex-1 overflow-y-auto pr-1">
          <ShaderSnippets />
        </div>
      )}
    </div>
  );
};

const DocBlockRenderer: React.FC<{ block: DocBlock }> = ({ block }) => {
  if (block.kind === 'p') {
    return (
      <p style={{
        fontSize: 11, lineHeight: '16px',
        color: 'var(--color-text-secondary)',
        margin: '0 0 6px', padding: 0,
      }}>
        {block.text}
      </p>
    );
  }
  if (block.kind === 'code') {
    return (
      <pre style={{
        margin: '0 0 8px', padding: '6px 8px',
        fontSize: 10, lineHeight: '14px',
        color: '#c8ccd4',
        background: '#0d0f14',
        border: '1px solid var(--color-border)',
        borderRadius: 3,
        fontFamily: 'var(--font-family-mono)',
        overflowX: 'auto', whiteSpace: 'pre',
      }}>
        {block.text}
      </pre>
    );
  }
  if (block.kind === 'list') {
    return (
      <ul style={{
        margin: '0 0 8px', paddingLeft: 16,
        fontSize: 11, lineHeight: '16px',
        color: 'var(--color-text-secondary)',
      }}>
        {block.items.map((it, i) => (
          <li key={i} style={{ marginBottom: 2 }}>{it}</li>
        ))}
      </ul>
    );
  }
  if (block.kind === 'note') {
    const bg = block.variant === 'warn' ? 'rgba(255,165,0,0.08)'
             : block.variant === 'tip' ? 'rgba(80,200,120,0.08)'
             : 'rgba(88,101,255,0.08)';
    const border = block.variant === 'warn' ? 'rgba(255,165,0,0.4)'
                 : block.variant === 'tip' ? 'rgba(80,200,120,0.4)'
                 : 'rgba(88,101,255,0.4)';
    const label = block.variant === 'warn' ? 'WARN'
                : block.variant === 'tip' ? 'TIP'
                : 'NOTE';
    return (
      <div style={{
        padding: '6px 8px', margin: '0 0 8px',
        background: bg, border: `1px solid ${border}`,
        borderRadius: 3,
        fontSize: 10, lineHeight: '14px',
        color: 'var(--color-text-secondary)',
      }}>
        <span style={{ fontWeight: 700, marginRight: 6, opacity: 0.75 }}>{label}</span>
        {block.text}
      </div>
    );
  }
  return null;
};