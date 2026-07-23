/**
 * EffectLibraryPanel — visual grid of all registered effects.
 *
 * Features:
 * - Category filter tabs
 * - Search bar
 * - Thumbnail cards
 * - Drag-and-drop onto layers (outliner) or timeline empty area
 * - Double-click applies to currently selected layer
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Search, X, Sparkles, Save, Layers, Square } from 'lucide-react';
import { effectRegistry } from '../../../renderer/effects/EffectRegistry';
import { effectThumbnailGenerator } from '../../../renderer/effects/EffectThumbnailGenerator';
import { useEffectsStore } from '../../../state/effectsStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useNotificationStore } from '../../../state/notificationStore';
import { EffectPresetsPanel } from './EffectPresetsPanel';
import { createLayerInstance } from '../../../utils/createLayerInstance';
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu } from '../../common/ContextMenu';
import type { EffectCategory, EffectDefinition, EffectType } from '../../../types/effect';

const CATEGORY_LABELS: Record<string, string> = {
  blur: 'Blur',
  color: 'Color',
  stylize: 'Stylize',
  distort: 'Distort',
  generate: 'Generate',
  transition: 'Transition',
  blend: 'Blend',
};

type CategoryFilter = 'all' | EffectCategory;

export const EffectLibraryPanel: React.FC = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [genProgress, setGenProgress] = useState<{ done: number; total: number } | null>(null);
  const [activeEffect, setActiveEffect] = useState<EffectType | null>(null);
  const addNotif = useNotificationStore((s) => s.addNotification);
  const selectedLayers = useSelectionStore((s) =>
    s.selected.filter((x) => x.type === 'layer'),
  );
  const ctx = useContextMenu();

  const allDefs = useMemo(() => effectRegistry.list().filter((d) => d.passes > 0), []);
  const cats = useMemo(() => effectRegistry.listCategories(), []);

  // Kick off background generation of missing thumbnails on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await effectThumbnailGenerator.generateAll((done, total) => {
          if (!cancelled) setGenProgress({ done, total });
        });
      } finally {
        if (!cancelled) setGenProgress(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allDefs.filter((d) => {
      if (category !== 'all' && d.category !== category) return false;
      if (q && !d.displayName.toLowerCase().includes(q) && !d.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allDefs, category, search]);

  const createAdjustmentLayer = useCallback((type: EffectType) => {
    const cs = useCompositionStore.getState();
    const compId = cs.activeCompositionId;
    const comp = compId ? cs.compositions.find(c => c.id === compId) : null;
    if (!comp) {
      addNotif({ type: 'warning', message: 'No composition — create one first', autoDismiss: 2500 });
      return;
    }
    const adjLayer = createLayerInstance('adjustment', comp, {
      name: `Adjustment: ${effectRegistry.get(type)?.displayName ?? type}`,
      zIndex: comp.layers.length + 1,
    });
    cs.addLayer(compId!, adjLayer);
    useEffectsStore.getState().addEffect(adjLayer.id, type);
    useSelectionStore.getState().select({ type: 'layer', id: adjLayer.id, compositionId: compId! });
    addNotif({ type: 'success', message: `Created adjustment layer with ${effectRegistry.get(type)?.displayName ?? type}`, autoDismiss: 2500 });
    try { (window as any).__renderer?.renderLoop?.requestRender?.(); } catch {}
  }, [addNotif]);

  // Keyboard shortcut: Ctrl+Shift+E → create adjustment layer with the active (last-hovered) effect
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        const type = activeEffect ?? filtered[0]?.type ?? null;
        if (type) {
          e.preventDefault();
          e.stopPropagation();
          createAdjustmentLayer(type);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeEffect, filtered, createAdjustmentLayer]);

  const applyToSelected = (type: EffectType) => {
    const sel = useSelectionStore.getState().selected.filter((x) => x.type === 'layer');
    // If no layer is selected, fall back to creating an adjustment layer
    if (sel.length === 0) {
      createAdjustmentLayer(type);
      return;
    }
    for (const s of sel) {
      useEffectsStore.getState().addEffect(s.id, type);
    }
    addNotif({ type: 'success', message: `Applied ${type} to ${sel.length} layer${sel.length > 1 ? 's' : ''}`, autoDismiss: 2000 });
  };

  const openEffectContext = useCallback((e: React.MouseEvent, def: EffectDefinition) => {
    const sel = useSelectionStore.getState().selected.filter((x) => x.type === 'layer');
    ctx.open(e, [
      { id: 'efx.hdr', label: def.displayName, disabled: true },
      { id: 'efx.d1', divider: true },
      {
        id: 'efx.apply',
        label: 'Apply to Selected Layer',
        icon: <Square size={12} strokeWidth={2} />,
        disabled: sel.length === 0,
        onClick: () => applyToSelected(def.type),
      },
      {
        id: 'efx.adj',
        label: 'Create Adjustment Layer',
        icon: <Layers size={12} strokeWidth={2} />,
        disabled: false,
        onClick: () => createAdjustmentLayer(def.type),
      },
    ]);
  }, [ctx, createAdjustmentLayer]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-panel)' }}>
      {/* Header */}
      <div className="flex items-center px-3 shrink-0" style={{ height: 40, borderBottom: '1px solid var(--color-border)' }}>
        <Sparkles size={14} strokeWidth={1.75} style={{ color: 'var(--color-accent)', marginRight: 8 }} />
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', flex: 1 }}>Effect Library</span>
        {genProgress && (
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
            {genProgress.done}/{genProgress.total}
          </span>
        )}
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
            placeholder="Search effects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

      {/* Category filter */}
      <div className="flex flex-wrap gap-1 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <CategoryButton active={category === 'all'} onClick={() => setCategory('all')} label="All" />
        {cats.map((c) => (
          <CategoryButton
            key={c}
            active={category === c}
            onClick={() => setCategory(c)}
            label={CATEGORY_LABELS[c] ?? c}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 && (
          <div className="text-center py-8" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)' }}>
            No effects match your search.
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
            gap: 6,
          }}
        >
          {filtered.map((def) => (
            <EffectCard key={def.type} def={def}
              onDoubleClick={() => applyToSelected(def.type)}
              onContext={(e) => openEffectContext(e, def)}
              onHover={() => setActiveEffect(def.type)} />
          ))}
        </div>
      </div>

      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}

      {/* Presets section */}
      <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 4 }}>
        {(() => {
          const layerId = selectedLayers.length === 1 ? selectedLayers[0]!.id : null;
          if (!layerId) {
            return (
              <div className="flex items-center gap-2 px-3 py-3" style={{ fontSize: 10, color: 'var(--color-text-disabled)' }}>
                <Save size={12} strokeWidth={1.75} />
                <span>Select a layer to save/load presets</span>
              </div>
            );
          }
          return <EffectPresetsPanel layerId={layerId} />;
        })()}
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
    }}
  >
    {label}
  </button>
);

