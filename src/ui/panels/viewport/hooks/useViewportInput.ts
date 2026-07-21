import { useEffect, useRef } from 'react';
import type { CameraManager } from '../../../../renderer/CameraManager';
import type { HitTester } from '../../../../renderer/interaction/HitTest';
import type { ModalTransform } from '../../../../renderer/interaction/ModalTransform';
import { useKeyframeStore } from '../../../../state/keyframeStore';
import { useTimelineStore } from '../../../../state/timelineStore';
import { VIEWPORT_CONFIG } from '../../../../config/viewportConfig';
import { useCompositionStore } from '../../../../state/compositionStore';
import { useNavigationStore } from '../../../../state/navigationStore';
import { useSelectionStore } from '../../../../state/selectionStore';
import { useToolStore, type ToolId } from '../../../../state/toolStore';
import { TOOLS } from '../../../../config/constants';
import { createDefaultLayer } from '../../../../config/defaults';
import type { Layer, CompData } from '../../../../types/layer';
import { motionSketch } from '../../properties/motionSketch';
import { usePenToolStore } from '../../../../state/penToolStore';
import { computePathBounds } from '../../../../types/layer';
import { setPickWhipState, getPickWhipState, clearPickWhip } from '../PickWhipOverlay';
import { useNotificationStore } from '../../../../state/notificationStore';

function genId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): { dist: number; t: number } {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { dist: Math.hypot(px - ax, py - ay), t: 0 };
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + dx * t, cy = ay + dy * t;
  return { dist: Math.hypot(px - cx, py - cy), t };
}

const CAMERA_KEYFRAME_ID = '__camera__';

/** Auto-key a single camera property at the current time. */
function autoKeyCameraProp(property: string, value: number): void {
  const cs = useCompositionStore.getState();
  const compId = cs.activeCompositionId;
  if (!compId) return;
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return;
  const frame = Math.round(comp.currentTime * comp.fps);
  const kfStore = useKeyframeStore.getState();

  if (!kfStore.isPropertyAnimated(CAMERA_KEYFRAME_ID, property)) {
    kfStore.toggleAnimatedProperty(CAMERA_KEYFRAME_ID, property);
  }

  const existing = kfStore.engine.getKeyframesForProperty(CAMERA_KEYFRAME_ID, property)
    .find((k: any) => k.time === frame);

  if (existing) {
    kfStore.updateKeyframe(existing.id, { value });
  } else {
    kfStore.addKeyframe(CAMERA_KEYFRAME_ID, {
      id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      property,
      layerId: CAMERA_KEYFRAME_ID,
      time: frame,
      value,
      interpolation: 'linear',
    });
  }
}

function finalizePenPath(commands: import('../../../../types/layer').PathCommand[]): void {
  // Check if we're drawing a mask
  const maskTargetId = (window as any).__maskTargetLayerId as string | undefined;
  if (maskTargetId) {
    delete (window as any).__maskTargetLayerId;
    import('../../../../state/maskStore').then(({ useMaskStore }) => {
      useMaskStore.getState().addPathMask(maskTargetId, commands);
    });
    // Switch back to select tool
    import('../../../../state/toolStore').then(({ useToolStore }) => {
      useToolStore.getState().setActiveTool('select' as any);
    });
    return;
  }

  // Original path layer creation
  const cs = useCompositionStore.getState();
  const compId = cs.activeCompositionId;
  if (!compId) return;
  const comp = cs.compositions.find((c) => c.id === compId);
  if (!comp) return;

  const bounds = computePathBounds(commands);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  // Center commands around 0,0
  const centered = commands.map((c) => ({
    type: c.type,
    points: c.points.map((v: number, i: number) => i % 2 === 0 ? v - cx : v - cy),
  }));
  const centeredBounds = computePathBounds(centered);

  const base = createDefaultLayer('shape', `Path ${comp.layers.length + 1}`);
  const compEndFrame = Math.floor(comp.duration * comp.fps);
  const layer: Layer = {
    ...base, id: genId(),
    zIndex: comp.layers.length + 1,
    endFrame: compEndFrame,
    transform: {
      position: { x: cx, y: cy },
      scale: { x: 100, y: 100 }, rotation: 0,
      anchorPoint: { x: 0, y: 0 },
    },
    data: {
      type: 'path' as const,
      commands: centered,
      bounds: centeredBounds,
      fill: { type: 'solid' as const, color: '#ffffff', opacity: 100 },
    },
  };
  cs.addLayer(compId, layer);
  useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
}

interface UseViewportInputOptions {
  canvas: HTMLCanvasElement | null;
  cameraManager: CameraManager | null;
  hitTester: HitTester | null;
  modalTransform: ModalTransform | null;
  requestRender?: () => void;
}

