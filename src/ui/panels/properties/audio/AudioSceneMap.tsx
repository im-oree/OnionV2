/**
 * AudioSceneMap — dockable panel showing a top-down (XZ-plane) view of
 * all spatial audio sources in the active composition.
 *
 * Features:
 * - Yellow listener marker at center (0,0)
 * - Blue/green dots for each source (green = selected layer)
 * - Inner circle = full-volume radius (refDistance)
 * - Outer dashed circle = silent-beyond radius (maxDistance)
 * - Drag dot → move X/Z in real-time
 * - Shift+drag → move both X/Z
 * - Linked sources show "L" badge, position read-only
 * - Comp boundary as dashed rectangle
 * - Grid with axes highlighted
 * - Auto-key on drag creates keyframes
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useCompositionStore } from '../../../../state/compositionStore';
import { useKeyframeStore } from '../../../../state/keyframeStore';
import { useSelectionStore } from '../../../../state/selectionStore';
import { animationClock } from '../../timeline/PlaybackControls';
import { debouncedCapture, flushDebouncedSnapshot } from '../../../../state/historyStore';

/** Map extent in world units (±range) */
const MAP_RANGE = 3000;
/** Max canvas DPR */
const MAX_DPR = 2;

export const AudioSceneMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 400, h: 400 });

  // Subscribe to composition store for layers and their data
  const cs = useCompositionStore(s => {
    const comp = s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId)
      : null;
    return { comp, frame: comp ? Math.floor(comp.currentTime * comp.fps) : 0 };
  });
  const comp = cs.comp;
  const currentFrame = cs.frame;

  // Subscribe to keyframe revision for live updates
  const kfRevision = useKeyframeStore(s => s.revision);
  void kfRevision;

  // Subscribe to selection
  const selectedId = useSelectionStore(s => s.selected[0]?.id ?? null);

  // Resize observer
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // ── Collect spatial sources ──
  const sources = React.useMemo(() => {
    if (!comp) return [];
    const result: Array<{
      layerId: string;
      name: string;
      enabled: boolean;
      x: number;
      z: number;
      refDistance: number;
      maxDistance: number;
      linkedLayerId: string | null;
      isSelected: boolean;
    }> = [];

    for (const layer of comp.layers) {
      if (layer.type !== 'audio' && layer.type !== 'video') continue;
      const d = layer.data as any;
      if (!d?.spatialEnabled) continue;
      const sx = d.spatialX ?? 0;
      const sz = d.spatialZ ?? 0;
      result.push({
        layerId: layer.id,
        name: layer.name || layer.type,
        enabled: true,
        x: sx,
        z: sz,
        refDistance: d.spatialRefDistance ?? 200,
        maxDistance: d.spatialMaxDistance ?? 2000,
        linkedLayerId: d.spatialLinkedLayerId ?? null,
        isSelected: layer.id === selectedId,
      });
    }
    return result;
  }, [comp, selectedId]);

  // ── Drawing ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w <= 0 || size.h <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const { w, h } = size;

    // Scale: world units → pixels
    const scale = Math.min(w, h) / (MAP_RANGE * 2);
    const cx = w / 2;
    const cy = h / 2;

    // ── Background ──
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // ── Grid ──
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gridStep = 500;
    for (let v = -MAP_RANGE; v <= MAP_RANGE; v += gridStep) {
      // Vertical
      const px = cx + v * scale;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
      // Horizontal
      const py = cy - v * scale;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }

    // ── Axes ──
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    // X axis (red tint)
    ctx.strokeStyle = 'rgba(255,80,80,0.2)';
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    // Z axis (blue tint)
    ctx.strokeStyle = 'rgba(80,80,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();

    // ── Labels on axes ──
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('X →', w - 30, cy + 4);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillText('Z ↑', cx - 6, 10);
    // Map edge labels
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${MAP_RANGE}`, cx + MAP_RANGE * scale, cy + 4);
    ctx.fillText(`-${MAP_RANGE}`, cx - MAP_RANGE * scale, cy + 4);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${MAP_RANGE}`, cx + 4, cy - MAP_RANGE * scale);
    ctx.fillText(`-${MAP_RANGE}`, cx + 4, cy + MAP_RANGE * scale);

    // ── Comp boundary (dashed) ──
    if (comp) {
      const compW = comp.width ?? 1920;
      const compH = comp.height ?? 1080;
      const left = cx - compW * scale;
      const top = cy - compH * scale;
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(left, top, compW * scale * 2, compH * scale * 2);
      ctx.setLineDash([]);
    }

    // ── Listener (yellow dot at origin) ──
    ctx.save();
    ctx.shadowColor = 'rgba(255,200,50,0.3)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffc832';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Listener ring
    ctx.strokeStyle = 'rgba(255,200,50,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();
    // "L" label
    ctx.fillStyle = '#ffc832';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('LISTENER', cx, cy + 10);

    // ── Draw each source ──
    for (const src of sources) {
      const px = cx + src.x * scale;
      const py = cy - src.z * scale; // Z goes up on screen

      // Max distance circle (dashed)
      const maxR = src.maxDistance * scale;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(px, py, maxR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ref distance circle (filled)
      const refR = src.refDistance * scale;
      ctx.fillStyle = src.isSelected
        ? 'rgba(50,255,50,0.08)'
        : 'rgba(80,150,255,0.06)';
      ctx.beginPath();
      ctx.arc(px, py, refR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = src.isSelected
        ? 'rgba(50,255,50,0.25)'
        : 'rgba(80,150,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, refR, 0, Math.PI * 2);
      ctx.stroke();

      // Source dot
      const dotColor = src.isSelected ? '#32ff32' : (src.linkedLayerId ? '#ff8833' : '#5896ff');
      ctx.save();
      ctx.shadowColor = src.isSelected ? 'rgba(50,255,50,0.4)' : 'rgba(88,150,255,0.3)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Selection ring
      if (src.isSelected) {
        ctx.strokeStyle = 'rgba(50,255,50,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Name label
      ctx.fillStyle = dotColor;
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      const label = src.name.length > 14
        ? src.name.slice(0, 12) + '…'
        : src.name;
      ctx.fillText(label, px + 8, py - 2);

      // "L" badge if linked
      if (src.linkedLayerId) {
        ctx.fillStyle = '#ff8833';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('[L]', px + 8, py - 14);
      }

      // Coordinates
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`(${Math.round(src.x)}, ${Math.round(src.z)})`, px + 8, py + 4);
    }

    // ── Legend ──
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('● Listener', 10, h - 28);
    ctx.fillStyle = '#5896ff';
    ctx.fillText('● Audio source', 10, h - 18);
    ctx.fillStyle = '#ff8833';
    ctx.fillText('● Linked source', 10, h - 8);

    // Selected color
    ctx.fillStyle = '#32ff32';
    const selLegendX = 120;
    ctx.fillText('● Selected', selLegendX, h - 8);

    // Legend: ref/max circles
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    const legY = h - 22;
    ctx.beginPath();
    ctx.arc(260, legY + 8, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Max dist.', 268, legY + 12);

    ctx.fillStyle = 'rgba(80,150,255,0.2)';
    ctx.beginPath();
    ctx.arc(320, legY + 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,150,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(320, legY + 8, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Ref dist.', 328, legY + 12);

  }, [size, comp, sources, currentFrame, kfRevision]);

  // ── Mouse interaction: drag to move sources ──
  const dragging = useRef<{
    layerId: string;
    startX: number;
    startZ: number;
    offsetX: number;
    offsetZ: number;
    /** Cached keyframe IDs so we don't search the engine on every pointer move */
    kfXId: string | null;
    kfZId: string | null;
    /** Whether the property animation was already enabled */
    animEnabled: boolean;
  } | null>(null);

  const getSourceAt = useCallback((mx: number, my: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scale = Math.min(size.w, size.h) / (MAP_RANGE * 2);
    const cx = size.w / 2;
    const cy = size.h / 2;
    // Convert mouse to world coords
    const wx = (mx - rect.left - cx) / scale;
    const wz = -(my - rect.top - cy) / scale; // Z inverted for screen

    // Find the source closest to the click (within 30px)
    let closest: typeof sources[0] | null = null;
    let closestDist = 30 / scale; // 30px threshold in world units
    for (const src of sources) {
      if (src.linkedLayerId) continue; // Can't drag linked sources
      const dx = src.x - wx;
      const dz = src.z - wz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist) {
        closestDist = dist;
        closest = src;
      }
    }
    return closest;
  }, [sources, size]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const src = getSourceAt(e.clientX, e.clientY);
    if (!src) return;

    // Select the layer
    const compId = useCompositionStore.getState().activeCompositionId;
    if (compId) {
      useSelectionStore.getState().select({
        type: 'layer',
        id: src.layerId,
        compositionId: compId,
      });
    }
    (canvasRef.current as any)?.setPointerCapture(e.pointerId);

    // Ensure animation is enabled for spatial.positionX and .positionZ
    const kfStore = useKeyframeStore.getState();
    const layerId = src.layerId;
    let animEnabled = kfStore.isPropertyAnimated(layerId, 'spatial.positionX');
    if (!animEnabled) {
      kfStore.toggleAnimatedProperty(layerId, 'spatial.positionX');
      kfStore.toggleAnimatedProperty(layerId, 'spatial.positionZ');
      animEnabled = true;
    }

    // Find existing keyframes at the current frame (or null to create on first move)
    const localFrame = Math.round(animationClock.currentFrame);
    const existingX = kfStore.engine.getKeyframesForProperty(layerId, 'spatial.positionX')
      .find(k => k.time === localFrame);
    const existingZ = kfStore.engine.getKeyframesForProperty(layerId, 'spatial.positionZ')
      .find(k => k.time === localFrame);

    debouncedCapture('Move Audio Source');

    dragging.current = {
      layerId,
      startX: src.x,
      startZ: src.z,
      offsetX: 0,
      offsetZ: 0,
      kfXId: existingX?.id ?? null,
      kfZId: existingZ?.id ?? null,
      animEnabled,
    };
  }, [getSourceAt]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = Math.min(size.w, size.h) / (MAP_RANGE * 2);
    const cx = size.w / 2;
    const cy = size.h / 2;
    const wx = (e.clientX - rect.left - cx) / scale;
    const wz = -(e.clientY - rect.top - cy) / scale;

    // Clamp to map range
    const newX = Math.max(-MAP_RANGE, Math.min(MAP_RANGE, wx));
    const newZ = Math.max(-MAP_RANGE, Math.min(MAP_RANGE, wz));

    const dx = newX - dragging.current.startX;
    const dz = newZ - dragging.current.startZ;

    dragging.current.offsetX = dx;
    dragging.current.offsetZ = dz;

    // Update the layer data in real-time
    const cs = useCompositionStore.getState();
    const compId = cs.activeCompositionId;
    if (!compId) return;
    const comp = cs.compositions.find(c => c.id === compId);
    if (!comp) return;
    const layer = comp.layers.find(l => l.id === dragging.current!.layerId);
    if (!layer) return;
    const data = { ...layer.data as any };
    data.spatialX = newX;
    data.spatialZ = newZ;
    cs.updateLayer(compId, layer.id, { data });

    // Update or create keyframes using cached IDs from pointerDown
    // (avoids searching the engine on every pointer move)
    const kfStore = useKeyframeStore.getState();
    const localFrame = Math.round(animationClock.currentFrame);
    const dr = dragging.current;

    if (dr.kfXId) {
      kfStore.updateKeyframe(dr.kfXId, { value: newX });
    } else {
      // Generate ID before addKeyframe (which may return void) so we always cache it
      const kfXId = `kf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_x`;
      kfStore.addKeyframe(layer.id, {
        id: kfXId,
        property: 'spatial.positionX',
        layerId: layer.id,
        time: localFrame,
        value: newX,
        interpolation: 'linear',
      });
      dr.kfXId = kfXId;
    }

    if (dr.kfZId) {
      kfStore.updateKeyframe(dr.kfZId, { value: newZ });
    } else {
      const kfZId = `kf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_z`;
      kfStore.addKeyframe(layer.id, {
        id: kfZId,
        property: 'spatial.positionZ',
        layerId: layer.id,
        time: localFrame,
        value: newZ,
        interpolation: 'linear',
      });
      dr.kfZId = kfZId;
    }
  }, [size]);

  const handlePointerUp = useCallback(() => {
    if (dragging.current) {
      dragging.current = null;
      flushDebouncedSnapshot();
    }
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 200,
        position: 'relative',
        overflow: 'hidden',
        background: '#1a1a2e',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {sources.length === 0 && (
        <div
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 12, color: 'rgba(255,255,255,0.3)',
            textAlign: 'center', pointerEvents: 'none',
            fontStyle: 'italic',
          }}
        >
          No spatial audio sources
          <br />
          <span style={{ fontSize: 10 }}>
            Enable "Spatial Audio" in the Audio panel
          </span>
        </div>
      )}
    </div>
  );
};

export default AudioSceneMap;