const EffectCard: React.FC<{
  def: EffectDefinition;
  onDoubleClick: () => void;
  onContext: (e: React.MouseEvent) => void;
  onHover: () => void;
}> = ({ def, onDoubleClick, onContext, onHover }) => {
  const [thumbImg, setThumbImg] = useState<HTMLImageElement | null>(null);
  const [hover, setHover] = useState(false);
  const [resizeKey, setResizeKey] = useState(0);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const rafRef = React.useRef<number>(0);

  const frameCount = useMemo(
    () => effectThumbnailGenerator.getFrameCount(def.type),
    [def.type],
  );
  const isAnimated = useMemo(() => frameCount > 1, [frameCount]);

  // Load thumbnail as an HTMLImageElement so we know its natural size and
  // can draw it precisely into the canvas. Retries every 500ms while the
  // generator returns null (e.g. WebGL renderer not attached yet at mount).
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const tryLoad = async () => {
      if (cancelled) return;
      let url: string | null = null;
      try {
        url = await effectThumbnailGenerator.getThumbnail(def.type);
      } catch (err) {
        console.warn('[EffectCard] getThumbnail threw', def.type, err);
      }
      if (cancelled) return;
      if (!url) {
        timer = window.setTimeout(tryLoad, 500);
        return;
      }
      const img = new Image();
      img.onload = () => { if (!cancelled) setThumbImg(img); };
      img.onerror = () => {
        if (!cancelled) timer = window.setTimeout(tryLoad, 800);
      };
      img.src = url;
    };

    tryLoad();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [def.type]);

  // Draw current frame into the canvas. For animated thumbs, cycle frames.
  useEffect(() => {
    const img = thumbImg;
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine the source frame size. Spritesheet layout: frames laid out
    // horizontally, each frame is (imgHeight × imgHeight) square.
    const srcFrameH = img.naturalHeight;
    const srcFrameW = isAnimated
      ? Math.floor(img.naturalWidth / frameCount)
      : img.naturalWidth;

    // Canvas physical size — use DPR for crispness
    // If layout hasn't happened yet, bail out. The ResizeObserver below will
    // bump `resizeKey` once the canvas has a real CSS width, re-running this
    // effect with a valid size. Without this guard we'd size the backing
    // store to 1x1 and the image would render as a dot in the top-left.
    const cssSize = canvas.clientWidth;
    if (cssSize < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const pxSize = Math.max(1, Math.round(cssSize * dpr));
    if (canvas.width !== pxSize || canvas.height !== pxSize) {
      canvas.width = pxSize;
      canvas.height = pxSize;
    }

    ctx.imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = 'high';

    const drawFrame = (frameIdx: number) => {
      ctx.clearRect(0, 0, pxSize, pxSize);
      // Fit frame into square canvas preserving aspect (should already be square)
      ctx.drawImage(
        img,
        frameIdx * srcFrameW, 0, srcFrameW, srcFrameH,   // source
        0, 0, pxSize, pxSize,                             // dest
      );
    };

    if (!isAnimated) {
      drawFrame(0);
      return;
    }

    // Animate — 12 fps loop (~83ms/frame)
    let last = performance.now();
    let idx = 0;
    const frameIntervalMs = 720 / frameCount;
    const loop = (now: number) => {
      if (now - last >= frameIntervalMs) {
        last = now;
        idx = (idx + 1) % frameCount;
        drawFrame(idx);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    drawFrame(0);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [thumbImg, isAnimated, frameCount, resizeKey]);

  // Re-draw on resize (container width changes when panel resizes)
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let lastW = 0; // start at 0 so the first real measurement always triggers
    const observer = new ResizeObserver(() => {
      const w = canvas.clientWidth;
      if (w > 0 && w !== lastW) {
        lastW = w;
        setResizeKey(k => k + 1);
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/onion-effect', def.type);
    e.dataTransfer.setData('text/plain', `effect:${def.type}`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContext}
      onMouseEnter={() => { setHover(true); onHover(); }}
      onMouseLeave={() => setHover(false)}
      title={`${def.displayName}\n${def.description}\n\nDouble-click: apply to selected layer\nRight-click: more options\nCtrl+Shift+E: create adjustment layer\nDrag: drop on layer or timeline`}
      style={{
        borderRadius: 'var(--radius-sm)',
        padding: 4,
        background: hover ? 'var(--color-panel-hover)' : 'transparent',
        cursor: 'grab',
        transition: 'background 120ms ease-out',
        border: `1px solid ${hover ? 'var(--color-border)' : 'transparent'}`,
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          background: '#1a1c22',
          position: 'relative',
          display: 'block',
        }}
      >
        {thumbImg ? (
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
        ) : (
          <div
            className="animate-pulse"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'var(--color-panel-hover)',
              }}
            />
          </div>
        )}
      </div>
      <div
        className="truncate"
        style={{
          fontSize: 10,
          color: 'var(--color-text-secondary)',
          marginTop: 3,
          textAlign: 'center',
          fontWeight: 500,
        }}
      >
        {def.displayName}
      </div>
    </div>
  );
};

export default EffectLibraryPanel;