export function useViewportInput({
  canvas, cameraManager, hitTester, modalTransform, requestRender,
}: UseViewportInputOptions): void {
  const isPanning = useRef(false);
  const isBoxSelecting = useRef(false);
  const isDrawing = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const boxStart = useRef({ x: 0, y: 0 });
  const cmRef = useRef(cameraManager);
  const htRef = useRef(hitTester);
  const mtRef = useRef(modalTransform);
  const axisGuideRef = useRef<SVGSVGElement | null>(null);
  const mouseMoved = useRef(false);

  // ── FLY MODE (3D: Right mouse + WASD) ──
  const flyState = useRef({
    active: false,
    speed: 500,
    keys: new Set<string>(),
    animId: 0,
  });
  const flyLoopRef = useRef<() => void>(() => {});

  // Keep refs up to date without re-running the effect
  useEffect(() => { cmRef.current = cameraManager; }, [cameraManager]);
  useEffect(() => { htRef.current = hitTester; }, [hitTester]);
  useEffect(() => { mtRef.current = modalTransform; }, [modalTransform]);

  useEffect(() => {
    if (!canvas) return;
    const el = canvas;
    let drawSvg: SVGSVGElement | null = null;
    let boxSvg: SVGSVGElement | null = null;

    let docMousemove: ((e: MouseEvent) => void) | null = null;
    let docMouseup: ((e: MouseEvent) => void) | null = null;
    let docKeydown: ((e: KeyboardEvent) => void) | null = null;
    let docKeyup: ((e: KeyboardEvent) => void) | null = null;

    function attachDocListeners(): void {
      detachDocListeners();

      docMousemove = (ev: MouseEvent) => {
        const mt = mtRef.current;
        if (!mt?.active) return;

        if (document.pointerLockElement === canvas) {
          if (ev.movementX !== 0 || ev.movementY !== 0) {
            mouseMoved.current = true;
            mt.updateDelta(ev.movementX, ev.movementY);
          }
        } else {
          const dx = ev.clientX - lastMouse.current.x;
          const dy = ev.clientY - lastMouse.current.y;
          lastMouse.current = { x: ev.clientX, y: ev.clientY };
          if (dx !== 0 || dy !== 0) {
            mouseMoved.current = true;
            // FIX: pass raw screen deltas — ModalTransform handles Y inversion internally
            mt.updateDelta(dx, dy);
          }
        }
        requestRender?.();
      };

      docMouseup = (ev: MouseEvent) => {
        const mt = mtRef.current;
        if (!mt?.active) return;
        if (ev.button === 2) mt.cancel();
        else if (ev.button === 0) mt.confirm();
        mouseMoved.current = false;
        detachDocListeners();
        requestRender?.();
      };

      docKeydown = (ev: KeyboardEvent) => {
        const mt = mtRef.current;
        if (!mt?.active) return;
        if (ev.key === 'Escape') { mt.cancel(); detachDocListeners(); return; }
        if (ev.key === 'Enter') { mt.confirm(); detachDocListeners(); return; }
        if (ev.key === 'x' && !ev.shiftKey) { mt.setAxisLock('x'); updateAxisGuide(); return; }
        if (ev.key === 'y' && !ev.shiftKey) { mt.setAxisLock('y'); updateAxisGuide(); return; }
        if (ev.key === 'X' && ev.shiftKey) { mt.setAxisExclude('x'); updateAxisGuide(); return; }
        if (ev.key === 'Y' && ev.shiftKey) { mt.setAxisExclude('y'); updateAxisGuide(); return; }
        if (ev.key === 'Shift') { mt.setPrecisionMode(true); return; }
        if (ev.key === 'Control') { mt.setSnapMode(true); return; }
        if (ev.key === 'Alt') { mt.setAspectLock(true); return; }
        if (/^[0-9.\-]$/.test(ev.key)) { mt.pushNumericChar(ev.key); return; }
        if (ev.key === 'Backspace') { mt.backspaceNumeric(); return; }
      };

      docKeyup = (ev: KeyboardEvent) => {
        const mt = mtRef.current;
        if (!mt?.active) return;
        if (ev.key === 'Shift') mt.setPrecisionMode(false);
        if (ev.key === 'Control') mt.setSnapMode(false);
        if (ev.key === 'Alt') mt.setAspectLock(false);
      };

      document.addEventListener('mousemove', docMousemove);
      document.addEventListener('mouseup', docMouseup);
      document.addEventListener('keydown', docKeydown);
      document.addEventListener('keyup', docKeyup);
      createAxisGuide();
    }

    function detachDocListeners(): void {
      if (docMousemove) document.removeEventListener('mousemove', docMousemove);
      if (docMouseup) document.removeEventListener('mouseup', docMouseup);
      if (docKeydown) document.removeEventListener('keydown', docKeydown);
      if (docKeyup) document.removeEventListener('keyup', docKeyup);
      docMousemove = null;
      docMouseup = null;
      docKeydown = null;
      docKeyup = null;
      removeAxisGuide();
    }

    function createAxisGuide(): void {
      removeAxisGuide();
      const parent = el.parentElement;
      if (!parent) return;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:24;width:100%;height:100%';
      parent.appendChild(svg);
      axisGuideRef.current = svg;
    }

    function removeAxisGuide(): void {
      if (axisGuideRef.current?.parentElement) {
        axisGuideRef.current.parentElement.removeChild(axisGuideRef.current);
      }
      axisGuideRef.current = null;
    }

    function updateAxisGuide(): void {
      const svg = axisGuideRef.current;
      const mt = mtRef.current;
      if (!svg) return;
      svg.innerHTML = '';
      if (!mt?.active || (!mt.axisLock && !mt.axisExclude)) return;
      const ns = 'http://www.w3.org/2000/svg';
      const w = svg.clientWidth || 300;
      const h = svg.clientHeight || 200;

      if (mt.axisLock === 'x' || mt.axisExclude === 'y') {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', '0'); line.setAttribute('y1', String(h / 2));
        line.setAttribute('x2', String(w)); line.setAttribute('y2', String(h / 2));
        line.setAttribute('stroke', mt.axisLock === 'x' ? '#ff4444' : 'rgba(255,68,68,0.4)');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '4 2');
        svg.appendChild(line);
      }
      if (mt.axisLock === 'y' || mt.axisExclude === 'x') {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', String(w / 2)); line.setAttribute('y1', '0');
        line.setAttribute('x2', String(w / 2)); line.setAttribute('y2', String(h));
        line.setAttribute('stroke', mt.axisLock === 'y' ? '#44ff44' : 'rgba(68,255,68,0.4)');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '4 2');
        svg.appendChild(line);
      }
    }

    const createOverlay = (zIndex: string): SVGSVGElement => {
      const parent = el.parentElement!;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:${zIndex};width:100%;height:100%`;
      parent.appendChild(svg);
      return svg;
    };

    const getTool = () => useToolStore.getState().activeTool;

    function hitTestAndSelect(mouseX: number, mouseY: number, clientX: number, clientY: number, shiftKey: boolean, ctrlKey: boolean, metaKey: boolean): boolean {
      const cm = cmRef.current;
      const ht = htRef.current;
      if (!cm || !ht) return false;
      const compState = useCompositionStore.getState();
      const compId = compState.activeCompositionId;
      if (!compId) return false;
      const comp = compState.compositions.find((c) => c.id === compId);
      if (!comp) return false;

      // FIX: sort by zIndex descending so topmost layer is tested first
      const visibleIds = [...comp.layers]
        .filter((l) => l.visible && !l.locked)
        .sort((a, b) => b.zIndex - a.zIndex)
        .map((l) => l.id);

      const hit = ht.hitTest(mouseX, mouseY, visibleIds);
      if (!hit) return false;

      const selStore = useSelectionStore.getState();
      const isAlreadySelected = selStore.isSelected(hit.layerId);

      // Multi-select behavior:
      // - Shift/Ctrl/Cmd + click on selected layer → remove from selection
      // - Shift/Ctrl/Cmd + click on unselected layer → add to selection
      // - Click on already-selected layer → preserve selection (for multi-drag)
      // - Click on unselected layer → replace selection
      if (shiftKey || ctrlKey || metaKey) {
        if (isAlreadySelected) {
          selStore.deselect(hit.layerId);
        } else {
          selStore.select({ type: 'layer', id: hit.layerId, compositionId: compId }, true);
        }
      } else if (!isAlreadySelected) {
        selStore.select({ type: 'layer', id: hit.layerId, compositionId: compId });
      }
      // If already selected and no modifier, keep current selection intact (multi-drag)

      // Only start modal transform if there are selected layers
      const remainingSelected = useSelectionStore.getState().getSelectedIds();
      if (remainingSelected.length === 0) return true;

      if (mtRef.current) {
        const tool = getTool();
        const mode = tool === (TOOLS.ROTATE as ToolId) ? 'rotate'
          : tool === (TOOLS.SCALE as ToolId) ? 'scale'
          : 'grab';
        mtRef.current.start(mode);
        mtRef.current.startMouseScreen = { x: clientX, y: clientY };
        mouseMoved.current = false;
        lastMouse.current = { x: clientX, y: clientY };
        attachDocListeners();
      }

      return true;
    }

    const container = el.parentElement;

    // Handle bounding box handles and gizmo clicks
    const gizmoMouseDown = (e: MouseEvent) => {
      const target = e.target as SVGElement | null;
      if (!target) return;
      const handleAttr = target.getAttribute('data-handle');
      const gizmoAttr = target.getAttribute('data-gizmo');
      if (!handleAttr && !gizmoAttr) return;
      if (!mtRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      let mode: 'grab' | 'rotate' | 'scale';
      if (handleAttr === 'rotate' || gizmoAttr?.startsWith('rotate')) mode = 'rotate';
      else if (gizmoAttr?.startsWith('scale') || handleAttr) mode = 'scale';
      else mode = 'grab';

      mtRef.current.start(mode);
      mtRef.current.startMouseScreen = { x: e.clientX, y: e.clientY };

      // Compute handle pivot (opposite corner/edge in world space)
      if (handleAttr && handleAttr !== 'rotate' && cmRef.current) {
        const compState = useCompositionStore.getState();
        const compId = compState.activeCompositionId;
        if (compId) {
          const comp = compState.compositions.find((c) => c.id === compId);
          const selectedIds = useSelectionStore.getState().getSelectedIds();
          if (comp && selectedIds.length > 0) {
            const layer = comp.layers.find((l) => l.id === selectedIds[0]);
            if (layer) {
              const pos = layer.transform.position;
              const sc = layer.transform.scale;
              let halfW = 50, halfH = 50;
              const d = layer.data as any;
              if (d?.width !== undefined) {
                halfW = (d.width / 2) * (sc.x / 100);
                halfH = (d.height / 2) * (sc.y / 100);
              }
              const rad = (layer.transform.rotation || 0) * (Math.PI / 180);
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              let px = 0, py = 0;
              if (handleAttr === 'tl') { px = halfW; py = -halfH; }
              else if (handleAttr === 'tr') { px = -halfW; py = -halfH; }
              else if (handleAttr === 'br') { px = -halfW; py = halfH; }
              else if (handleAttr === 'bl') { px = halfW; py = halfH; }
              else if (handleAttr === 'top') { py = -halfH; }
              else if (handleAttr === 'bottom') { py = halfH; }
              else if (handleAttr === 'left') { px = halfW; }
              else if (handleAttr === 'right') { px = -halfW; }
              const rx = px * cos - py * sin;
              const ry = px * sin + py * cos;
              mtRef.current.setHandlePivotWorld({ x: pos.x + rx, y: pos.y + ry });
            }
          }
        }
      }

      // Axis constraints from gizmo
      if (gizmoAttr === 'move-x' || gizmoAttr === 'scale-x') mtRef.current.setAxisLock('x');
      else if (gizmoAttr === 'move-y' || gizmoAttr === 'scale-y') mtRef.current.setAxisLock('y');
      else if (gizmoAttr === 'move-z') {
        // Z arrow: start grab, route vertical delta to transform3D.position.z
        mtRef.current.setAxisLock('y');
        (window as any).__moveZActive = true;
        (window as any).__3DAxisLock = 'z';
        mtRef.current.setAxisLock('y');
        mouseMoved.current = false;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        attachDocListeners();
        return;
        mouseMoved.current = false;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        attachDocListeners();
        return;
      }

      // Aspect lock for corner handles and uniform scale
      if (gizmoAttr === 'scale-uniform' ||
          handleAttr === 'tl' || handleAttr === 'tr' ||
          handleAttr === 'br' || handleAttr === 'bl') {
        mtRef.current.setAspectLock(true);
      }

      // Edge handles: single axis
      if (handleAttr === 'top' || handleAttr === 'bottom') mtRef.current.setAxisLock('y');
      if (handleAttr === 'left' || handleAttr === 'right') mtRef.current.setAxisLock('x');

      mouseMoved.current = false;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      attachDocListeners();
    };

    // Document-level mouseup to reset cursor if released outside canvas during pan
    let panDocMouseup: ((e: MouseEvent) => void) | null = null;
    function attachPanDocMouseup(): void {
      removePanDocMouseup();
      panDocMouseup = () => {
        if (isPanning.current) {
          isPanning.current = false;
          document.body.style.cursor = '';
        }
        removePanDocMouseup();
      };
      document.addEventListener('mouseup', panDocMouseup);
    }
    function removePanDocMouseup(): void {
      if (panDocMouseup) {
        document.removeEventListener('mouseup', panDocMouseup);
        panDocMouseup = null;
      }
    }

    // ── FLY MODE: Right mouse down → activate fly mode (only in 3D perspective) ──
    const onRightMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      const cs = useCompositionStore.getState();
      const compId = cs.activeCompositionId;
      const comp = compId ? cs.compositions.find(c => c.id === compId) : null;
      if (!comp?.perspective3D) return;
      // Don't fly if a modal transform is active
      if (mtRef.current?.active) return;
      // Block right-mouse fly in Active Camera unless "Move with View" is enabled
      if (!(window as any).__freeViewMode && !(comp?.cameraMoveWithView ?? false)) {
        e.preventDefault();
        return; // Camera is locked in Active Camera view
      }

      e.preventDefault();
      flyState.current.active = true;
      flyState.current.speed = comp.flySpeed ?? 500;
      document.body.style.cursor = 'crosshair';

      // Reset keys on new fly session
      flyState.current.keys.clear();

      // Start the fly RAF loop if not already running
      if (!flyState.current.animId) {
        flyLoopRef.current();
      }

      const onMove = (ev: MouseEvent) => {
        if (!flyState.current.active) return;
        // Mouse look: rotate the free view camera
        const sensitivity = 0.003;
        const isFree = !!(window as any).__freeViewMode;
        if (isFree) {
          const curX = (window as any).__freeOrbitX ?? 0.3;
          const curY = (window as any).__freeOrbitY ?? 0.5;
          (window as any).__freeOrbitX = Math.max(-1.2, Math.min(1.2, curX - ev.movementY * sensitivity));
          (window as any).__freeOrbitY = curY + ev.movementX * sensitivity;
        } else {
          // Active camera: orbit with mouse
          const curRotX = comp.cameraRotationX ?? 0;
          const curRotY = comp.cameraRotationY ?? 0;
          cs.updateComposition(comp.id, {
            cameraRotationX: Math.max(-1.2, Math.min(1.2, curRotX - ev.movementY * sensitivity)),
            cameraRotationY: curRotY + ev.movementX * sensitivity,
          });
        }
        requestRender?.();
      };

      const onUp = (ev: MouseEvent) => {
        if (ev.button === 2) {
          flyState.current.active = false;
          flyState.current.keys.clear();
          document.body.style.cursor = '';
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          // RAF loop will stop itself on next tick since active=false
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    const onMouseDown = (e: MouseEvent) => {
      // Pen edit mode: Alt+click on path segment inserts anchor
      const penStoreEarly = usePenToolStore.getState();
      if (penStoreEarly.mode === 'edit' && e.altKey && e.button === 0) {
        const compState = useCompositionStore.getState();
        const compId = compState.activeCompositionId;
        const layerId = penStoreEarly.editingLayerId;
        if (compId && layerId && cmRef.current) {
          const comp = compState.compositions.find(c => c.id === compId);
          const layer = comp?.layers.find(l => l.id === layerId);
          if (layer?.type === 'shape') {
            const data = layer.data as any;
            if (data?.type === 'path') {
              const rectEl = el.getBoundingClientRect();
              const mx = e.clientX - rectEl.left;
              const my = e.clientY - rectEl.top;
              const world = cmRef.current.screenToWorld(mx, my);
              const sx = layer.transform.scale.x / 100;
              const sy = layer.transform.scale.y / 100;
              const rad = -(layer.transform.rotation || 0) * (Math.PI / 180);
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              // Transform from world to local: subtract position, rotate by -rotation, divide by scale
              const dx = world.x - layer.transform.position.x;
              const dy = world.y - layer.transform.position.y;
              const lx = (dx * cos - dy * sin) / sx;
              const ly = (dx * sin + dy * cos) / sy;
              // Find nearest segment
              const anchors = data.commands
                .filter((c: any) => c.type === 'M' || c.type === 'L' || c.type === 'C' || c.type === 'Q')
                .map((c: any) => {
                  const p = c.points;
                  if (c.type === 'C') return { x: p[4], y: p[5] };
                  if (c.type === 'Q') return { x: p[2], y: p[3] };
                  return { x: p[0], y: p[1] };
                });
              let bestIdx = -1;
              let bestDist = Infinity;
              for (let i = 0; i < anchors.length - 1; i++) {
                const a = anchors[i], b = anchors[i + 1];
                const d = distToSegment(lx, ly, a.x, a.y, b.x, b.y);
                if (d.dist < bestDist) { bestDist = d.dist; bestIdx = i; }
              }
              if (bestIdx !== -1 && bestDist < 20) {
                const a = anchors[bestIdx], b = anchors[bestIdx + 1];
                const seg = distToSegment(lx, ly, a.x, a.y, b.x, b.y);
                usePenToolStore.getState().insertAnchor(layerId, bestIdx, seg.t);
                e.preventDefault();
                e.stopPropagation();
                return;
              }
            }
          }
        }
      }

      // Middle mouse = orbit/pan in perspective mode, pan in 2D
      if (e.button === 1) {
        const cs = useCompositionStore.getState();
        const compId = cs.activeCompositionId;
        const comp = compId ? cs.compositions.find(c => c.id === compId) : null;
        const is3D = comp?.perspective3D;

        if (is3D) {
          const isFree = !!(window as any).__freeViewMode;

          if (isFree) {
            // ── Free View: orbit the free camera around the scene ──
            const startX = e.clientX;
            const startY = e.clientY;
            const startOrbitX = (window as any).__freeOrbitX ?? 0.3;
            const startOrbitY = (window as any).__freeOrbitY ?? 0.5;

            document.body.style.cursor = 'crosshair';
            const onMove = (ev: MouseEvent) => {
              const dx = ev.clientX - startX;
              const dy = ev.clientY - startY;
              (window as any).__freeOrbitY = startOrbitY - dx * 0.005;
              (window as any).__freeOrbitX = Math.max(-1.2, Math.min(1.2,
                startOrbitX - dy * 0.005));
              requestRender?.();
            };
            const onUp = () => {
              document.body.style.cursor = '';
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          } else {
            // ── Active Camera: orbit/pan the comp camera with auto-keyframing ──
            // Block camera movement unless "Move with View" is enabled
            if (!(comp?.cameraMoveWithView ?? false)) {
              e.preventDefault();
              return; // Camera is locked in Active Camera view
            }
            const startX = e.clientX;
            const startY = e.clientY;
            const startRotX = comp?.cameraRotationX ?? 0;
            const startRotY = comp?.cameraRotationY ?? 0;
            const startPosX = comp?.cameraPositionX ?? 0;
            const startPosY = comp?.cameraPositionY ?? 0;
            const startZ = comp?.cameraPositionZ ?? 1000;
            const isPan = e.shiftKey;
            const zoom = cmRef.current?.zoom ?? 1;

            // Invert settings
            const invOrbit = comp?.cameraInvertOrbit ?? false;
            const invPan = comp?.cameraInvertPan ?? false;
            const invZoom = comp?.cameraInvertZoom ?? false;

            document.body.style.cursor = isPan ? 'grabbing' : 'crosshair';

            const onMove = (ev: MouseEvent) => {
              const dx = ev.clientX - startX;
              const dy = ev.clientY - startY;
              if (!compId) return;

              const cs = useCompositionStore.getState();
              const autoKey = useTimelineStore.getState().autoKey;

              if (isPan) {
                // Default: drag right = camera moves right, drag down = camera moves down (screen coords)
                const panDir = invPan ? -1 : 1;
                const newX = startPosX + (dx / zoom) * panDir;
                const newY = startPosY + (dy / zoom) * panDir;
                cs.updateComposition(compId, {
                  cameraPositionX: newX,
                  cameraPositionY: newY,
                });
                if (autoKey) {
                  autoKeyCameraProp('camera.positionX', newX);
                  autoKeyCameraProp('camera.positionY', newY);
                }
              } else {
                // Orbit: drag right = camera rotates right (yaw+), drag up = camera tilts up (pitch+)
                // Only invert Y-axis (pitch/up-down), not X-axis (yaw/left-right)
                const invY = invOrbit ? -1 : 1;
                const newRotY = startRotY + dx * 0.005;
                const newRotX = Math.max(-1.2, Math.min(1.2, startRotX - (dy * 0.005) * invY));
                cs.updateComposition(compId, {
                  cameraRotationY: newRotY,
                  cameraRotationX: newRotX,
                });
                if (autoKey) {
                  autoKeyCameraProp('camera.rotationY', newRotY);
                  autoKeyCameraProp('camera.rotationX', newRotX);
                }
              }
              requestRender?.();
            };
            const onUp = () => {
              document.body.style.cursor = '';
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }
        } else {
          // 2D pan
          isPanning.current = true;
          lastMouse.current = { x: e.clientX, y: e.clientY };
          document.body.style.cursor = 'grabbing';
          attachPanDocMouseup();
        }
        e.preventDefault();
        return;
      }
      if (e.button !== 0) return;

      const tool = getTool();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (tool === (TOOLS.HAND as ToolId)) {
        isPanning.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        document.body.style.cursor = 'grabbing';
        attachPanDocMouseup();
        e.preventDefault();
        return;
      }

      if (tool === (TOOLS.ZOOM as ToolId)) {
        if (cmRef.current) {
          cmRef.current.setZoom(e.altKey ? cmRef.current.zoom / 1.5 : cmRef.current.zoom * 1.5);
          requestRender?.();
        }
        return;
      }

      if (mtRef.current?.active) {
        lastMouse.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (tool === (TOOLS.PEN as ToolId)) {
        const cm = cmRef.current;
        if (!cm) return;
        e.preventDefault();
        e.stopPropagation();
        const world = cm.screenToWorld(mouseX, mouseY);
        const penStore = usePenToolStore.getState();

        // *** ADD THIS BLOCK: Set mask target if a layer is selected ***
        const selIds = useSelectionStore.getState().getSelectedIds();
        if (selIds.length === 1) {
          (window as any).__maskTargetLayerId = selIds[0];
        } else {
          delete (window as any).__maskTargetLayerId;
        }
        // *** END ADD ***

        // If not drawing, start a new path
        if (penStore.mode !== 'draw') {
          penStore.startDrawing();
        }

        // Check if clicking near the first anchor to close
        const firstAnchor = penStore.drawingCommands.length > 0
          ? penStore.drawingCommands[0].points
          : null;
        if (firstAnchor && penStore.drawingCommands.length > 2) {
          const first = cm.worldToScreen(firstAnchor[0], firstAnchor[1]);
          const dist = Math.hypot(first.x - mouseX, first.y - mouseY);
          if (dist < 10) {
            const cmds = penStore.closePath();
            if (cmds) finalizePenPath(cmds);
            return;
          }
        }

        // Add anchor. If user drags, we'll set an out-handle in mousemove.
        const startClientX = e.clientX;
        const startClientY = e.clientY;

        penStore.addAnchor(world.x, world.y);

        const mm = (ev: MouseEvent) => {
          const dx = ev.clientX - startClientX;
          const dy = ev.clientY - startClientY;
          if (Math.hypot(dx, dy) > 3) {
            const handleWorld = cm.screenToWorld(ev.clientX - el.getBoundingClientRect().left, ev.clientY - el.getBoundingClientRect().top);
            usePenToolStore.getState().updateLastHandle(handleWorld.x, handleWorld.y);
            requestRender?.();
          }
        };
        const mu = () => {
          document.removeEventListener('mousemove', mm);
          document.removeEventListener('mouseup', mu);
        };
        document.addEventListener('mousemove', mm);
        document.addEventListener('mouseup', mu);
        return;
      }

      // MASK tool: treat same as PEN but always creates mask on selected layer
      if (tool === (TOOLS.MASK as ToolId)) {
        const cm = cmRef.current;
        if (!cm) return;
        e.preventDefault();
        e.stopPropagation();
        const world = cm.screenToWorld(mouseX, mouseY);
        const penStore = usePenToolStore.getState();

        // Set mask target
        const selIds = useSelectionStore.getState().getSelectedIds();
        if (selIds.length === 1) {
          (window as any).__maskTargetLayerId = selIds[0];
        } else {
          return; // No layer selected, can't create mask
        }

        if (penStore.mode !== 'draw') {
          penStore.startDrawing();
        }

        // Check if clicking near the first anchor to close
        const firstAnchor = penStore.drawingCommands.length > 0
          ? penStore.drawingCommands[0].points
          : null;
        if (firstAnchor && penStore.drawingCommands.length > 2) {
          const first = cm.worldToScreen(firstAnchor[0], firstAnchor[1]);
          const dist = Math.hypot(first.x - mouseX, first.y - mouseY);
          if (dist < 10) {
            const cmds = penStore.closePath();
            if (cmds) finalizePenPath(cmds);
            return;
          }
        }

        const startClientX = e.clientX;
        const startClientY = e.clientY;

        penStore.addAnchor(world.x, world.y);

        const mm = (ev: MouseEvent) => {
          const dx = ev.clientX - startClientX;
          const dy = ev.clientY - startClientY;
          if (Math.hypot(dx, dy) > 3) {
            const handleWorld = cm.screenToWorld(ev.clientX - el.getBoundingClientRect().left, ev.clientY - el.getBoundingClientRect().top);
            usePenToolStore.getState().updateLastHandle(handleWorld.x, handleWorld.y);
            requestRender?.();
          }
        };
        const mu = () => {
          document.removeEventListener('mousemove', mm);
          document.removeEventListener('mouseup', mu);
        };
        document.addEventListener('mousemove', mm);
        document.addEventListener('mouseup', mu);
        return;
      }

      if (tool === (TOOLS.TEXT as ToolId)) {
        const cm = cmRef.current;
        if (!cm) return;
        const world = cm.screenToWorld(mouseX, mouseY);
        const compState = useCompositionStore.getState();
        const compId = compState.activeCompositionId;
        if (!compId) return;
        const comp = compState.compositions.find((c) => c.id === compId);
        if (!comp) return;
        const count = comp.layers.filter((l) => l.type === 'text').length + 1;
        const base = createDefaultLayer('text', `Text ${count}`);
        const compEndFrame = Math.floor(comp.duration * comp.fps);
        const layer: Layer = {
          ...base, id: genId(), zIndex: comp.layers.length + 1,
          endFrame: compEndFrame,
          transform: { position: { x: world.x, y: world.y }, scale: { x: 100, y: 100 }, rotation: 0, anchorPoint: { x: 0, y: 0 } },
          data: { text: 'Text', fontFamily: 'Inter', fontSize: 48, fontWeight: 400, color: '#000000', lineHeight: 1.2, letterSpacing: 0, alignment: 'center' as const },
        };
        useCompositionStore.getState().addLayer(compId, layer);
        useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
        return;
      }

      // Gradient tool: do nothing on empty-space click (handles have their own listeners)
      if (tool === (TOOLS.GRADIENT as ToolId)) {
        // Still let user click layers to select
        if (hitTestAndSelect(mouseX, mouseY, e.clientX, e.clientY, e.shiftKey, e.ctrlKey, e.metaKey)) {
          // But immediately cancel modal transform — gradient tool doesn't move layers
          if (mtRef.current?.active) mtRef.current.cancel();
        }
        return;
      }

      if (tool === (TOOLS.SHAPE_RECT as ToolId) || tool === (TOOLS.SHAPE_ELLIPSE as ToolId) || tool === (TOOLS.SHAPE_POLYGON as ToolId)) {
        boxStart.current = { x: mouseX, y: mouseY };
        isDrawing.current = true;
        drawSvg = createOverlay('22');
        return;
      }

      // Pick Whip tool — drag from child to parent
      if (tool === (TOOLS.PICK_WHIP as ToolId) && cmRef.current) {
        const cm = cmRef.current;
        const ht = htRef.current;
        if (!ht) return;

        const compState = useCompositionStore.getState();
        const compId = compState.activeCompositionId;
        if (!compId) return;
        const comp = compState.compositions.find((c) => c.id === compId);
        if (!comp) return;

        // Find the layer under cursor to start the whip from
        const visibleIds = [...comp.layers]
          .filter((l) => l.visible && !l.locked)
          .sort((a, b) => b.zIndex - a.zIndex)
          .map((l) => l.id);
        const hit = ht.hitTest(mouseX, mouseY, visibleIds);
        if (!hit) return;

        e.preventDefault();
        e.stopPropagation();
        document.body.style.cursor = 'crosshair';

        // Start pick whip from this layer's screen position
        const childLayer = comp.layers.find((l) => l.id === hit.layerId);
        if (!childLayer) return;
        const childScreen = cm.worldToScreen(childLayer.transform.position.x, childLayer.transform.position.y);

        setPickWhipState({
          active: true,
          childId: hit.layerId,
          startX: childScreen.x,
          startY: childScreen.y,
          currentX: mouseX,
          currentY: mouseY,
          hoveredParentId: null,
        });
        requestRender?.();

        const whipMove = (ev: MouseEvent) => {
          const r = el.getBoundingClientRect();
          const mx = ev.clientX - r.left;
          const my = ev.clientY - r.top;

          // Hit-test to find potential parent under cursor
          let hoveredId: string | null = null;
          const hit2 = ht.hitTest(mx, my, visibleIds.filter((id) => id !== hit.layerId));
          if (hit2) hoveredId = hit2.layerId;

          setPickWhipState({ currentX: mx, currentY: my, hoveredParentId: hoveredId });
          requestRender?.();
        };

        const whipUp = (ev: MouseEvent) => {
          document.removeEventListener('mousemove', whipMove);
          document.removeEventListener('mouseup', whipUp);
          document.body.style.cursor = '';

          const state = getPickWhipState();
          if (state.hoveredParentId && state.hoveredParentId !== state.childId) {
            // Validate: don't allow circular parenting
            const cs = useCompositionStore.getState();
            const c = cs.compositions.find((c) => c.id === compId);
            if (c) {
              // Check for circular reference
              let current = state.hoveredParentId;
              let isCircular = false;
              while (current) {
                if (current === state.childId) { isCircular = true; break; }
                const layer = c.layers.find((l) => l.id === current);
                current = layer?.parentId ?? null;
              }
              if (!isCircular) {
                cs.updateLayer(compId, state.childId, { parentId: state.hoveredParentId });
                useNotificationStore.getState().addNotification({
                  type: 'success', message: `Parented to ${c.layers.find((l) => l.id === state.hoveredParentId)?.name ?? 'layer'}`,
                  autoDismiss: 2000,
                });
              } else {
                useNotificationStore.getState().addNotification({
                  type: 'warning', message: 'Cannot parent — circular reference detected',
                  autoDismiss: 2500,
                });
              }
            }
          }
          clearPickWhip();
          requestRender?.();
        };

        document.addEventListener('mousemove', whipMove);
        document.addEventListener('mouseup', whipUp);
        return;
      }

      // Alt+drag = Motion Sketch
      if (e.altKey && cmRef.current) {
        const cam = cmRef.current;
        const started = motionSketch.start((sx: number, sy: number) => cam.screenToWorld(sx, sy));
        if (started) {
          e.preventDefault();
          e.stopPropagation();
          document.body.style.cursor = 'crosshair';
          motionSketch.addSample(mouseX, mouseY);
          const mm = (ev: MouseEvent) => {
            const r = el.getBoundingClientRect();
            motionSketch.addSample(ev.clientX - r.left, ev.clientY - r.top);
            requestRender?.();
          };
          const mu = () => {
            document.body.style.cursor = '';
            motionSketch.stop();
            document.removeEventListener('mousemove', mm);
            document.removeEventListener('mouseup', mu);
            requestRender?.();
          };
          document.addEventListener('mousemove', mm);
          document.addEventListener('mouseup', mu);
          return;
        }
      }

      // MOVE/ROTATE/SCALE/SELECT: hit test first
      if (hitTestAndSelect(mouseX, mouseY, e.clientX, e.clientY, e.shiftKey, e.ctrlKey, e.metaKey)) return;

      // No hit → box select
      isBoxSelecting.current = true;
      boxStart.current = { x: mouseX, y: mouseY };
      boxSvg = createOverlay('20');
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        useSelectionStore.getState().deselectAll();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (mtRef.current?.active) return;

      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (isDrawing.current && cmRef.current) {
        const ns = 'http://www.w3.org/2000/svg';
        const dx = mx - boxStart.current.x;
        const dy = my - boxStart.current.y;
        const altHeld = e.altKey;
        const shiftHeld = e.shiftKey;

        let drawW: number, drawH: number, drawX: number, drawY: number;

        if (altHeld) {
          // Alt: draw from center outward
          let halfW = Math.abs(dx);
          let halfH = Math.abs(dy);
          if (shiftHeld) { const s = Math.max(halfW, halfH); halfW = s; halfH = s; }
          drawW = halfW * 2;
          drawH = halfH * 2;
          drawX = boxStart.current.x - halfW;
          drawY = boxStart.current.y - halfH;
        } else {
          // Normal: draw from corner to corner
          let w = Math.abs(dx);
          let h = Math.abs(dy);
          if (shiftHeld) { const s = Math.max(w, h); w = s; h = s; }
          drawW = w;
          drawH = h;
          drawX = dx >= 0 ? boxStart.current.x : boxStart.current.x - w;
          drawY = dy >= 0 ? boxStart.current.y : boxStart.current.y - h;
        }

        if (drawSvg) {
          drawSvg.innerHTML = '';
          // Black shadow for visibility
          const shadow = document.createElementNS(ns, 'rect');
          shadow.setAttribute('x', String(drawX)); shadow.setAttribute('y', String(drawY));
          shadow.setAttribute('width', String(drawW)); shadow.setAttribute('height', String(drawH));
          shadow.setAttribute('fill', 'rgba(0,0,0,0.1)');
          shadow.setAttribute('stroke', '#000000');
          shadow.setAttribute('stroke-width', '1');
          drawSvg.appendChild(shadow);
          // Accent preview
          const shape = document.createElementNS(ns, 'rect');
          shape.setAttribute('x', String(drawX)); shape.setAttribute('y', String(drawY));
          shape.setAttribute('width', String(drawW)); shape.setAttribute('height', String(drawH));
          shape.setAttribute('fill', 'rgba(71,114,179,0.2)');
          shape.setAttribute('stroke', 'var(--color-accent)');
          shape.setAttribute('stroke-width', '1.5');
          drawSvg.appendChild(shape);
          // Center crosshair when Alt
          if (altHeld) {
            const ch = document.createElementNS(ns, 'line');
            ch.setAttribute('x1', String(boxStart.current.x - 6)); ch.setAttribute('y1', String(boxStart.current.y));
            ch.setAttribute('x2', String(boxStart.current.x + 6)); ch.setAttribute('y2', String(boxStart.current.y));
            ch.setAttribute('stroke', 'var(--color-accent)'); ch.setAttribute('stroke-width', '1');
            drawSvg.appendChild(ch);
            const cv = document.createElementNS(ns, 'line');
            cv.setAttribute('x1', String(boxStart.current.x)); cv.setAttribute('y1', String(boxStart.current.y - 6));
            cv.setAttribute('x2', String(boxStart.current.x)); cv.setAttribute('y2', String(boxStart.current.y + 6));
            cv.setAttribute('stroke', 'var(--color-accent)'); cv.setAttribute('stroke-width', '1');
            drawSvg.appendChild(cv);
          }
          // Dimension label
          const worldPP = 1 / cmRef.current.zoom;
          const labelX = drawX + drawW + 6;
          const labelY = drawY + drawH / 2;
          const worldW = Math.round(drawW * worldPP);
          const worldH = Math.round(drawH * worldPP);
          const label = document.createElementNS(ns, 'text');
          label.setAttribute('x', String(Math.min(labelX, (el.clientWidth || 800) - 80)));
          label.setAttribute('y', String(Math.max(labelY, 12)));
          label.setAttribute('fill', 'var(--color-text-secondary)');
          label.setAttribute('font-size', '10');
          label.setAttribute('font-family', 'monospace');
          label.textContent = `${worldW} × ${worldH}`;
          drawSvg.appendChild(label);
        }
        return;
      }

      if (isPanning.current && cmRef.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        // FIX: pan in screen space — dx right = world left (negative pan X in world)
        // CameraManager.pan adds to _panX/_panY, which offset the camera frustum.
        // Moving camera left means panning scene right, so invert dx.
        // For Y: screen down = world up in Y-up coords, so invert dy too.
        const worldPerPixel = 1 / cmRef.current.zoom;
        cmRef.current.pan(-dx * worldPerPixel, dy * worldPerPixel);
        requestRender?.();
        return;
      }

      if (isBoxSelecting.current && boxSvg && cmRef.current) {
        const x = Math.min(boxStart.current.x, mx);
        const y = Math.min(boxStart.current.y, my);
        const w = Math.abs(mx - boxStart.current.x);
        const h = Math.abs(my - boxStart.current.y);
        boxSvg.innerHTML = '';
        const ns = 'http://www.w3.org/2000/svg';
        const rectEl = document.createElementNS(ns, 'rect');
        rectEl.setAttribute('x', String(x)); rectEl.setAttribute('y', String(y));
        rectEl.setAttribute('width', String(w)); rectEl.setAttribute('height', String(h));
        rectEl.setAttribute('fill', 'rgba(71,114,179,0.15)');
        rectEl.setAttribute('stroke', 'var(--color-accent)');
        rectEl.setAttribute('stroke-width', '1');
        rectEl.setAttribute('stroke-dasharray', '4 2');
        boxSvg.appendChild(rectEl);

        const compState = useCompositionStore.getState();
        const compId = compState.activeCompositionId;
        if (compId && cmRef.current) {
          const comp = compState.compositions.find((c) => c.id === compId);
          if (comp) {
            const worldMin = cmRef.current.screenToWorld(x, y + h);
            const worldMax = cmRef.current.screenToWorld(x + w, y);
            const intersecting = comp.layers.filter((l) => {
              const t = l.transform;
              return (
                t.position.x > worldMin.x && t.position.x < worldMax.x &&
                t.position.y > worldMin.y && t.position.y < worldMax.y
              );
            });
            useSelectionStore.getState().replaceSelection(intersecting.map((l) => l.id), compId);
          }
        }
      }
    };

    const onMouseUp = async (e: MouseEvent) => {
      if (e.button === 1) {
        isPanning.current = false;
        document.body.style.cursor = '';
        return;
      }
      if (e.button !== 0) return;

      isPanning.current = false;
      document.body.style.cursor = '';

      if (isDrawing.current) {
        isDrawing.current = false;
        if (drawSvg?.parentElement) drawSvg.parentElement.removeChild(drawSvg);
        drawSvg = null;

        const tool = getTool();
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const dx = mx - boxStart.current.x;
        const dy = my - boxStart.current.y;
        const dragDist = Math.hypot(dx, dy);
        const altHeld = e.altKey;
        const shiftHeld = e.shiftKey;

        const compState = useCompositionStore.getState();
        const compId = compState.activeCompositionId;
        if (!compId || !cmRef.current) return;
        const comp = compState.compositions.find((c) => c.id === compId);
        if (!comp) return;

        const worldPerPixel = 1 / cmRef.current.zoom;

        let worldW: number, worldH: number, centerWorld: { x: number; y: number };

        if (dragDist < 5) {
          const clickWorld = cmRef.current.screenToWorld(boxStart.current.x, boxStart.current.y);
          centerWorld = { x: clickWorld.x, y: clickWorld.y };
          worldW = 200; worldH = 150;
        } else if (altHeld) {
          centerWorld = cmRef.current.screenToWorld(boxStart.current.x, boxStart.current.y);
          let halfW = Math.abs(dx) * worldPerPixel;
          let halfH = Math.abs(dy) * worldPerPixel;
          if (shiftHeld) { const s = Math.max(halfW, halfH); halfW = s; halfH = s; }
          worldW = halfW * 2; worldH = halfH * 2;
        } else {
          let dw = Math.abs(dx), dh = Math.abs(dy);
          if (shiftHeld) { const s = Math.max(dw, dh); dw = s; dh = s; }
          const startWorld = cmRef.current.screenToWorld(boxStart.current.x, boxStart.current.y);
          const endWorld = cmRef.current.screenToWorld(
            boxStart.current.x + (dx >= 0 ? dw : -dw),
            boxStart.current.y + (dy >= 0 ? dh : -dh),
          );
          worldW = Math.abs(endWorld.x - startWorld.x);
          worldH = Math.abs(endWorld.y - startWorld.y);
          centerWorld = { x: (startWorld.x + endWorld.x) / 2, y: (startWorld.y + endWorld.y) / 2 };
        }

        // *** ADD: Create mask instead of shape if a layer is selected with MASK or shape tool ***
        const isMaskTool = tool === (TOOLS.MASK as ToolId);
        const selectedLayerIds = useSelectionStore.getState().getSelectedIds();
        if (isMaskTool || (selectedLayerIds.length === 1 && (
          tool === (TOOLS.SHAPE_RECT as ToolId) || 
          tool === (TOOLS.SHAPE_ELLIPSE as ToolId)
        ))) {
          const targetLayerId = selectedLayerIds[0];
          const targetLayer = comp.layers.find(l => l.id === targetLayerId);
          if (targetLayer) {
            // Convert world center to layer-local coords
            const localX = centerWorld.x - targetLayer.transform.position.x;
            const localY = centerWorld.y - targetLayer.transform.position.y;

            const { useMaskStore } = await import('../../../../state/maskStore');

            if (tool === (TOOLS.SHAPE_ELLIPSE as ToolId) || tool === (TOOLS.MASK as ToolId)) {
              // For mask tool, still use rect for now (pen tool handles freeform)
              useMaskStore.getState().addRectMask(targetLayerId, Math.round(worldW), Math.round(worldH));
            } else {
              useMaskStore.getState().addRectMask(targetLayerId, Math.round(worldW), Math.round(worldH));
            }

            // Update the mask's commands to be offset to the drawn location
            const masks = useMaskStore.getState().getMasksForLayer(targetLayerId);
            const newMask = masks[masks.length - 1];
            if (newMask) {
              const offsetCmds = newMask.commands.map(c => ({
                ...c,
                points: [...c.points]
              }));
              // Offset the first point's x,y by localX,localY
              if (offsetCmds.length > 0 && offsetCmds[0].type === 'M') {
                const dx = localX - 0;
                const dy = localY - 0;
                for (const cmd of offsetCmds) {
                  for (let i = 0; i < cmd.points.length; i += 2) {
                    cmd.points[i] += dx;
                    cmd.points[i + 1] += dy;
                  }
                }
              }
              useMaskStore.getState().updateMaskCommands(targetLayerId, newMask.id, offsetCmds);
            }

            // Switch back to select tool if using MASK tool
            if (isMaskTool) {
              useToolStore.getState().setActiveTool('select' as any);
            }
            return;
          }
        }
        // *** END ADD ***

        // Read active shape preset from tool store
        const presetId = useToolStore.getState().toolSettings.currentShapePresetId ?? 'rectangle';
        const { defaultShapeFill, defaultShapeStroke } = await import('../../../../types/layer');
        const { getPresetById, defaultParamsFor } = await import('../../../../shapes/presets');
        const preset = getPresetById(presetId);
        const params = preset ? defaultParamsFor(preset) : {};
        const count = comp.layers.filter(l => l.type === 'shape').length + 1;

        const W = Math.max(1, Math.round(worldW));
        const H = Math.max(1, Math.round(worldH));

        // Choose base shape type based on preset
        let baseData: any;
        if (presetId === 'ellipse' || presetId === 'circle') {
          baseData = { type: 'ellipse', radiusX: W / 2, radiusY: H / 2 };
        } else {
          baseData = { type: 'rectangle', width: W, height: H, borderRadius: 0 };
        }
        baseData.presetId = presetId;
        baseData.presetParams = params;
        baseData.fill = defaultShapeFill();
        baseData.stroke = defaultShapeStroke();

        const base = createDefaultLayer('shape', `${preset?.label ?? 'Shape'} ${count}`);
        const compEndFrame = Math.floor(comp.duration * comp.fps);
        const layer: Layer = {
          ...base, id: genId(),
          zIndex: comp.layers.length + 1,
          endFrame: compEndFrame,
          transform: { position: centerWorld, scale: { x: 100, y: 100 }, rotation: 0, anchorPoint: { x: 0, y: 0 } },
          data: baseData,
        };
        useCompositionStore.getState().addLayer(compId, layer);
        useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
        return;
      }

      if (isBoxSelecting.current) {
        isBoxSelecting.current = false;
        if (boxSvg?.parentElement) boxSvg.parentElement.removeChild(boxSvg);
        boxSvg = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!cmRef.current) return;
      e.preventDefault();

      // Free View: scroll moves camera forward/backward along look direction
      const isFree = !!(window as any).__freeViewMode;
      if (isFree) {
        const yaw = (window as any).__freeOrbitY ?? 0.5;
        const pitch = (window as any).__freeOrbitX ?? 0.3;
        const speed = 200; // pixels per scroll tick
        const dir = e.deltaY < 0 ? 1 : -1;
        // Move along the camera's forward direction
        const fwdX = Math.sin(yaw) * Math.cos(pitch) * speed * dir;
        const fwdY = Math.sin(pitch) * speed * dir;
        const fwdZ = Math.cos(yaw) * Math.cos(pitch) * speed * dir;
        (window as any).__freeCamX = ((window as any).__freeCamX ?? 0) + fwdX;
        (window as any).__freeCamY = ((window as any).__freeCamY ?? 0) + fwdY;
        (window as any).__freeCamZ = ((window as any).__freeCamZ ?? 0) + fwdZ;
        requestRender?.();
        return;
      }

      // ALL modes (2D, Active Camera in perspective, orthographic):
      // scroll zooms the VIEWPORT (like 2D mode), not the camera position.
      // This matches user expectation — scroll = zoom UI, camera only moves
      // via camera panel controls or "Move with View" orbit/pan.
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldBefore = cmRef.current.screenToWorld(mouseX, mouseY);
      const factor = e.deltaY < 0 ? VIEWPORT_CONFIG.ZOOM_FACTOR : 1 / VIEWPORT_CONFIG.ZOOM_FACTOR;
      cmRef.current.setZoom(cmRef.current.zoom * factor);
      const worldAfter = cmRef.current.screenToWorld(mouseX, mouseY);
      // Pan to keep the point under cursor stationary
      cmRef.current.pan(worldBefore.x - worldAfter.x, worldBefore.y - worldAfter.y);
      requestRender?.();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Escape cancels shape drawing
      if (e.key === 'Escape' && isDrawing.current) {
        isDrawing.current = false;
        if (drawSvg?.parentElement) drawSvg.parentElement.removeChild(drawSvg);
        drawSvg = null;
      }

      // Pen tool: Enter finishes, Escape cancels
      const penState = usePenToolStore.getState();
      if (penState.mode === 'draw') {
        if (e.key === 'Enter') {
          const cmds = penState.finishPath();
          if (cmds && cmds.length >= 2) finalizePenPath(cmds);
          e.preventDefault();
        } else if (e.key === 'Escape') {
          penState.cancelDrawing();
          e.preventDefault();
        }
      }
      if (penState.mode === 'edit') {
        if (e.key === 'Escape' || e.key === 'Enter') {
          penState.stopEditing();
          e.preventDefault();
        }
      }

      // Ctrl+Alt+T = Enable Time Remapping on selected video/comp layer
      if (e.key === 't' && e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey) {
        e.preventDefault();
        const cs = useCompositionStore.getState();
        const compId = cs.activeCompositionId;
        if (!compId) return;
        const comp = cs.compositions.find(c => c.id === compId);
        if (!comp) return;
        const selIds = useSelectionStore.getState().getSelectedIds();
        if (selIds.length === 1) {
          const layer = comp.layers.find(l => l.id === selIds[0]);
          if (layer && (layer.type === 'video' || layer.type === 'comp')) {
            const d = { ...((layer.data ?? {}) as any) };
            d.timeRemap = !d.timeRemap;
            if (d.timeRemap && !d.timeRemapKeyframes) {
              d.timeRemapKeyframes = [
                { time: 0, sourceFrame: 0 },
                { time: layer.endFrame - layer.startFrame, sourceFrame: layer.endFrame - layer.startFrame },
              ];
            }
            cs.updateLayer(compId, layer.id, { data: d });
          }
        }
        return;
      }

      // ── Blender-style G/R/S + X/Y/Z shortcuts for 3D ──
      // Only when not in a text input and a composition is active
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const blenderKey = (window as any).__pendingBlenderKey as string | null;

      if (!blenderKey) {
        // No pending key — check for G/R/S to START a modal transform
        const lower = e.key.toLowerCase();
        if ((lower === 'g' || lower === 'r' || lower === 's') &&
            !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();

          // Set tool to match the transform mode
          const toolStore = useToolStore.getState();
          if (lower === 'g') {
            toolStore.setActiveTool('select' as any); // Grab = move/select
          } else if (lower === 'r') {
            toolStore.setActiveTool('rotate' as any);
          } else if (lower === 's') {
            toolStore.setActiveTool('scale' as any);
          }

          // Start the modal transform immediately
          const mt = mtRef.current;
          if (!mt) return;

          // If no layer selected, select the topmost visible layer
          const selStore = useSelectionStore.getState();
          if (selStore.getSelectedIds().length === 0) {
            const cs = useCompositionStore.getState();
            const comp = cs.activeCompositionId
              ? cs.compositions.find(c => c.id === cs.activeCompositionId)
              : null;
            if (comp && comp.layers.length > 0) {
              const topmost = [...comp.layers]
                .filter(l => l.visible && !l.locked)
                .sort((a, b) => b.zIndex - a.zIndex)[0];
              if (topmost) {
                selStore.select({ type: 'layer', id: topmost.id, compositionId: comp.id });
              }
            }
          }

          // Dispatch transform event (handled by onTransformStart)
          const eventName = lower === 'g' ? 'transform:grab'
            : lower === 'r' ? 'transform:rotate'
            : 'transform:scale';
          document.dispatchEvent(new CustomEvent(eventName));

          // Set pending Blender key so subsequent X/Y/Z press sets axis lock
          (window as any).__pendingBlenderKey = lower;

          // Clear pending after a timeout (in case user doesn't press an axis key)
          // But the modal is already active, so X/Y/Z during modal is handled by docKeydown
          return;
        }
      } else {
        // We have a pending Blender key — the user pressed G/R/S and now X/Y/Z
        // The modal transform is already active via the event above.
        // The axis keys (X/Y/Z) during active modal are handled by docKeydown,
        // but we also need to handle the Z-axis 3D case.
        if (e.key === 'z' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const mt = mtRef.current;
          if (mt?.active) {
            // For Z axis in 3D: route vertical mouse to transform3D.position.z
            (window as any).__moveZActive = true;
            (window as any).__3DAxisLock = 'z';
            // Also lock Y axis so normal movement doesn't interfere
            mt.setAxisLock('y');
          }
          (window as any).__pendingBlenderKey = null;
          return;
        }
        if (e.key === 'x' && !e.shiftKey) {
          // X axis lock — handled by docKeydown during active modal
          // Just clear pending key
          (window as any).__pendingBlenderKey = null;
          return;
        }
        if (e.key === 'y' && !e.shiftKey) {
          // Y axis lock — handled by docKeydown during active modal
          (window as any).__pendingBlenderKey = null;
          return;
        }
        // Escape cancels pending
        if (e.key === 'Escape') {
          (window as any).__pendingBlenderKey = null;
          if (mtRef.current?.active) mtRef.current.cancel();
          return;
        }
        // Any other key clears pending (but modal transform stays active)
        if (e.key.length === 1) {
          (window as any).__pendingBlenderKey = null;
        }
      }
    };

    const onKeyUp = (_e: KeyboardEvent) => { /* no-op */ };

    const onTransformStart = () => {
      if (mtRef.current?.active) {
        attachDocListeners();
      } else if (mtRef.current) {
        // Keyboard shortcut started transform — begin modal without pointer lock
        const tool = getTool();
        const mode = tool === (TOOLS.ROTATE as ToolId) ? 'rotate'
          : tool === (TOOLS.SCALE as ToolId) ? 'scale'
          : 'grab';
        mtRef.current.start(mode);
        mouseMoved.current = false;
        lastMouse.current = { x: 0, y: 0 };
        attachDocListeners();
      }
    };

    document.addEventListener('transform:grab', onTransformStart);
    document.addEventListener('transform:rotate', onTransformStart);
    document.addEventListener('transform:scale', onTransformStart);

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousedown', onRightMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);


    if (container) container.addEventListener('mousedown', gizmoMouseDown);

    const onDblClick = (e: MouseEvent) => {
      const cm = cmRef.current;
      const ht = htRef.current;
      if (!cm || !ht) return;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const compState = useCompositionStore.getState();
      const compId = compState.activeCompositionId;
      if (!compId) return;
      const comp = compState.compositions.find((c) => c.id === compId);
      if (!comp) return;

      const visibleIds = [...comp.layers]
        .filter((l) => l.visible && !l.locked)
        .sort((a, b) => b.zIndex - a.zIndex)
        .map((l) => l.id);

      const hit = ht.hitTest(mouseX, mouseY, visibleIds);
      if (!hit) return;

      const hitLayer = comp.layers.find((l) => l.id === hit.layerId);
      if (!hitLayer || hitLayer.type !== 'comp') return;

      const data = hitLayer.data as CompData | undefined;
      if (!data?.sourceCompId) return;

      // Verify the source composition still exists
      const sourceExists = compState.compositions.some(c => c.id === data.sourceCompId);
      if (!sourceExists) return;

      e.preventDefault();
      e.stopPropagation();

      // Navigate into the nested composition
      useNavigationStore.getState().enterComp(data.sourceCompId);
      useCompositionStore.getState().setActiveComposition(data.sourceCompId);
      useSelectionStore.getState().clearSelection();
    };

    el.addEventListener('dblclick', onDblClick);

    return () => {
      if (container) container.removeEventListener('mousedown', gizmoMouseDown);
      el.removeEventListener('dblclick', onDblClick);
      document.removeEventListener('transform:grab', onTransformStart);
      document.removeEventListener('transform:rotate', onTransformStart);
      document.removeEventListener('transform:scale', onTransformStart);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mousedown', onRightMouseDown);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      detachDocListeners();
      removePanDocMouseup();
      drawSvg?.parentElement?.removeChild(drawSvg);
      boxSvg?.parentElement?.removeChild(boxSvg);
      removeAxisGuide();
      // Stop fly mode
      flyState.current.active = false;
      flyState.current.keys.clear();
      cancelAnimationFrame(flyState.current.animId);
      // Reset cursor on cleanup
      document.body.style.cursor = '';
    };
  }, [canvas]);

  // ── FLY MODE: WASD keyboard movement loop ──
  useEffect(() => {
    if (!canvas) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!flyState.current.active) return;

      // Escape exits fly mode
      if (e.key === 'Escape') {
        flyState.current.active = false;
        flyState.current.keys.clear();
        document.body.style.cursor = '';
        if (document.pointerLockElement) document.exitPointerLock();
        return;
      }

      const key = e.key.toLowerCase();
      flyState.current.keys.add(key);

      // Q/E adjust fly speed
      if (key === 'q') flyState.current.speed = Math.max(50, flyState.current.speed * 0.7);
      if (key === 'e') flyState.current.speed = Math.min(5000, flyState.current.speed * 1.4);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      flyState.current.keys.delete(e.key.toLowerCase());
    };

    // Continuous movement loop at 60fps — only runs while fly mode is active
    const flyLoop = () => {
      // Stop the RAF loop when fly mode is not active (no CPU waste)
      if (!flyState.current.active) {
        flyState.current.animId = 0;
        return;
      }

      if (flyState.current.keys.size > 0) {
        const speed = flyState.current.speed * 0.016; // per frame at 60fps
        const keys = flyState.current.keys;

        // Determine camera angles
        let pitch = 0, yaw = 0;
        const isFree = !!(window as any).__freeViewMode;
        const cs = useCompositionStore.getState();
        const compId = cs.activeCompositionId;
        const comp = compId ? cs.compositions.find(c => c.id === compId) : null;

        if (isFree) {
          pitch = (window as any).__freeOrbitX ?? 0.3;
          yaw = (window as any).__freeOrbitY ?? 0.5;
        } else if (comp) {
          pitch = comp.cameraRotationX ?? 0;
          yaw = comp.cameraRotationY ?? 0;
        }

        // Compute camera forward/right vectors from pitch and yaw
        const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
        const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
        const forward = {
          x: sinY * cosP,
          y: sinP,
          z: cosY * cosP,
        };
        const right = {
          x: cosY,
          y: 0,
          z: -sinY,
        };
        const up = { x: 0, y: 1, z: 0 };

        let moveX = 0, moveY = 0, moveZ = 0;
        if (keys.has('w')) { moveX += forward.x * speed; moveY += forward.y * speed; moveZ += forward.z * speed; }
        if (keys.has('s')) { moveX -= forward.x * speed; moveY -= forward.y * speed; moveZ -= forward.z * speed; }
        if (keys.has('a')) { moveX -= right.x * speed; moveZ -= right.z * speed; }
        if (keys.has('d')) { moveX += right.x * speed; moveZ += right.z * speed; }
        if (keys.has(' ')) { moveY += up.y * speed; }
        if (keys.has('shift')) { moveY -= up.y * speed; }

        if (moveX !== 0 || moveY !== 0 || moveZ !== 0) {
          if (compId && comp) {
            const panX = (comp.cameraPositionX ?? 0) + moveX;
            const panY = (comp.cameraPositionY ?? 0) + moveY;
            const panZ = (comp.cameraPositionZ ?? 1000) + moveZ;

            const store = useCompositionStore.getState();
            store.updateComposition(compId, {
              cameraPositionX: panX,
              cameraPositionY: panY,
              cameraPositionZ: Math.max(10, panZ),
            });

            const autoKey = useTimelineStore.getState().autoKey;
            if (autoKey) {
              autoKeyCameraProp('camera.positionX', panX);
              autoKeyCameraProp('camera.positionY', panY);
              autoKeyCameraProp('camera.positionZ', Math.max(10, panZ));
            }
          } else {
            // Free view: move camera position directly via __freeCamX/Y/Z
            const curCamX = (window as any).__freeCamX ?? 0;
            const curCamY = (window as any).__freeCamY ?? 0;
            const curCamZ = (window as any).__freeCamZ ?? 0;
            (window as any).__freeCamX = curCamX + moveX;
            (window as any).__freeCamY = curCamY + moveY;
            (window as any).__freeCamZ = curCamZ + moveZ;
          }
          requestRender?.();
        }
      }
      flyState.current.animId = requestAnimationFrame(flyLoop);
    };
    // Wire ref so onRightMouseDown can start the loop
    flyLoopRef.current = flyLoop;

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      cancelAnimationFrame(flyState.current.animId);
      flyState.current.active = false;
      flyState.current.animId = 0;
      flyState.current.keys.clear();
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [canvas]);
}