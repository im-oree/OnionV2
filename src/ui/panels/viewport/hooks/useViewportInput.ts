import { useEffect, useRef } from 'react';
import type { CameraManager } from '../../../../renderer/CameraManager';
import type { HitTester } from '../../../../renderer/interaction/HitTest';
import type { ModalTransform } from '../../../../renderer/interaction/ModalTransform';
import { VIEWPORT_CONFIG } from '../../../../config/viewportConfig';
import { useCompositionStore } from '../../../../state/compositionStore';
import { useNavigationStore } from '../../../../state/navigationStore';
import { useSelectionStore } from '../../../../state/selectionStore';
import { useToolStore, type ToolId } from '../../../../state/toolStore';
import { TOOLS } from '../../../../config/constants';
import { createDefaultLayer } from '../../../../config/defaults';
import type { Layer, CompData } from '../../../../types/layer';

function genId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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

    if (container) container.addEventListener('mousedown', gizmoMouseDown);

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

    const onMouseDown = (e: MouseEvent) => {
      // Middle mouse = pan
      if (e.button === 1) {
        isPanning.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        document.body.style.cursor = 'grabbing';
        attachPanDocMouseup();
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
        const world = cm.screenToWorld(mouseX, mouseY);
        const compState = useCompositionStore.getState();
        const compId = compState.activeCompositionId;
        if (!compId) return;
        const comp = compState.compositions.find((c) => c.id === compId);
        if (!comp) return;
        const count = comp.layers.filter((l) => l.type === 'shape').length + 1;
        const base = createDefaultLayer('shape', `Path ${count}`);
        const layer: Layer = {
          ...base, id: genId(), zIndex: comp.layers.length + 1,
          transform: { position: { x: world.x, y: world.y }, scale: { x: 100, y: 100 }, rotation: 0, anchorPoint: { x: 0, y: 0 } },
          data: { type: 'rectangle', width: 50, height: 50, borderRadius: 0 },
        };
        useCompositionStore.getState().addLayer(compId, layer);
        useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
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
        const layer: Layer = {
          ...base, id: genId(), zIndex: comp.layers.length + 1,
          transform: { position: { x: world.x, y: world.y }, scale: { x: 100, y: 100 }, rotation: 0, anchorPoint: { x: 0, y: 0 } },
          data: { text: 'Text', fontFamily: 'Inter', fontSize: 48, fontWeight: 400, color: '#ffffff', lineHeight: 1.2, letterSpacing: 0, alignment: 'center' as const },
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

      if (tool === (TOOLS.SHAPE_RECT as ToolId) || tool === (TOOLS.SHAPE_ELLIPSE as ToolId)) {
        boxStart.current = { x: mouseX, y: mouseY };
        isDrawing.current = true;
        drawSvg = createOverlay('22');
        return;
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

    const onMouseUp = (e: MouseEvent) => {
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

        const isRect = tool === (TOOLS.SHAPE_RECT as ToolId);
        const count = comp.layers.filter((l) => l.type === 'shape').length + 1;
        const worldPerPixel = 1 / cmRef.current.zoom;

        let worldW: number, worldH: number, centerWorld: { x: number; y: number };

        if (dragDist < 5) {
          // Fallback: create default-size shape at click point
          const clickWorld = cmRef.current.screenToWorld(boxStart.current.x, boxStart.current.y);
          centerWorld = { x: clickWorld.x, y: clickWorld.y };
          worldW = 200;
          worldH = 150;
        } else if (altHeld) {
          // Alt: start point is center, drag defines half-size
          centerWorld = cmRef.current.screenToWorld(boxStart.current.x, boxStart.current.y);
          let halfW = Math.abs(dx) * worldPerPixel;
          let halfH = Math.abs(dy) * worldPerPixel;
          if (shiftHeld) { const s = Math.max(halfW, halfH); halfW = s; halfH = s; }
          worldW = halfW * 2;
          worldH = halfH * 2;
        } else {
          // Normal: corner to corner
          let dw = Math.abs(dx);
          let dh = Math.abs(dy);
          if (shiftHeld) { const s = Math.max(dw, dh); dw = s; dh = s; }
          const startWorld = cmRef.current.screenToWorld(boxStart.current.x, boxStart.current.y);
          const endWorld = cmRef.current.screenToWorld(boxStart.current.x + (dx >= 0 ? dw : -dw), boxStart.current.y + (dy >= 0 ? dh : -dh));
          worldW = Math.abs(endWorld.x - startWorld.x);
          worldH = Math.abs(endWorld.y - startWorld.y);
          centerWorld = {
            x: (startWorld.x + endWorld.x) / 2,
            y: (startWorld.y + endWorld.y) / 2,
          };
        }

        const base = createDefaultLayer('shape', `${isRect ? 'Rectangle' : 'Ellipse'} ${count}`);
        const layer: Layer = {
          ...base, id: genId(), zIndex: comp.layers.length + 1,
          transform: { position: { x: centerWorld.x, y: centerWorld.y }, scale: { x: 100, y: 100 }, rotation: 0, anchorPoint: { x: 0, y: 0 } },
          data: isRect
            ? { type: 'rectangle', width: Math.max(1, Math.round(worldW)), height: Math.max(1, Math.round(worldH)), borderRadius: 0 }
            : { type: 'ellipse', radiusX: Math.max(1, Math.round(worldW / 2)), radiusY: Math.max(1, Math.round(worldH / 2)) },
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
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldBefore = cmRef.current.screenToWorld(mouseX, mouseY);
      const factor = e.deltaY < 0 ? VIEWPORT_CONFIG.ZOOM_FACTOR : 1 / VIEWPORT_CONFIG.ZOOM_FACTOR;
      cmRef.current.setZoom(cmRef.current.zoom * factor);
      const worldAfter = cmRef.current.screenToWorld(mouseX, mouseY);
      // FIX: pan to keep the point under cursor stationary
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
      // Reset cursor on cleanup
      document.body.style.cursor = '';
    };
  }, [canvas]);
}