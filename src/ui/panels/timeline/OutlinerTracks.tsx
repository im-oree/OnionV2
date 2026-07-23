import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { ChevronRight, ChevronUp, ChevronDown, X, Plus, GripVertical, Eye, EyeOff, Lock, Unlock, Headphones } from 'lucide-react';
import { insertKeyframeAtPlayhead, deleteKeyframeAtPlayhead } from './propertyRowActions';
import type { Layer } from '../../../types/layer';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useTimelineExpanded } from './useTimelineExpanded';
import { formatPropertyLabel } from './propertyLabels';
import { useSelectionStore } from '../../../state/selectionStore';
import { Icon } from '../../common/Icon';
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu, type ContextMenuItem } from '../../common/ContextMenu';
import { createLayerInstance } from '../../../utils/createLayerInstance';
import { LAYER_COLORS, ADJUSTMENT_COLOR } from './layerColors';

interface Props { layers: Layer[]; compId: string; }
const LAYER_ROW_H = 32;
const PROP_ROW_H = 26;

const LAYER_ICONS: Record<string, string> = {
  solid: 'rectangle', shape: 'polygon', text: 'text',
  image: 'image', video: 'video', audio: 'audio', null: 'ellipse', comp: 'grid',
  adjustment: 'effect', spline: 'pen', chart: 'diamond', model3d: 'collection',
};

function handleTrackDrop(e: React.DragEvent, compId: string, targetLayerId?: string): void {
  e.preventDefault();

  // 1. Effect drop from library
  const effectType = e.dataTransfer.getData('application/onion-effect');
  if (effectType) {
    if (!targetLayerId) return;
    import('../../../state/effectsStore').then(({ useEffectsStore }) => {
      useEffectsStore.getState().addEffect(targetLayerId, effectType as any);
    });
    return;
  }

  const raw = e.dataTransfer.getData('text/plain');
  if (!raw) return;

  // 2. Effect drop via text fallback
  if (raw.startsWith('effect:') && targetLayerId) {
    const type = raw.slice(7);
    import('../../../state/effectsStore').then(({ useEffectsStore }) => {
      useEffectsStore.getState().addEffect(targetLayerId, type as any);
    });
    return;
  }

  // 3. Nested composition drop
  if (raw.startsWith('comp:')) {
    const r = useCompositionStore.getState().addCompLayer(compId, raw.slice(5));
    if (!r.ok && r.reason) console.warn('[OutlinerTracks] Drop rejected:', r.reason);
    return;
  }

  // 4. Layer reordering via drag-and-drop
  if (raw.startsWith('layer:') && targetLayerId) {
    const draggedId = raw.slice(6);
    if (draggedId === targetLayerId) return;
    const cs = useCompositionStore.getState();
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;
    const fromIdx = comp.layers.findIndex(l => l.id === draggedId);
    const toIdx = comp.layers.findIndex(l => l.id === targetLayerId);
    if (fromIdx !== -1 && toIdx !== -1) {
      cs.reorderLayers(compId, fromIdx, toIdx);
    }
  }
}

function addLayerOfType(compId: string, type: Layer['type']): void {
  const s = useCompositionStore.getState();
  const comp = s.compositions.find(c => c.id === compId); if (!comp) return;
  const layer = createLayerInstance(type, comp);
  s.addLayer(compId, layer);
  useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
}

function buildAddLayerMenu(compId: string): ContextMenuItem[] {
  return [
    { id: 'add.hdr', label: 'Add Layer', disabled: true },
    { id: 'add.d1', divider: true },
    { id: 'add.solid', label: 'Solid', onClick: () => addLayerOfType(compId, 'solid') },
    { id: 'add.shape', label: 'Shape', onClick: () => addLayerOfType(compId, 'shape') },
    { id: 'add.text', label: 'Text', onClick: () => addLayerOfType(compId, 'text') },
    { id: 'add.null', label: 'Null Object', onClick: () => addLayerOfType(compId, 'null') },
    { id: 'add.adjustment', label: 'Adjustment Layer', onClick: () => addLayerOfType(compId, 'adjustment') },
    { id: 'add.d2', divider: true },
    { id: 'add.image', label: 'Image', onClick: () => addLayerOfType(compId, 'image') },
    { id: 'add.video', label: 'Video', onClick: () => addLayerOfType(compId, 'video') },
  ];
}

const CAMERA_ID = '__camera__';

