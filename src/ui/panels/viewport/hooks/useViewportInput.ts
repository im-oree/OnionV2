/**
 * useViewportInput — mounts mouse/keyboard event handlers on the Three.js canvas.
 *
 * BEHAVIOR:
 * - SELECT: click-select, box-select (default)
 * - MOVE/ROTATE/SCALE tools: hit-test → select → start modal transform
 * - HAND: click-drag to pan
 * - ZOOM: click to zoom in, alt+click to zoom out
 * - SHAPE_RECT/SHAPE_ELLIPSE: click-drag to draw shape
 * - PEN: click to place shape at cursor
 * - TEXT: click to place text at cursor
 *
 * MODAL TRANSFORM (I1-I9):
 * - Click on layer → direct drag (no pointer lock)
 * - G/R/S keyboard → pointer lock, hidden cursor
 * - During transform: X/Y axis lock, Shift+X/Y exclude, numeric input, precision/snap
 * - Right-click or Esc: cancel, Enter or mouseup: confirm
 * - Axis guide lines drawn as SVG overlay
 */
import { useEffect, useRef } from 'react';
import { CameraManager } from '../../../../renderer/CameraManager';
import { HitTester } from '../../../../renderer/interaction/HitTest';
import { ModalTransform } from '../../../../renderer/interaction/ModalTransform';
import { VIEWPORT_CONFIG } from '../../../../config/viewportConfig';
import { useCompositionStore } from '../../../../state/compositionStore';
import { useSelectionStore } from '../../../../state/selectionStore';
import { useToolStore, type ToolId } from '../../../../state/toolStore';
import { TOOLS } from '../../../../config/constants';
import { createDefaultLayer } from '../../../../config/defaults';
import type { Layer } from '../../../../types/layer';

function genId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface UseViewportInputOptions {
  canvas: HTMLCanvasElement | null;
  cameraManager: CameraManager | null;
  hitTester: HitTester | null;
  modalTransform: ModalTransform | null;
}

