/**
 * TransitionLibraryPanel — visual grid of all registered transitions.
 * Matches the EffectLibraryPanel pattern with:
 * - Category filter tabs
 * - Search bar
 * - Thumbnail cards with A→B image previews
 * - Drag-and-drop onto timeline
 * - Double-click to create transition layer
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { ALL_TRANSITIONS } from '../../../renderer/transitions/library';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { createLayerInstance } from '../../../utils/createLayerInstance';
import type { TransitionDefinition } from '../../../renderer/transitions/types';

const CATEGORY_LABELS: Record<string, string> = {
  basic: 'Basic',
  slide: 'Slide',
  wipe: 'Wipe',
  zoom: 'Zoom',
  stylize: 'Stylize',
};

type CategoryFilter = 'all' | string;

// Thumbnail cache
const thumbCache = new Map<string, string>();

const TRANSITION_ICONS: Record<string, string> = {
  dissolve: '◐',
  crossDissolve: '⇄',
  wipe: '▸',
  wipeLeft: '◂',
  wipeRight: '▸',
  wipeUp: '▴',
  wipeDown: '▾',
  slideLeft: '◂',
  slideRight: '▸',
  slideUp: '▴',
  slideDown: '▾',
  iris: '◯',
  zoomIn: '⊕',
  zoomOut: '⊖',
  fadeBlack: '◼',
  fadeWhite: '◻',
};

function generateThumbnail(def: TransitionDefinition): string {
  const cached = thumbCache.get(def.id);
  if (cached) return cached;

  const w = 128, h = 72;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;

  // Image A: warm gradient (left side)
  const gradA = ctx.createLinearGradient(0, 0, w / 2, h);
  gradA.addColorStop(0, '#ff8c42');
  gradA.addColorStop(0.5, '#d4451a');
  gradA.addColorStop(1, '#1a0500');
  ctx.fillStyle = gradA;
  ctx.fillRect(0, 0, w / 2, h);

  // Silhouette shapes on A
  ctx.fillStyle = '#0a0000';
  ctx.beginPath();
  ctx.arc(w * 0.2, h * 0.3, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.05, h);
  ctx.lineTo(w * 0.3, h * 0.4);
  ctx.lineTo(w * 0.45, h);
  ctx.fill();

  // Image B: cool gradient (right side)
  const gradB = ctx.createLinearGradient(w / 2, 0, w, h);
  gradB.addColorStop(0, '#0099ff');
  gradB.addColorStop(0.5, '#0055aa');
  gradB.addColorStop(1, '#001133');
  ctx.fillStyle = gradB;
  ctx.fillRect(w / 2, 0, w / 2, h);

  // Horizon on B
  ctx.fillStyle = '#003366';
  ctx.fillRect(w * 0.55, h * 0.4, w * 0.45, h * 0.6);
  ctx.fillStyle = '#ffdd44';
  ctx.beginPath();
  ctx.arc(w * 0.85, h * 0.38, 6, 0, Math.PI * 2);
  ctx.fill();

  // Center divider
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  ctx.setLineDash([]);

  // Transition icon in center
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(TRANSITION_ICONS[def.id] ?? '↔', w / 2, h / 2);

  // Bottom label bar
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, h - 18, w, 18);
  ctx.fillStyle = '#fff';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.name, w / 2, h - 9);

  // A/B labels
  ctx.font = 'bold 7px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('A', 3, 3);
  ctx.textAlign = 'right';
  ctx.fillText('B', w - 3, 3);

  const url = c.toDataURL();
  thumbCache.set(def.id, url);
  return url;
}

interface Props {
  onSelect?: (transition: TransitionDefinition) => void;
}

export const TransitionLibraryPanel: React.FC<Props> = ({ onSelect }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [animFrame, setAnimFrame] = useState(0);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pre-generate all thumbnails on mount
  useEffect(() => {
    for (const t of ALL_TRANSITIONS) generateThumbnail(t);
  }, []);

  // Animated sweep on hover
  useEffect(() => {
    if (hoveredId) {
      animRef.current = setInterval(() => setAnimFrame(f => (f + 1) % 10), 100);
    } else {
      if (animRef.current) clearInterval(animRef.current);
      setAnimFrame(0);
    }
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [hoveredId]);

  const cats = useMemo(() => {
    const set = new Set(ALL_TRANSITIONS.map(t => t.category));
    return Array.from(set);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_TRANSITIONS.filter(t => {
      if (category !== 'all' && t.category !== category) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [category, search]);

  const handleDragStart = (e: React.DragEvent, def: TransitionDefinition) => {
    e.dataTransfer.setData('application/onion-transition', JSON.stringify({
      type: def.id,
      name: def.name,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const addTransitionAtPlayhead = () => {
    const cs = useCompositionStore.getState();
    const compId = cs.activeCompositionId;
    if (!compId) return;
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;

    const currentFrame = Math.floor(comp.currentTime * comp.fps);
    const layer = createLayerInstance('transition', comp);
    layer.startFrame = currentFrame;
    layer.endFrame = currentFrame + Math.round(comp.fps); // 1-second default at comp's fps
    cs.addLayer(compId, layer);
    useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
  };

  return (
    <div className="flex flex-col h-full" style={{ fontSize: 'var(--font-size-xs)' }}>
      {/* Header */}
      <div
        className="flex items-center px-3 shrink-0"
        style={{ height: 40, borderBottom: '1px solid var(--color-border)' }}
      >
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Transitions
        </span>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div
          className="flex items-center gap-2"
          style={{
            height: 28, padding: '0 8px',
            background: 'var(--color-input-bg)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Search size={12} strokeWidth={1.75} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search transitions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none"
            style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-xs)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="border-0 bg-transparent cursor-pointer" style={{ color: 'var(--color-text-disabled)' }}>
              <X size={10} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <CategoryButton active={category === 'all'} onClick={() => setCategory('all')} label="All" />
        {cats.map(c => (
          <CategoryButton
            key={c}
            active={category === c}
            onClick={() => setCategory(c)}
            label={CATEGORY_LABELS[c] ?? c}
          />
        ))}
      </div>

      {/* Transition grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--color-text-disabled)' }}>
            No transitions found
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6 }}>
            {filtered.map(t => {
              const thumb = generateThumbnail(t);
              const isHovered = hoveredId === t.id;
              return (
                <button
                  key={t.id}
                  draggable
                  onDragStart={e => handleDragStart(e, t)}
                  onClick={() => onSelect?.(t)}
                  onMouseEnter={() => setHoveredId(t.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    cursor: 'grab',
                    border: `1px solid ${isHovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-input-bg)',
                    overflow: 'hidden',
                    padding: 0,
                    transition: 'border-color 0.15s',
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }} draggable={false}>
                    <img src={thumb} alt={t.name} draggable={false}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                    {/* Animated sweep line on hover */}
                    {isHovered && (
                      <div style={{
                        position: 'absolute', top: 0,
                        left: `${(animFrame / 9) * 100}%`,
                        width: 2, height: '100%',
                        background: 'var(--color-accent)',
                        boxShadow: '0 0 4px var(--color-accent)',
                        pointerEvents: 'none',
                      }} />
                    )}
                  </div>
                  {/* Label */}
                  <div style={{
                    padding: '3px 4px',
                    fontSize: 9,
                    color: 'var(--color-text-secondary)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}>
                    {t.name}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div
        className="shrink-0"
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '6px 8px',
        }}
      >
        <button
          onClick={addTransitionAtPlayhead}
          className="flex items-center justify-center gap-2 w-full border-0 cursor-pointer transition-colors"
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-accent)',
            color: '#fff',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          <Plus size={14} strokeWidth={2} />
          New Transition Layer
        </button>
      </div>
    </div>
  );
};

const CategoryButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className="border-0 cursor-pointer transition-colors"
    style={{
      height: 22, padding: '0 8px',
      borderRadius: 'var(--radius-sm)',
      background: active ? 'var(--color-accent-muted)' : 'transparent',
      color: active ? 'var(--color-accent)' : 'var(--color-text-disabled)',
      fontSize: 'var(--font-size-xs)',
      fontWeight: active ? 600 : 400,
      textTransform: 'capitalize',
    }}
  >
    {label}
  </button>
);

export default TransitionLibraryPanel;