/** Camera pseudo-track — shows animated camera properties in the timeline */
const CameraTrack: React.FC<{ compId: string }> = ({ compId }) => {
  const engine = useKeyframeStore(s => { void s.revision; return s.engine; });
  const revision = useKeyframeStore(s => s.revision);
  const comp = useCompositionStore(s => s.compositions.find(c => c.id === compId));
  const expanded = useTimelineExpanded(s => s.expanded.has(CAMERA_ID));
  const toggle = useTimelineExpanded(s => s.toggle);
  void revision;

  const camProps = engine.getAllAnimatedProperties(CAMERA_ID);
  const hasKfs = camProps.length > 0;

  // Only show when 3D perspective is active
  if (!comp?.perspective3D && !hasKfs) return null;

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="flex items-center gap-2 cursor-pointer transition-colors"
        style={{
          height: LAYER_ROW_H, padding: '0 8px',
          borderBottom: '1px solid var(--color-divider)',
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <div style={{ width: 12 }} />
        <div className="shrink-0 rounded-full" style={{
          width: 4, height: 16,
          background: 'linear-gradient(180deg, #4a9eff, #2d7ad6)',
        }} />
        <button
          className="w-4 h-4 flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
          style={{ color: hasKfs ? 'var(--color-text-tertiary)' : 'transparent' }}
          onClick={() => toggle(CAMERA_ID)}
          disabled={!hasKfs}
        >
          {hasKfs && <ChevronRight size={11} strokeWidth={2}
            style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }} />}
        </button>
        <span style={{ fontSize: 13 }}>🎬</span>
        <span className="truncate flex-1" style={{ fontWeight: 500, color: '#4a9eff' }}>Camera</span>
        {hasKfs && (
          <span className="shrink-0" style={{
            fontSize: 9, padding: '1px 6px', fontWeight: 600,
            color: '#4a9eff', background: 'rgba(74,158,255,0.12)',
            borderRadius: 999, fontFamily: 'var(--font-family-mono)',
          }}>{camProps.length}</span>
        )}
      </div>
      {expanded && camProps.map(propPath => (
        <div key={propPath} data-tracks-row="1"
          className="flex items-center gap-2 transition-colors"
          style={{
            height: PROP_ROW_H, padding: '0 8px 0 38px',
            borderBottom: '1px solid var(--color-divider)',
            background: 'rgba(0,0,0,0.06)',
            fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)',
          }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.06)'}
        >
          <svg width="7" height="7" viewBox="0 0 8 8" className="shrink-0" style={{ color: '#4a9eff' }}>
            <polygon points="4,0 8,4 4,8 0,4" fill="currentColor" />
          </svg>
          <span className="truncate flex-1">{formatPropertyLabel(propPath)}</span>
          <button
            onClick={() => {
              const store = useKeyframeStore.getState();
              store.toggleAnimatedProperty(CAMERA_ID, propPath);
            }}
            className="border-0 bg-transparent cursor-pointer transition-colors"
            style={{ color: 'var(--color-text-disabled)' }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-disabled)'}
            title="Remove animation"
          >
            <X size={11} strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  );
};

function buildLayerCtx(compId: string, layer: Layer, idx: number, total: number): ContextMenuItem[] {
  const cs = useCompositionStore.getState();
  const canUp = idx < total - 1;
  const canDown = idx > 0;
  const comp = cs.compositions.find(c => c.id === compId);
  const otherLayers = comp ? comp.layers.filter(l => l.id !== layer.id) : [];
  const hasParent = layer.parentId != null;

  return [
    { id: 'l.hdr', label: layer.name, disabled: true },
    { id: 'l.d1', divider: true },
    { id: 'l.rename', label: 'Rename', shortcut: 'F2', onClick: () => document.dispatchEvent(new CustomEvent('layer:rename')) },
    { id: 'l.dup', label: 'Duplicate', shortcut: 'Ctrl+D', onClick: () => {
      import('../../../utils/duplicateLayer').then(({ duplicateLayer }) => {
        const dup = duplicateLayer(compId, layer);
        useSelectionStore.getState().select({ type: 'layer', id: dup.id, compositionId: compId });
      });
    }},
    { id: 'l.d0', divider: true },
    { id: 'l.up', label: 'Bring Forward', shortcut: 'Ctrl+]', disabled: !canUp,
      onClick: () => cs.reorderLayers(compId, idx, idx + 1) },
    { id: 'l.down', label: 'Send Backward', shortcut: 'Ctrl+[', disabled: !canDown,
      onClick: () => cs.reorderLayers(compId, idx, idx - 1) },
    { id: 'l.d3', divider: true },
    {
      id: 'l.parent', label: 'Parent', disabled: otherLayers.length === 0,
      children: [
        { id: 'l.parent.none', label: hasParent ? 'None (Remove Parent)' : 'None', onClick: () => cs.updateLayer(compId, layer.id, { parentId: null }) },
        { id: 'l.parent.sep', divider: true },
        ...otherLayers.map(l => ({
          id: `l.parent.${l.id}`,
          label: l.name,
          checked: layer.parentId === l.id,
          onClick: () => cs.updateLayer(compId, layer.id, { parentId: l.id }),
        })),
      ],
    },
    { id: 'l.d4', divider: true },
    { id: 'l.vis', label: layer.visible ? 'Hide' : 'Show', onClick: () => cs.updateLayer(compId, layer.id, { visible: !layer.visible }) },
    { id: 'l.lock', label: layer.locked ? 'Unlock' : 'Lock', onClick: () => cs.updateLayer(compId, layer.id, { locked: !layer.locked }) },
    { id: 'l.d2', divider: true },
    { id: 'l.3d', label: layer.is3D ? 'Disable 3D' : 'Enable 3D', onClick: () => {
      cs.updateLayer(compId, layer.id, {
        is3D: !layer.is3D,
        transform3D: layer.transform3D || { position: { x: 0, y: 0, z: 0 }, scale: { x: 100, y: 100, z: 100 }, rotationX: 0, rotationY: 0, rotationZ: 0, orientation: { x: 0, y: 0, z: 0 }, anchorPoint: { x: 0, y: 0, z: 0 }, opacity: 100 },
      });
    } },
    { id: 'l.addMask', label: 'Add Rect Mask', onClick: () => {
      import('../../../state/maskStore').then(m => m.useMaskStore.getState().addRectMask(layer.id));
    } },
    { id: 'l.d3', divider: true },
    // Time Remapping (video/comp/image layers)
    ...(layer.type === 'video' || layer.type === 'comp' || layer.type === 'image' ? [
      { id: 'l.timeRemap', label: (layer.data as any)?.timeRemap ? 'Disable Time Remapping' : 'Enable Time Remapping', shortcut: 'Ctrl+Alt+T',
        onClick: () => {
          const d = { ...((layer.data ?? {}) as any) };
          d.timeRemap = !d.timeRemap;
          const ks = useKeyframeStore.getState();
          if (d.timeRemap) {
            const totalFrames = Math.round(((layer.endFrame ?? 300) - (layer.startFrame ?? 0)));
            const kf1 = { id: `kf_tr_${Date.now()}_0`, property: 'timeRemap', layerId: layer.id, time: 0, value: 0, interpolation: 'linear' as const };
            const kf2 = { id: `kf_tr_${Date.now()}_1`, property: 'timeRemap', layerId: layer.id, time: totalFrames, value: totalFrames, interpolation: 'linear' as const };
            ks.engine.removeAllForProperty(layer.id, 'timeRemap');
            ks.addKeyframe(layer.id, kf1);
            ks.addKeyframe(layer.id, kf2);
            // Sync engine keyframes to layer data for renderer fallback
            d.timeRemapKeyframes = [
              { time: 0, sourceFrame: 0 },
              { time: totalFrames, sourceFrame: totalFrames },
            ];
          } else {
            ks.engine.removeAllForProperty(layer.id, 'timeRemap');
            // Remove only the timeRemap property from animated properties (not the whole layer!)
            useKeyframeStore.setState(s => {
              const m = new Map(s.animatedProperties);
              const layerProps = m.get(layer.id);
              if (layerProps) {
                layerProps.delete('timeRemap');
                if (layerProps.size === 0) m.delete(layer.id);
                else m.set(layer.id, new Set(layerProps));
              }
              return { animatedProperties: m, revision: s.revision + 1 };
            });
            delete d.timeRemapKeyframes;
          }
          cs.updateLayer(compId, layer.id, { data: d });
        } },
      { id: 'l.frameBlend', label: (layer.data as any)?.frameBlending ? 'Disable Frame Blending' : 'Enable Frame Blending',
        onClick: () => {
          const d = { ...((layer.data ?? {}) as any) };
          if (d.frameBlending) {
            d.frameBlending = false;
            delete d.frameBlendingType;
          } else {
            d.frameBlending = true;
            d.frameBlendingType = 'frameMix';
          }
          cs.updateLayer(compId, layer.id, { data: d });
        } },
      { id: 'l.timeSep', divider: true },
    ] : []),
    { id: 'l.precomp', label: 'Pre-compose', shortcut: 'Ctrl+Shift+C', onClick: () => {
      import('../../../utils/precomp').then(({ precomposeSelectedLayers }) => {
        precomposeSelectedLayers();
      });
    }},
    // Pre-process Comp — bake nested comp frames for fast playback
    ...(layer.type === 'comp' ? [
      {
        id: 'l.preprocess',
        label: (layer.data as any)?.preProcessed ? 'Clear Pre-processing' : 'Pre-process Comp',
        onClick: () => {
          const data = layer.data as any;
          if (data?.preProcessed) {
            import('../../../renderer/PreProcessManager').then(({ preProcessManager }) => {
              preProcessManager.clear(data.sourceCompId);
              cs.updateLayer(compId, layer.id, {
                data: { ...data, preProcessed: false },
              });
            });
          } else {
            import('../../../renderer/PreProcessManager').then(({ preProcessManager }) => {
              const renderer = (window as any).__renderer;
              if (!renderer?.renderer) {
                import('../../../state/notificationStore').then(m =>
                  m.useNotificationStore.getState().addNotification({
                    type: 'error', message: 'Renderer not available', autoDismiss: 2000,
                  })
                );
                return;
              }
              preProcessManager.bake(data.sourceCompId, renderer.renderer, () => {
                cs.updateLayer(compId, layer.id, {
                  data: { ...data, preProcessed: true },
                });
              });
            });
          }
        },
      },
    ] : []),
    // Extract (undo pre-compose) — only available for comp-type layers
    ...(layer.type === 'comp' ? [
      { id: 'l.extract', label: 'Extract from Pre-comp', onClick: () => {
        import('../../../utils/precomp').then(({ extractFromComp }) => {
          const result = extractFromComp(layer.id);
          if (!result.ok && result.reason) {
            import('../../../state/notificationStore').then(m =>
              m.useNotificationStore.getState().addNotification({
                type: 'error', message: result.reason!, autoDismiss: 3000,
              })
            );
          }
        });
      }},
    ] : []),
    { id: 'l.d5', divider: true },
    { id: 'l.del', label: 'Delete', shortcut: 'Del', onClick: () => { cs.removeLayer(compId, layer.id); useSelectionStore.getState().deselect(layer.id); } },
  ];
}

export const OutlinerTracks: React.FC<Props> = ({ layers, compId }) => {
  const engine = useKeyframeStore(s => { void s.revision; return s.engine; });
  const expandedSet = useTimelineExpanded(s => s.expanded);
  const toggle = useTimelineExpanded(s => s.toggle);
  const selectedIds = useSelectionStore(s => s.selected.filter(x => x.type === 'layer').map(x => x.id));
  const select = useSelectionStore(s => s.select);
  const selectRange = useSelectionStore(s => s.selectRange);
  const ctx = useContextMenu();
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  const comp = useCompositionStore(s => s.compositions.find(c => c.id === compId));

  // Hotkey I / Alt+I for insert/delete keyframe on hovered property row
  const hoveredPropRef = React.useRef<{ layerId: string; propertyPath: string } | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey) return;
      const hp = hoveredPropRef.current;
      if (!hp) return;
      if (e.key === 'i' && !e.altKey) {
        e.preventDefault();
        insertKeyframeAtPlayhead(hp.layerId, hp.propertyPath);
      } else if (e.key === 'i' && e.altKey) {
        e.preventDefault();
        deleteKeyframeAtPlayhead(hp.layerId, hp.propertyPath);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Build depth map once per render (avoids O(n²) recursion per layer)
  const depthMap = useMemo(() => {
    const map = new Map<string, number>();
    const getDepth = (id: string, visited = new Set<string>()): number => {
      if (map.has(id)) return map.get(id)!;
      if (visited.has(id)) { map.set(id, 0); return 0; }
      visited.add(id);
      const layer = layers.find(l => l.id === id);
      if (!layer || !layer.parentId) { map.set(id, 0); return 0; }
      const d = 1 + getDepth(layer.parentId, visited);
      map.set(id, d);
      return d;
    };
    for (const l of layers) getDepth(l.id);
    return map;
  }, [layers]);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const boxSelectState = useRef<{ startX: number; startY: number; additive: boolean } | null>(null);
  const [boxRect, setBoxRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // Custom reorder drag state
  const [reorderDragId, setReorderDragId] = useState<string | null>(null);
  const [reorderTargetIdx, setReorderTargetIdx] = useState<number | null>(null);

  // Box-select (rubber-band) on empty area
  const onContainerMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start on left-click in empty area
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't start box-select if clicking on a layer row, button, or interactive element
    if (target.closest('[data-tracks-row]') || target.closest('button') || target.closest('[data-ctx-menu]')) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    boxSelectState.current = { startX: e.clientX, startY: e.clientY, additive };
    // Clear selection if not additive
    if (!additive) useSelectionStore.getState().clearSelection();

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;pointer-events:none;border:1.5px solid var(--color-accent);background:rgba(88,101,255,0.10);z-index:9999;border-radius:3px';
    document.body.appendChild(overlay);

    const onMove = (ev: MouseEvent) => {
      const s = boxSelectState.current; if (!s) return;
      const x1 = Math.min(s.startX, ev.clientX), y1 = Math.min(s.startY, ev.clientY);
      const x2 = Math.max(s.startX, ev.clientX), y2 = Math.max(s.startY, ev.clientY);
      overlay.style.left = `${x1}px`; overlay.style.top = `${y1}px`;
      overlay.style.width = `${x2 - x1}px`; overlay.style.height = `${y2 - y1}px`;
      setBoxRect({ left: x1 - rect.left, top: y1 - rect.top, width: x2 - x1, height: y2 - y1 });
      // Find intersecting layer rows
      const rows = containerRef.current?.querySelectorAll<HTMLElement>('[data-tracks-row="1"]') ?? [];
      const newSel = s.additive ? new Set(useSelectionStore.getState().selected.filter(x => x.type === 'layer').map(x => x.id)) : new Set<string>();
      for (const row of rows) {
        const rr = row.getBoundingClientRect();
        if (rr.bottom >= y1 && rr.top <= y2) {
          const layerId = row.getAttribute('data-layer-id');
          if (layerId) newSel.add(layerId);
        }
      }
      // Update selection store
      const store = useSelectionStore.getState();
      // Deselect removed
      for (const id of store.selected.filter(x => x.type === 'layer').map(x => x.id)) {
        if (!newSel.has(id)) store.deselect(id);
      }
      // Select added
      for (const id of newSel) {
        if (!store.selected.some(x => x.type === 'layer' && x.id === id)) {
          store.select({ type: 'layer', id, compositionId: compId }, true);
        }
      }
    };
    const onUp = () => {
      boxSelectState.current = null; setBoxRect(null); overlay.remove();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [compId]);

  const onClickLayer = useCallback((id: string, ctrl: boolean, shift: boolean) => {
    if (shift && selectedIds.length > 0) {
      // Shift+Click: select range from last-selected to clicked
      const allIds = sortedLayers.map(l => l.id);
      selectRange(selectedIds[selectedIds.length - 1], id, allIds);
    } else if (ctrl) {
      // Ctrl+Click: toggle individual layer in selection
      const item = { type: 'layer' as const, id, compositionId: compId };
      if (selectedIds.includes(id)) useSelectionStore.getState().deselect(id);
      else useSelectionStore.getState().select(item, true);
    } else {
      // Plain click: replace selection
      select({ type: 'layer', id, compositionId: compId });
    }
  }, [compId, select, selectRange, selectedIds, sortedLayers]);
  const onLayerContext = useCallback((e: React.MouseEvent, layer: Layer, layerIdx: number) => {
    e.preventDefault(); e.stopPropagation();
    if (!selectedIds.includes(layer.id)) onClickLayer(layer.id, false, false);
    ctx.open(e, buildLayerCtx(compId, layer, layerIdx, sortedLayers.length));
  }, [ctx, compId, onClickLayer, selectedIds, sortedLayers.length]);

  const moveLayerUp = useCallback((id: string) => {
    const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
    if (!comp) return;
    const idx = comp.layers.findIndex(l => l.id === id);
    // Note: in the store, higher index = rendered on top. "Up" in UI = higher z = higher index.
    if (idx < 0 || idx >= comp.layers.length - 1) return;
    useCompositionStore.getState().reorderLayers(compId, idx, idx + 1);
  }, [compId]);

  const moveLayerDown = useCallback((id: string) => {
    const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
    if (!comp) return;
    const idx = comp.layers.findIndex(l => l.id === id);
    if (idx <= 0) return;
    useCompositionStore.getState().reorderLayers(compId, idx, idx - 1);
  }, [compId]);

  // Custom mouse-based layer reorder drag — smooth, real-time reordering
  const handleLayerReorderDrag = useCallback((e: React.MouseEvent, layerId: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
    if (!comp) return;

    const sorted = [...comp.layers].sort((a, b) => b.zIndex - a.zIndex);
    const layerIdx = sorted.findIndex(l => l.id === layerId);
    if (layerIdx === -1) return;

    // Get row height from DOM
    const rowEl = (e.currentTarget as HTMLElement).closest('[data-tracks-row]');
    const rowHeight = rowEl?.getBoundingClientRect().height ?? LAYER_ROW_H;

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    let currentIdx = layerIdx;
    setReorderDragId(layerId);
    setReorderTargetIdx(layerIdx);

    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - startY;
      const idxShift = Math.round(dy / rowHeight);
      const newIdx = Math.max(0, Math.min(sorted.length - 1, layerIdx + idxShift));

      if (newIdx !== currentIdx) {
        currentIdx = newIdx;
        setReorderTargetIdx(newIdx);
        // Reorder in real-time
        const cs = useCompositionStore.getState();
        const c = cs.compositions.find(cc => cc.id === compId);
        if (!c) return;
        const fromIdx = c.layers.findIndex(l => l.id === layerId);
        const toIdx = c.layers.findIndex(l => l.id === sorted[currentIdx].id);
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          cs.reorderLayers(compId, fromIdx, toIdx);
        }
      }
    };

    const onUp = () => {
      setReorderDragId(null);
      setReorderTargetIdx(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [compId]);

  const onEmptyContext = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-tracks-row]')) return;
    e.preventDefault(); e.stopPropagation();
    ctx.open(e, buildAddLayerMenu(compId));
  }, [ctx, compId]);

  // Whether any layer is currently soloed
  const hasSolo = useMemo(() => layers.some(l => l.soloed), [layers]);

  const toggleSolo = useCallback((layer: Layer) => {
    // Adjustment layers cannot be soloed — soloing one hides everything below
    if (layer.type === 'adjustment') return;
    const cs = useCompositionStore.getState();
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;
    if (layer.soloed) {
      // Unsolo this layer — clear solo on all layers
      for (const l of comp.layers) {
        if (l.soloed) cs.updateLayer(compId, l.id, { soloed: false });
      }
    } else {
      // Solo this layer — unsolo all others, solo this one
      for (const l of comp.layers) {
        const shouldBeSoloed = l.id === layer.id;
        if (l.soloed !== shouldBeSoloed) cs.updateLayer(compId, l.id, { soloed: shouldBeSoloed });
      }
    }
  }, [compId]);

  return (
    <div ref={containerRef} className="relative select-none min-h-full" onContextMenu={onEmptyContext} onMouseDown={onContainerMouseDown}>
      {sortedLayers.length === 0 && (
        <div className="p-4 text-center"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}
          onDragOver={(e) => {
            const types = Array.from(e.dataTransfer.types);
            if (types.includes('text/plain') || types.includes('application/onion-effect')) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }
          }}
          onDrop={(e) => handleTrackDrop(e, compId)}
        >No layers — right-click or click + to add</div>
      )}
      {/* Camera pseudo-track */}
      <CameraTrack compId={compId} />
      {sortedLayers.map((layer, li) => {
        const expanded = expandedSet.has(layer.id);
        const props = engine.getAllAnimatedProperties(layer.id);
        const isAudio = layer.type === 'audio';
        // For audio layers, always include 'volume' in the expandable list
        const displayProps = isAudio && !props.includes('volume') ? [...props, 'volume'] : props;
        const hasKfs = displayProps.length > 0;
        const isSel = selectedIds.includes(layer.id);
        const palette = layer.type === 'adjustment' ? ADJUSTMENT_COLOR : LAYER_COLORS[li % LAYER_COLORS.length];
        return (
          <div key={layer.id} style={{ position: 'relative' }}>
            <div data-tracks-row="1" data-layer-id={layer.id}
              className="flex items-center gap-2 cursor-pointer transition-colors"
              style={{
                height: LAYER_ROW_H, padding: '0 8px',
                borderBottom: '1px solid var(--color-divider)',
                background: isSel ? 'var(--color-accent-muted)' : 'transparent',
                color: isSel ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
                boxShadow: dropTarget === layer.id ? 'inset 0 0 0 1px var(--color-accent)' : 'none',
                opacity: reorderDragId === layer.id ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'; }}
              onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              onClick={(e) => onClickLayer(layer.id, e.ctrlKey || e.metaKey, e.shiftKey)}
              onContextMenu={(e) => onLayerContext(e, layer, li)}
              onDragOver={(e) => {
                // Only accept external drops (effects from library)
                const types = Array.from(e.dataTransfer.types);
                if (types.includes('application/onion-effect') || types.includes('text/plain')) {
                  e.preventDefault(); e.stopPropagation();
                  e.dataTransfer.dropEffect = 'copy';
                  setDropTarget(layer.id);
                }
              }}
              onDragLeave={() => { setDropTarget(null); }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation();
                setDropTarget(null);
                handleTrackDrop(e, compId, layer.id);
              }}
            >
              {/* Indent for parent depth */}
              {Array.from({ length: depthMap.get(layer.id) ?? 0 }).map((_, di) => (
                <div key={di} style={{ width: 16, flexShrink: 0 }} />
              ))}
              <GripVertical size={12} strokeWidth={2} style={{ color: 'var(--color-text-disabled)', flexShrink: 0, cursor: 'grab' }}
                onMouseDown={(e) => handleLayerReorderDrag(e, layer.id)} />
              <div className="shrink-0 rounded-full" style={{
                width: 4, height: 16,
                background: `linear-gradient(180deg, ${palette.from}, ${palette.to})`,
              }} />
              <button
                className="w-4 h-4 flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
                style={{ color: hasKfs ? 'var(--color-text-tertiary)' : 'transparent' }}
                onClick={(e) => { e.stopPropagation(); toggle(layer.id); }}
                disabled={!hasKfs}
              >
                {hasKfs && <ChevronRight size={11} strokeWidth={2}
                  style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }} />}
              </button>
              <Icon name={(LAYER_ICONS[layer.type] ?? 'ellipse') as any} size={14} strokeWidth={1.75}
                className={`shrink-0 ${isSel ? 'text-accent' : ''}`} />
              <button
                className="border-0 bg-transparent cursor-pointer shrink-0 flex items-center justify-center transition-colors"
                style={{ width: 18, height: 18, color: layer.visible ? 'var(--color-text-secondary)' : 'var(--color-text-disabled)', opacity: layer.visible ? 0.7 : 0.4 }}
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                onClick={(e) => { e.stopPropagation(); useCompositionStore.getState().updateLayer(compId, layer.id, { visible: !layer.visible }); }}
              >
                {layer.visible ? <Eye size={13} strokeWidth={1.75} /> : <EyeOff size={13} strokeWidth={1.75} />}
              </button>
              <button
                className="border-0 bg-transparent cursor-pointer shrink-0 flex items-center justify-center transition-colors"
                style={{ width: 18, height: 18, color: layer.locked ? '#e8b84b' : 'var(--color-text-disabled)', opacity: layer.locked ? 0.9 : 0.4 }}
                title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                onClick={(e) => { e.stopPropagation(); useCompositionStore.getState().updateLayer(compId, layer.id, { locked: !layer.locked }); }}
              >
                {layer.locked ? <Lock size={13} strokeWidth={1.75} /> : <Unlock size={13} strokeWidth={1.75} />}
              </button>
              <button
                className="border-0 bg-transparent cursor-pointer shrink-0 flex items-center justify-center transition-colors"
                style={{
                  width: 18, height: 18,
                  color: layer.soloed ? '#4bd0e8' : 'var(--color-text-disabled)',
                  opacity: layer.soloed ? 0.9 : layer.type === 'adjustment' ? 0.2 : (hasSolo && !layer.soloed ? 0.2 : 0.4),
                }}
                title={layer.type === 'adjustment' ? 'Solo (unavailable for adjustment layers)' : layer.soloed ? 'Unsolo Layer' : 'Solo Layer'}
                onClick={(e) => { e.stopPropagation(); toggleSolo(layer); }}
              >
                <Headphones size={13} strokeWidth={1.75} />
              </button>
              {/* 3D indicator */}
              {layer.is3D && (
                <span className="shrink-0" style={{
                  fontSize: 8, padding: '1px 5px', fontWeight: 700, letterSpacing: '0.04em',
                  color: '#4a9eff', background: 'rgba(74,158,255,0.12)',
                  borderRadius: 999, fontFamily: 'var(--font-family-mono)',
                }} title="3D Layer">
                  3D
                </span>
              )}
              <button
                className="border-0 bg-transparent cursor-pointer shrink-0 flex items-center justify-center transition-colors"
                style={{
                  width: 18, height: 18,
                  color: layer.motionBlur ? 'var(--color-accent)' : 'var(--color-text-disabled)',
                  opacity: layer.motionBlur ? 0.9 : 0.3,
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.03em',
                }}
                title={layer.motionBlur ? 'Disable motion blur for this layer' : 'Enable motion blur for this layer'}
                onClick={(e) => {
                  e.stopPropagation();
                  useCompositionStore.getState().updateLayer(compId, layer.id, { motionBlur: !layer.motionBlur });
                }}
              >
                <span style={{ fontSize: 8, fontWeight: 800 }}>MB</span>
              </button>
              <span className="truncate flex-1" style={{ fontWeight: isSel ? 500 : 400 }}>{layer.name}</span>
              {layer.parentId && (
                <span className="shrink-0" style={{
                  fontSize: 9, padding: '1px 6px', fontWeight: 500,
                  color: 'var(--color-accent)', background: 'rgba(88,101,255,0.1)',
                  borderRadius: 999, fontFamily: 'var(--font-family-mono)',
                  opacity: 0.7,
                }} title={`Parented to ${layers.find(l => l.id === layer.parentId)?.name ?? 'unknown'}`}>
                  P
                </span>
              )}
              {hasKfs && (
                <span className="shrink-0" style={{
                  fontSize: 9, padding: '1px 6px', fontWeight: 600,
                  color: palette.accent, background: `${palette.accent}18`,
                  borderRadius: 999, fontFamily: 'var(--font-family-mono)',
                }}>{props.length}</span>
              )}
              <button
                className="border-0 bg-transparent cursor-pointer shrink-0 flex items-center justify-center"
                style={{ width: 18, height: 18, color: li < sortedLayers.length - 1 ? 'var(--color-text-disabled)' : 'transparent', opacity: li < sortedLayers.length - 1 ? 0.6 : 0, pointerEvents: li < sortedLayers.length - 1 ? 'auto' : 'none' }}
                title="Bring Forward (Ctrl+])"
                onClick={(e) => { e.stopPropagation(); moveLayerUp(layer.id); }}
              ><ChevronUp size={13} strokeWidth={2} /></button>
              <button
                className="border-0 bg-transparent cursor-pointer shrink-0 flex items-center justify-center"
                style={{ width: 18, height: 18, color: li > 0 ? 'var(--color-text-disabled)' : 'transparent', opacity: li > 0 ? 0.6 : 0, pointerEvents: li > 0 ? 'auto' : 'none' }}
                title="Send Backward (Ctrl+[)"
                onClick={(e) => { e.stopPropagation(); moveLayerDown(layer.id); }}
              ><ChevronDown size={13} strokeWidth={2} /></button>
            </div>
            {/* Reorder drop indicator line */}
            {reorderDragId && reorderTargetIdx === li && reorderDragId !== layer.id && (
              <div style={{ position: 'absolute', top: -1, left: 8, right: 8, height: 2, background: 'var(--color-accent)', borderRadius: 1, zIndex: 10 }} />
            )}
            {expanded && displayProps.map(propPath => {
              const propKfs = engine.getKeyframesForProperty(layer.id, propPath);
              const _globalFrame = comp ? Math.round(comp.currentTime * comp.fps) : 0;
              const _localFrame = Math.max(0, _globalFrame - layer.startFrame);
              const atKeyframe = propKfs.some(k => k.time === _localFrame);

              const openPropRowCtx = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                ctx.open(e, [
                  { id: 'p.hdr', label: formatPropertyLabel(propPath), disabled: true },
                  { id: 'p.d1', divider: true },
                  {
                    id: 'p.insert',
                    label: atKeyframe ? 'Update Keyframe at Playhead' : 'Insert Keyframe at Playhead',
                    shortcut: 'I',
                    onClick: () => insertKeyframeAtPlayhead(layer.id, propPath),
                  },
                  {
                    id: 'p.delete',
                    label: 'Delete Keyframe at Playhead',
                    shortcut: 'Alt+I',
                    disabled: !atKeyframe,
                    onClick: () => deleteKeyframeAtPlayhead(layer.id, propPath),
                  },
                  { id: 'p.d2', divider: true },
                  {
                    id: 'p.removeAll',
                    label: 'Remove All Keyframes on This Property',
                    onClick: () => {
                      const store = useKeyframeStore.getState();
                      if (store.isPropertyAnimated(layer.id, propPath)) {
                        store.toggleAnimatedProperty(layer.id, propPath);
                      } else {
                        store.engine.removeAllForProperty(layer.id, propPath);
                        useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
                      }
                    },
                  },
                ]);
              };

              return (
                <div key={propPath} data-tracks-row="1"
                  className="flex items-center gap-2 transition-colors"
                  style={{
                    height: PROP_ROW_H, padding: '0 8px 0 38px',
                    borderBottom: '1px solid var(--color-divider)',
                    background: 'rgba(0,0,0,0.06)',
                    fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
                    hoveredPropRef.current = { layerId: layer.id, propertyPath: propPath };
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.06)';
                    hoveredPropRef.current = null;
                  }}
                  onContextMenu={openPropRowCtx}
                >
                  <svg width="7" height="7" viewBox="0 0 8 8" className="shrink-0" style={{ color: palette.accent }}>
                    <polygon points="4,0 8,4 4,8 0,4" fill="currentColor" />
                  </svg>
                  <span className="truncate flex-1">{formatPropertyLabel(propPath)}</span>

                  {/* Insert/Update keyframe at playhead */}
                  <button
                    onClick={(e) => { e.stopPropagation(); insertKeyframeAtPlayhead(layer.id, propPath); }}
                    className="border-0 bg-transparent cursor-pointer transition-all"
                    style={{
                      width: 16, height: 16,
                      color: atKeyframe ? palette.accent : 'var(--color-text-disabled)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = palette.accent}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = atKeyframe ? palette.accent : 'var(--color-text-disabled)'}
                    title={atKeyframe ? 'Playhead on keyframe — click to update' : 'Insert keyframe at playhead (I)'}
                  >
                    {atKeyframe ? (
                      <svg width="9" height="9" viewBox="0 0 9 9">
                        <polygon points="4.5,0.5 8.5,4.5 4.5,8.5 0.5,4.5" fill="currentColor" />
                      </svg>
                    ) : (
                      <Plus size={11} strokeWidth={2.5} />
                    )}
                  </button>

                  {/* Remove all animation for this property */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const store = useKeyframeStore.getState();
                      if (store.isPropertyAnimated(layer.id, propPath)) store.toggleAnimatedProperty(layer.id, propPath);
                      else { store.engine.removeAllForProperty(layer.id, propPath); useKeyframeStore.setState(s => ({ revision: s.revision + 1 })); }
                    }}
                    className="border-0 bg-transparent cursor-pointer transition-colors"
                    style={{ color: 'var(--color-text-disabled)' }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-disabled)'}
                    title="Remove animation"
                  >
                    <X size={11} strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
      {boxRect && (
        <div style={{
          position: 'absolute', left: boxRect.left, top: boxRect.top,
          width: boxRect.width, height: boxRect.height,
          border: '1.5px solid var(--color-accent)',
          background: 'rgba(88,101,255,0.10)',
          borderRadius: 3, pointerEvents: 'none', zIndex: 50,
        }} />
      )}
      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}
    </div>
  );
};