export function useViewportInput({
  canvas, cameraManager, hitTester, modalTransform,
}: UseViewportInputOptions): void {
  const isPanning = useRef(false);
  const isSpacePanning = useRef(false);
  const isBoxSelecting = useRef(false);
  const isDrawing = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const boxStart = useRef({ x: 0, y: 0 });
  const cmRef = useRef(cameraManager);
  const htRef = useRef(hitTester);
  const mtRef = useRef(modalTransform);
  const canvasRef = useRef(canvas);
  const axisGuideRef = useRef<SVGSVGElement | null>(null);
  const mouseMoved = useRef(false);

  useEffect(() => {
    if (!canvas) return;
    canvasRef.current = canvas;
    const el = canvas;
    let drawSvg: SVGSVGElement | null = null;
    let boxSvg: SVGSVGElement | null = null;

    // ── Document-level listeners for transforms ────────────
    let docMousemove: ((e: MouseEvent) => void) | null = null;
    let docMouseup: ((e: MouseEvent) => void) | null = null;
    let docKeydown: ((e: KeyboardEvent) => void) | null = null;
    let docKeyup: ((e: KeyboardEvent) => void) | null = null;

    function attachDocListeners(): void {
      detachDocListeners();
      docMousemove = (ev: MouseEvent) => {
        const mt = mtRef.current;
        if (!mt?.active || !cmRef.current) return;

        if (document.pointerLockElement === canvasRef.current) {
          // Pointer lock active — use movement deltas (I2)
          if (ev.movementX !== 0 || ev.movementY !== 0) {
            mouseMoved.current = true;
            mt.updateDelta(ev.movementX, ev.movementY);
          }
        } else {
          // Direct drag — compute delta from clientX/Y (H1b)
          const dx = ev.clientX - lastMouse.current.x;
          const dy = ev.clientY - lastMouse.current.y;
          lastMouse.current = { x: ev.clientX, y: ev.clientY };
          if (dx !== 0 || dy !== 0) {
            mouseMoved.current = true;
            mt.updateDelta(dx, dy);
          }
        }
      };

      docMouseup = (ev: MouseEvent) => {
        const mt = mtRef.current;
        if (!mt?.active) return;
        // Right-click → cancel, Left-click → confirm (Blender convention)
        if (ev.button === 2) mt.cancel();
        else if (ev.button === 0) mt.confirm();
        mouseMoved.current = false;
        detachDocListeners();
      };

      // Key handlers during modal transform (I5)
      docKeydown = (ev: KeyboardEvent) => {
        const mt = mtRef.current;
        if (!mt?.active) return;

        // Confirm/Cancel
        if (ev.key === 'Escape') { mt.cancel(); detachDocListeners(); return; }
        if (ev.key === 'Enter') { mt.confirm(); detachDocListeners(); return; }

        // Axis constraints (I5)
        if (ev.key === 'x' && !ev.shiftKey) { mt.setAxisLock('x'); updateAxisGuide(); return; }
        if (ev.key === 'y' && !ev.shiftKey) { mt.setAxisLock('y'); updateAxisGuide(); return; }
        if (ev.key === 'X' && ev.shiftKey) { mt.setAxisExclude('x'); updateAxisGuide(); return; }
        if (ev.key === 'Y' && ev.shiftKey) { mt.setAxisExclude('y'); updateAxisGuide(); return; }

        // Precision mode (Shift held — tracked in keyup)
        if (ev.key === 'Shift') { mt.setPrecisionMode(true); return; }
        // Snap mode (Ctrl held)
        if (ev.key === 'Control') { mt.setSnapMode(true); return; }
        // Aspect lock for scale (Alt held) (J7)
        if (ev.key === 'Alt') { mt.setAspectLock(true); return; }

        // Numeric input (I5)
        if (/^[0-9.\-]$/.test(ev.key)) { mt.pushNumericChar(ev.key); return; }
        if (ev.key === 'Backspace') { mt.backspaceNumeric(); return; }
      };

      docKeyup = (ev: KeyboardEvent) => {
        const mt = mtRef.current;
        if (!mt?.active) return;
        if (ev.key === 'Shift') { mt.setPrecisionMode(false); return; }
        if (ev.key === 'Control') { mt.setSnapMode(false); return; }
        if (ev.key === 'Alt') { mt.setAspectLock(false); return; } // J7
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

    // ── Axis guide lines (I4) ──────────────────────────────
    function createAxisGuide(): void {
      removeAxisGuide();
      const parent = el.parentElement;
      if (!parent) return;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.position = 'absolute';
      svg.style.inset = '0';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '24';
      svg.style.width = '100%';
      svg.style.height = '100%';
      parent.appendChild(svg);
      axisGuideRef.current = svg;
    }

    function removeAxisGuide(): void {
      if (axisGuideRef.current && axisGuideRef.current.parentElement) {
        axisGuideRef.current.parentElement.removeChild(axisGuideRef.current);
      }
      axisGuideRef.current = null;
    }

    function updateAxisGuide(): void {
      const svg = axisGuideRef.current;
      const mt = mtRef.current;
      if (!svg || !mt?.active || (!mt.axisLock && !mt.axisExclude)) {
        if (svg) svg.innerHTML = '';
        return;
      }
      svg.innerHTML = '';
      const ns = 'http://www.w3.org/2000/svg';
      const w = svg.clientWidth || 300;
      const h = svg.clientHeight || 200;
      const halfW = w / 2;
      const halfH = h / 2;

      // X axis line — red, dashed
      if (mt.axisLock === 'x') {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', '0'); line.setAttribute('y1', String(halfH));
        line.setAttribute('x2', String(w)); line.setAttribute('y2', String(halfH));
        line.setAttribute('stroke', '#ff4444');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '4 2');
        svg.appendChild(line);
      }
      // Y axis line — green, dashed
      if (mt.axisLock === 'y') {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', String(halfW)); line.setAttribute('y1', '0');
        line.setAttribute('x2', String(halfW)); line.setAttribute('y2', String(h));
        line.setAttribute('stroke', '#44ff44');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '4 2');
        svg.appendChild(line);
      }
      // Axis exclude: draw both dimmed (I4)
      if (mt.axisExclude === 'x') {
        const l = document.createElementNS(ns, 'line');
        l.setAttribute('x1', '0'); l.setAttribute('y1', String(halfH));
        l.setAttribute('x2', String(w)); l.setAttribute('y2', String(halfH));
        l.setAttribute('stroke', 'rgba(255,68,68,0.4)');
        l.setAttribute('stroke-width', '1');
        l.setAttribute('stroke-dasharray', '2 3');
        svg.appendChild(l);
      }
      if (mt.axisExclude === 'y') {
        const l = document.createElementNS(ns, 'line');
        l.setAttribute('x1', String(halfW)); l.setAttribute('y1', '0');
        l.setAttribute('x2', String(halfW)); l.setAttribute('y2', String(h));
        l.setAttribute('stroke', 'rgba(68,255,68,0.4)');
        l.setAttribute('stroke-width', '1');
        l.setAttribute('stroke-dasharray', '2 3');
        svg.appendChild(l);
      }
    }

    // ── Helpers ───────────────────────────────────────────
    const createOverlay = (kind: 'draw' | 'box') => {
      const parent = el.parentElement;
      if (!parent) return null;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.position = 'absolute';
      svg.style.inset = '0';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = kind === 'draw' ? '22' : '20';
      svg.style.width = '100%';
      svg.style.height = '100%';
      parent.appendChild(svg);
      return svg;
    };

    const getTool = () => useToolStore.getState().activeTool;

    function hitTestAndSelect(
      mouseX: number, mouseY: number, clientX: number, clientY: number, tool: string,
    ): boolean {
      const cm = cmRef.current;
      const ht = htRef.current;
      if (!cm || !ht) return false;
      const compState = useCompositionStore.getState();
      const compId = compState.activeCompositionId;
      if (!compId) return false;
      const comp = compState.compositions.find((c) => c.id === compId);
      if (!comp) return false;

      const visibleIds = comp.layers.filter((l) => l.visible && !l.locked).map((l) => l.id);
      const hit = ht.hitTest(mouseX, mouseY, visibleIds);
      if (!hit) return false;

      // Select the hit layer
      useSelectionStore.getState().select({ type: 'layer', id: hit.layerId, compositionId: compId });

      // Start direct-drag modal transform (no pointer lock for mouse-initiated drag)
      if (mtRef.current) {
        const mode = tool === (TOOLS.ROTATE as ToolId) ? 'rotate'
                   : tool === (TOOLS.SCALE as ToolId) ? 'scale'
                   : 'grab';
        mtRef.current.start(mode as 'grab' | 'rotate' | 'scale');
        // J4: Store initial mouse screen position for pivot-based scale
        mtRef.current.startMouseScreen = { x: clientX, y: clientY };
        mouseMoved.current = false;
        lastMouse.current = { x: clientX, y: clientY };
        attachDocListeners();
      }

      isPanning.current = false;
      return true;
    }

    // ── Mouse handlers ────────────────────────────────────

    // L2-L3: Handle bounding box handles (data-handle) + Blender gizmo (data-gizmo) on the container
    // SVG elements with pointer-events:all intercept clicks before they reach the canvas.
    const container = el.parentElement;
    const gizmoMouseDown = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      const handleAttr = target?.getAttribute?.('data-handle');
      const gizmoAttr = target?.getAttribute?.('data-gizmo');
      if (!handleAttr && !gizmoAttr) return;
      if (!mtRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      // Determine mode from handle type
      let mode: 'grab' | 'rotate' | 'scale';
      if (handleAttr === 'rotate') mode = 'rotate';
      else if (handleAttr || gizmoAttr === 'corner' || gizmoAttr === 'edge' ||
               gizmoAttr === 'scale-uniform' || gizmoAttr === 'scale-x' || gizmoAttr === 'scale-y') mode = 'scale';
      else if (gizmoAttr?.startsWith('rotate')) mode = 'rotate';
      else if (gizmoAttr?.startsWith('scale')) mode = 'scale';
      else mode = 'grab';

      mtRef.current.start(mode);
      mtRef.current.startMouseScreen = { x: e.clientX, y: e.clientY };

      // L3: Compute handle pivot for PowerPoint-style opposite-corner/edge scaling
      if (handleAttr && mode !== 'grab' && cmRef.current) {
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
              // Approximate half-size from layer data (varies by type)
              let halfW = 50, halfH = 50;
              if ('width' in (layer.data || {}) && 'height' in (layer.data || {})) {
                halfW = ((layer.data as any).width / 2) * (sc.x / 100);
                halfH = ((layer.data as any).height / 2) * (sc.y / 100);
              }
              // Rotation in radians for rotating the offset
              const rad = (layer.transform.rotation || 0) * (Math.PI / 180);
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              // Pivot offset based on handle type (opposite corner/edge)
              let px = 0, py = 0;
              // Corners: offset from center to opposite corner
              if (handleAttr === 'tl') { px = halfW; py = -halfH; }       // opposite = BR
              else if (handleAttr === 'tr') { px = -halfW; py = -halfH; } // opposite = BL
              else if (handleAttr === 'br') { px = -halfW; py = halfH; }  // opposite = TL
              else if (handleAttr === 'bl') { px = halfW; py = halfH; }   // opposite = TR
              // Edges: offset from center to opposite edge
              else if (handleAttr === 'top') { px = 0; py = -halfH; }     // opposite = bottom edge
              else if (handleAttr === 'bottom') { px = 0; py = halfH; }   // opposite = top edge
              else if (handleAttr === 'left') { px = halfW; py = 0; }     // opposite = right edge
              else if (handleAttr === 'right') { px = -halfW; py = 0; }   // opposite = left edge
              // Rotate offset by layer rotation
              const rx = px * cos - py * sin;
              const ry = px * sin + py * cos;
              mtRef.current.setHandlePivotWorld({ x: pos.x + rx, y: pos.y + ry });
            }
          }
        }
      }

      // Axis lock / aspect lock
      if (gizmoAttr === 'move-x' || gizmoAttr === 'scale-x') mtRef.current.setAxisLock('x');
      else if (gizmoAttr === 'move-y' || gizmoAttr === 'scale-y') mtRef.current.setAxisLock('y');
      else if (gizmoAttr === 'scale-uniform' || handleAttr === 'corner' ||
               handleAttr === 'tl' || handleAttr === 'tr' || handleAttr === 'br' || handleAttr === 'bl') {
        mtRef.current.setAspectLock(true);
      }
      // Edge handles: constrain to single axis
      if (handleAttr === 'top' || handleAttr === 'bottom') mtRef.current.setAxisLock('y');
      if (handleAttr === 'left' || handleAttr === 'right') mtRef.current.setAxisLock('x');

      mouseMoved.current = false;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      attachDocListeners();
    };
    if (container) container.addEventListener('mousedown', gizmoMouseDown);

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey))) {
        isPanning.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
        return;
      }
      if (e.button !== 0) return;

      const tool = getTool();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      cmRef.current = cameraManager;
      htRef.current = hitTester;
      mtRef.current = modalTransform;

      // MOVE / ROTATE / SCALE tools — hit-test and start modal transform on hit
      if (tool === (TOOLS.MOVE as ToolId) || tool === (TOOLS.ROTATE as ToolId) || tool === (TOOLS.SCALE as ToolId)) {
        if (hitTestAndSelect(mouseX, mouseY, e.clientX, e.clientY, tool)) return;
      }

      // PEN tool — click to create shape at cursor
      if (tool === (TOOLS.PEN as ToolId)) {
        if (cmRef.current) {
          const world = cmRef.current.screenToWorld(mouseX, mouseY);
          const compState = useCompositionStore.getState();
          const compId = compState.activeCompositionId;
          if (compId) {
            const comp = compState.compositions.find((c) => c.id === compId);
            if (comp) {
              const typeName = comp.layers.filter((l) => l.type === 'shape').length + 1;
              const base = createDefaultLayer('shape', `Path ${typeName}`);
              const layer: Layer = {
                ...base, id: genId(), zIndex: comp.layers.length + 1,
                transform: { position: { x: world.x, y: world.y }, scale: { x: 100, y: 100 }, rotation: 0, anchorPoint: { x: 0, y: 0 } },
                data: { type: 'rectangle', width: 50, height: 50, borderRadius: 0 },
              };
              useCompositionStore.getState().addLayer(compId, layer);
              useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
            }
          }
        }
        return;
      }

      // TEXT tool — click to create text layer at cursor
      if (tool === (TOOLS.TEXT as ToolId)) {
        if (cmRef.current) {
          const world = cmRef.current.screenToWorld(mouseX, mouseY);
          const compState = useCompositionStore.getState();
          const compId = compState.activeCompositionId;
          if (compId) {
            const comp = compState.compositions.find((c) => c.id === compId);
            if (comp) {
              const typeName = comp.layers.filter((l) => l.type === 'text').length + 1;
              const base = createDefaultLayer('text', `Text ${typeName}`);
              const layer: Layer = {
                ...base, id: genId(), zIndex: comp.layers.length + 1,
                transform: { position: { x: world.x, y: world.y }, scale: { x: 100, y: 100 }, rotation: 0, anchorPoint: { x: 0, y: 0 } },
                data: { text: 'Text', fontFamily: 'Inter', fontSize: 48, fontWeight: 400, color: '#ffffff', lineHeight: 1.2, letterSpacing: 0, alignment: 'center' as const },
              };
              useCompositionStore.getState().addLayer(compId, layer);
              useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
            }
          }
        }
        return;
      }

      // Modal transform already active — let doc listeners handle it
      if (mtRef.current?.active) {
        isPanning.current = false;
        lastMouse.current = { x: mouseX, y: mouseY };
        return;
      }

      // HAND tool — always pan
      if (tool === (TOOLS.HAND as ToolId)) {
        isPanning.current = true;
        lastMouse.current = { x: mouseX, y: mouseY };
        e.preventDefault();
        return;
      }

      // ZOOM tool — click = zoom in, alt+click = zoom out
      if (tool === (TOOLS.ZOOM as ToolId)) {
        if (cmRef.current) {
          const factor = e.altKey ? 1 / 1.5 : 1.5;
          cmRef.current.setZoom(cmRef.current.zoom * factor);
        }
        return;
      }

      // SHAPE tools — start drawing
      if (tool === (TOOLS.SHAPE_RECT as ToolId) || tool === (TOOLS.SHAPE_ELLIPSE as ToolId)) {
        boxStart.current = { x: mouseX, y: mouseY };
        isDrawing.current = true;
        drawSvg = createOverlay('draw');
        return;
      }

      // SELECT tool — hit-test first, then box-select
      if (hitTestAndSelect(mouseX, mouseY, e.clientX, e.clientY, tool)) return;

      // No hit — start box-select (H1c)
      isBoxSelecting.current = true;
      boxStart.current = { x: mouseX, y: mouseY };
      boxSvg = createOverlay('box');
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        useSelectionStore.getState().deselectAll();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      // Modal transform is handled by document listeners
      if (mtRef.current?.active) return;

      // Shape drawing preview
      if (isDrawing.current && cmRef.current) {
        // ... unchanged from previous implementation ...
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const x = Math.min(boxStart.current.x, mx);
        const y = Math.min(boxStart.current.y, my);
        const w = Math.abs(mx - boxStart.current.x);
        const h = Math.abs(my - boxStart.current.y);
        if (drawSvg) {
          drawSvg.innerHTML = '';
          const ns = 'http://www.w3.org/2000/svg';
          const shape = document.createElementNS(ns, 'rect');
          shape.setAttribute('x', String(x)); shape.setAttribute('y', String(y));
          shape.setAttribute('width', String(w)); shape.setAttribute('height', String(h));
          shape.setAttribute('fill', 'rgba(71, 114, 179, 0.2)');
          shape.setAttribute('stroke', 'var(--color-accent)');
          shape.setAttribute('stroke-width', '1');
          drawSvg.appendChild(shape);
        }
        return;
      }

      // Pan
      if ((isPanning.current || isSpacePanning.current) && cmRef.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        const zoom = cmRef.current.zoom;
        cmRef.current.pan(-dx * zoom, dy * zoom);
        lastMouse.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Box select
      if (isBoxSelecting.current && boxSvg && cmRef.current) {
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const x = Math.min(boxStart.current.x, mx);
        const y = Math.min(boxStart.current.y, my);
        const w = Math.abs(mx - boxStart.current.x);
        const h = Math.abs(my - boxStart.current.y);
        boxSvg.innerHTML = '';
        const ns = 'http://www.w3.org/2000/svg';
        const rectEl = document.createElementNS(ns, 'rect');
        rectEl.setAttribute('x', String(x)); rectEl.setAttribute('y', String(y));
        rectEl.setAttribute('width', String(w)); rectEl.setAttribute('height', String(h));
        rectEl.setAttribute('fill', 'rgba(71, 114, 179, 0.15)');
        rectEl.setAttribute('stroke', 'var(--color-accent)');
        rectEl.setAttribute('stroke-width', '1');
        rectEl.setAttribute('stroke-dasharray', '4 2');
        boxSvg.appendChild(rectEl);

        const compState = useCompositionStore.getState();
        const compId = compState.activeCompositionId;
        if (compId) {
          const comp = compState.compositions.find((c) => c.id === compId);
          if (comp) {
            const worldMin = cmRef.current.screenToWorld(x, y);
            const worldMax = cmRef.current.screenToWorld(x + w, y + h);
            const intersecting = comp.layers.filter((l) => {
              const t = l.transform;
              return t.position.x - 50 < worldMax.x && t.position.x + 50 > worldMin.x &&
                     t.position.y - 50 < worldMax.y && t.position.y + 50 > worldMin.y;
            });
            useSelectionStore.getState().replaceSelection(intersecting.map((l) => l.id), compId);
          }
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 1) isPanning.current = false;
      if (e.button === 0) {
        isSpacePanning.current = false;
        isPanning.current = false;

        if (isDrawing.current) {
          isDrawing.current = false;
          if (drawSvg && drawSvg.parentElement) drawSvg.parentElement.removeChild(drawSvg);
          drawSvg = null;

          const tool = getTool();
          const rect = el.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const w = Math.abs(mx - boxStart.current.x);
          const h = Math.abs(my - boxStart.current.y);
          if (w < 5 || h < 5) return;

          if (cmRef.current) {
            const centerWorld = cmRef.current.screenToWorld(
              (boxStart.current.x + mx) / 2, (boxStart.current.y + my) / 2,
            );
            const worldW = w * cmRef.current.zoom;
            const worldH = h * cmRef.current.zoom;
            const compState = useCompositionStore.getState();
            const compId = compState.activeCompositionId;
            if (compId) {
              const comp = compState.compositions.find((c) => c.id === compId);
              if (comp) {
                const isRect = tool === (TOOLS.SHAPE_RECT as ToolId);
                const typeName = comp.layers.filter((l) => l.type === 'shape').length + 1;
                const base = createDefaultLayer('shape', `${isRect ? 'Rectangle' : 'Ellipse'} ${typeName}`);
                const layer: Layer = {
                  ...base, id: genId(), zIndex: comp.layers.length + 1,
                  transform: { position: { x: centerWorld.x, y: centerWorld.y }, scale: { x: 100, y: 100 }, rotation: 0, anchorPoint: { x: 0, y: 0 } },
                  data: isRect
                    ? { type: 'rectangle', width: Math.round(worldW), height: Math.round(worldH), borderRadius: 0 }
                    : { type: 'ellipse', radiusX: Math.round(worldW / 2), radiusY: Math.round(worldH / 2) },
                };
                useCompositionStore.getState().addLayer(compId, layer);
                useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
              }
            }
          }
          return;
        }

        if (isBoxSelecting.current) {
          isBoxSelecting.current = false;
          if (boxSvg && boxSvg.parentElement) boxSvg.parentElement.removeChild(boxSvg);
          boxSvg = null;
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!cmRef.current) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldBefore = cmRef.current.screenToWorld(mouseX, mouseY);
      const factor = e.deltaY < 0 ? 1 / VIEWPORT_CONFIG.ZOOM_FACTOR : VIEWPORT_CONFIG.ZOOM_FACTOR;
      cmRef.current.setZoom(cmRef.current.zoom * factor);
      const worldAfter = cmRef.current.screenToWorld(mouseX, mouseY);
      cmRef.current.pan(worldBefore.x - worldAfter.x, worldBefore.y - worldAfter.y);
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        isSpacePanning.current = true;
        isPanning.current = true;
        e.preventDefault();
      }
      // Escape during modal handled by docKeydown; this catches non-modal Esc
      if (e.key === 'Escape' && mtRef.current?.active) { mtRef.current.cancel(); detachDocListeners(); }
      if (e.key === 'Enter' && mtRef.current?.active) { mtRef.current.confirm(); detachDocListeners(); }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') { isSpacePanning.current = false; isPanning.current = false; }
    };

    // Attach doc listeners when transform starts from keyboard (G/R/S via event chain)
    const onTransformEvent = () => {
      const mt = mtRef.current;
      const canvas = canvasRef.current;
      if (mt?.active && canvas) {
        // Restart with pointer lock (keyboard-initiated transform)
        // Re-use the mode from the last start
        attachDocListeners();
      }
    };
    document.addEventListener('transform:grab', onTransformEvent);
    document.addEventListener('transform:rotate', onTransformEvent);
    document.addEventListener('transform:scale', onTransformEvent);

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      if (container) container.removeEventListener('mousedown', gizmoMouseDown);
      document.removeEventListener('transform:grab', onTransformEvent);
      document.removeEventListener('transform:rotate', onTransformEvent);
      document.removeEventListener('transform:scale', onTransformEvent);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      detachDocListeners();
      if (drawSvg && drawSvg.parentElement) drawSvg.parentElement.removeChild(drawSvg);
      if (boxSvg && boxSvg.parentElement) boxSvg.parentElement.removeChild(boxSvg);
      removeAxisGuide();
    };
  }, [canvas, cameraManager, hitTester, modalTransform]);
}
