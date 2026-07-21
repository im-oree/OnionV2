/**
 * LayerBoundsOverlay — draws a thin outline for every unselected layer whose
 * bounding box is partially or fully outside the composition rectangle.
 * Makes it obvious where off-canvas layers live (AE-style).
 *
 * Rendered on its own SVG so it doesn't interfere with SelectionOverlay.
 * Non-interactive (pointer-events: none). Hit-testing goes through the
 * regular canvas HitTester.
 */
import * as THREE from 'three';
import type { CameraManager } from '../CameraManager';
import type { BaseLayerRenderer } from '../layers/BaseLayerRenderer';
import { useCompositionStore } from '../../state/compositionStore';
import { useSelectionStore } from '../../state/selectionStore';

const NS = 'http://www.w3.org/2000/svg';

export class LayerBoundsOverlay {
  private container: HTMLElement;
  private cameraManager: CameraManager;
  private svg: SVGSVGElement | null = null;
  private _visible = true;

  constructor(container: HTMLElement, cameraManager: CameraManager) {
    this.container = container;
    this.cameraManager = cameraManager;
  }

  mount(): void {
    if (this.svg) return;
    const svg = document.createElementNS(NS, 'svg');
    svg.style.position = 'absolute';
    svg.style.inset = '0';
    svg.style.pointerEvents = 'none';
    // Sit BELOW SelectionOverlay (z=25) so selection handles remain on top.
    svg.style.zIndex = '22';
    svg.style.width = '100%';
    svg.style.height = '100%';
    this.container.appendChild(svg);
    this.svg = svg;
  }

  unmount(): void {
    if (this.svg && this.svg.parentElement) this.svg.parentElement.removeChild(this.svg);
    this.svg = null;
  }

  show(): void { this._visible = true; }
  hide(): void { this._visible = false; if (this.svg) this.svg.innerHTML = ''; }
  get visible(): boolean { return this._visible; }

  /**
   * Draw outlines for every renderer whose bounding box exits the composition
   * rect. Selected layers are skipped (SelectionOverlay handles them).
   */
  update(renderers: BaseLayerRenderer[]): void {
    if (!this.svg) return;
    this.svg.innerHTML = '';
    if (!this._visible || renderers.length === 0) return;

    const cs = useCompositionStore.getState();
    const comp = cs.activeCompositionId
      ? cs.compositions.find(c => c.id === cs.activeCompositionId)
      : null;
    if (!comp) return;

    const selected = new Set(
      useSelectionStore.getState().selected
        .filter(x => x.type === 'layer')
        .map(x => x.id),
    );

    const halfW = comp.width / 2;
    const halfH = comp.height / 2;

    for (const r of renderers) {
      if (selected.has(r.id)) continue;              // handled by SelectionOverlay
      if (!r.group.visible) continue;                // hidden layers
      if (!(r as any).mesh?.visible) continue;       // invisible mesh

      const worldCorners = this._getWorldCornersRaw(r);
      if (!worldCorners) continue;

      // Bounding box of the layer in world space
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const c of worldCorners) {
        if (c.x < minX) minX = c.x;
        if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.y > maxY) maxY = c.y;
      }

      // Fully inside comp → no outline needed
      const fullyInside =
        minX >= -halfW && maxX <= halfW &&
        minY >= -halfH && maxY <= halfH;
      if (fullyInside) continue;

      // Fully outside comp → dimmer outline
      const fullyOutside =
        maxX < -halfW || minX > halfW ||
        maxY < -halfH || minY > halfH;

      // Draw the (rotated) polygon outline in screen space
      const screenCorners = worldCorners.map(c =>
        this.cameraManager.worldToScreen(c.x, c.y),
      );
      const pts = screenCorners.map(c => `${c.x},${c.y}`).join(' ');

      const poly = document.createElementNS(NS, 'polygon');
      poly.setAttribute('points', pts);
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', fullyOutside
        ? 'rgba(180,200,255,0.35)'
        : 'rgba(180,200,255,0.55)');
      poly.setAttribute('stroke-width', '1');
      poly.setAttribute('stroke-dasharray', fullyOutside ? '3 4' : '4 3');
      this.svg.appendChild(poly);
    }
  }

  /** Get 4 world-space corners of a renderer's mesh (no screen mapping). */
  private _getWorldCornersRaw(renderer: BaseLayerRenderer): { x: number; y: number }[] | null {
    renderer.mesh.updateMatrixWorld(true);
    const geo = renderer.mesh.geometry;
    geo.computeBoundingBox();
    const bbox = geo.boundingBox;
    if (!bbox) return null;

    const local = [
      new THREE.Vector3(bbox.min.x, bbox.min.y, 0),
      new THREE.Vector3(bbox.max.x, bbox.min.y, 0),
      new THREE.Vector3(bbox.max.x, bbox.max.y, 0),
      new THREE.Vector3(bbox.min.x, bbox.max.y, 0),
    ];
    const matrix = renderer.mesh.matrixWorld;
    return local.map(v => {
      const w = v.clone().applyMatrix4(matrix);
      return { x: w.x, y: w.y };
    });
  }

  dispose(): void { this.unmount(); }
}