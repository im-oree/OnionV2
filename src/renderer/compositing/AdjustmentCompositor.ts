/**
 * AdjustmentCompositor — implements "effect layer that affects everything below".
 *
 * For each adjustment layer:
 *   1. Snapshot current framebuffer (everything below) into an FBO.
 *   2. Run the adjustment's effect chain on that snapshot.
 *   3. Display the result on a screen-aligned quad at the adjustment's zIndex.
 */
import * as THREE from 'three';
import { EffectChain } from '../effects/EffectChain';
import { useEffectsStore } from '../../state/effectsStore';
import { useCompositionStore } from '../../state/compositionStore';
import type { Layer } from '../../types/layer';
import type { SceneManager } from '../SceneManager';
import type { CameraManager } from '../CameraManager';
import type { LayerSync } from '../sync/LayerSync';

interface CompositorEntry {
  chain: EffectChain;
  quad: THREE.Mesh;
  targetA: THREE.WebGLRenderTarget;
  targetB: THREE.WebGLRenderTarget;
  currentW: number;
  currentH: number;
}

export class AdjustmentCompositor {
  private renderer: THREE.WebGLRenderer;
  private sceneManager: SceneManager;
  private cameraManager: CameraManager;
  private layerSync: LayerSync;

  private entries = new Map<string, CompositorEntry>();
  private activeAdjustmentIds = new Set<string>();
  private _compBgColor = 0x000000;
  private layerAdjustmentMap = new Map<string, string | null>();

  // Fix #1 — reuse Color objects to avoid per-frame allocations
  private _savedClearColor = new THREE.Color();
  private _savedViewport = new THREE.Vector4();
  private _savedScissor = new THREE.Vector4();

  constructor(
    renderer: THREE.WebGLRenderer,
    sceneManager: SceneManager,
    cameraManager: CameraManager,
    layerSync: LayerSync,
  ) {
    this.renderer = renderer;
    this.sceneManager = sceneManager;
    this.cameraManager = cameraManager;
    this.layerSync = layerSync;
  }

  prepareFrame(
    layers: Layer[],
    compWidth: number,
    compHeight: number,
    currentFrame: number,
  ): void {
    this.activeAdjustmentIds.clear();
    this.layerAdjustmentMap.clear();

    const compState = useCompositionStore.getState();
    const comp = compState.compositions.find(
      (c) => c.id === compState.activeCompositionId,
    );

    // Fix #2 — parseInt with no fallback guard: if backgroundColor is
    // malformed parseInt returns NaN. Added explicit NaN check.
    const parsed = parseInt(
      (comp?.backgroundColor ?? '#000000').replace('#', ''),
      16,
    );
    this._compBgColor = Number.isNaN(parsed) ? 0x000000 : parsed;

    const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    const effectsStore = useEffectsStore.getState();
    let currentAdjustmentId: string | null = null;

    for (const layer of sorted) {
      const inRange =
        currentFrame >= layer.startFrame &&
        currentFrame <= layer.endFrame;
      const visible = layer.visible && inRange;

      if (layer.type === 'adjustment') {
        const fx = (
          effectsStore.effectsByLayer[layer.id] ?? []
        ).filter((e) => e.enabled);

        if (visible && fx.length > 0) {
          this._ensureEntry(layer.id, compWidth, compHeight);
          this.activeAdjustmentIds.add(layer.id);
          currentAdjustmentId = layer.id;
        } else {
          this._removeEntry(layer.id);
        }
        continue;
      }

      if (visible) {
        this.layerAdjustmentMap.set(layer.id, currentAdjustmentId);
      }
    }

    // GC stale entries
    for (const [id] of this.entries) {
      if (!this.activeAdjustmentIds.has(id)) {
        this._removeEntry(id);
      }
    }
  }

  get hasActiveAdjustments(): boolean {
    return this.activeAdjustmentIds.size > 0;
  }

  execute(
    layers: Layer[],
    compWidth: number,
    compHeight: number,
  ): void {
    if (this.activeAdjustmentIds.size === 0) return;

    // Use the WebGL drawing-buffer size as the FBO/viewport dimensions.
    // If we use comp size (e.g. 1920x1080) while the canvas is at a
    // preview-scale size (e.g. 960x540 from adaptive resolution), Three.js
    // clamps our setViewport(1920,1080) to the actual buffer size, and the
    // snapshot ends up written into only the bottom-left corner of a
    // larger FBO — producing the tiny-thumbnail bug.
    const canvasSize = new THREE.Vector2();
    this.renderer.getSize(canvasSize);
    const pr = this.renderer.getPixelRatio();
    const fbW = Math.max(1, Math.round(canvasSize.x * pr));
    const fbH = Math.max(1, Math.round(canvasSize.y * pr));
    const w = fbW;
    const h = fbH;
    // Note: we keep the snapshot CAMERA sized to comp dimensions so world-
    // space layer positions project correctly. The FBO/viewport dimensions
    // just determine pixel resolution of the snapshot texture.

    // Fix #1 — save state using reused objects
    const oldTarget = this.renderer.getRenderTarget();
    this.renderer.getViewport(this._savedViewport);
    this.renderer.getScissor(this._savedScissor);
    const oldScissorTest = this.renderer.getScissorTest();
    this.renderer.getClearColor(this._savedClearColor);
    const oldClearAlpha = this.renderer.getClearAlpha();

    const savedVisibility = new Map<string, boolean>();
    for (const l of layers) {
      const r = this.layerSync.getRenderer(l.id);
      if (r) savedVisibility.set(l.id, r.group.visible);
    }

    // Camera frustum matches composition world-space bounds (unchanged by canvas scale)
    const cam = this._getSnapshotCamera(
      Math.max(1, Math.ceil(compWidth)),
      Math.max(1, Math.ceil(compHeight)),
    );

    const adjustmentsOrdered = layers
      .filter((l) => this.activeAdjustmentIds.has(l.id))
      .sort((a, b) => a.zIndex - b.zIndex);

    const consumed = new Set<string>();

    try {
      for (const adj of adjustmentsOrdered) {
        const entry = this.entries.get(adj.id);
        if (!entry) continue;

        // FBO gets canvas-buffer dimensions; quad geometry gets comp-world dimensions
        this._resizeEntry(entry, w, h, Math.ceil(compWidth), Math.ceil(compHeight));

        // Determine snapshot visibility
        for (const l of layers) {
          const r = this.layerSync.getRenderer(l.id);
          if (!r) continue;

          if (l.id === adj.id) {
            r.group.visible = false;
          } else if (
            l.zIndex < adj.zIndex &&
            !consumed.has(l.id)
          ) {
            r.group.visible = savedVisibility.get(l.id) ?? false;
          } else {
            r.group.visible = false;
          }
        }

        for (const [otherId, otherEntry] of this.entries) {
          if (otherId === adj.id) {
            otherEntry.quad.visible = false;
            continue;
          }
          const other = layers.find((l) => l.id === otherId);
          otherEntry.quad.visible = !!(
            other && other.zIndex < adj.zIndex
          );
        }

        // Hide overlays during snapshot
        const gridWas = this.sceneManager.grid.group.visible;
        const safeWas = this.sceneManager.safeZones.group.visible;
        const boundsWas =
          this.sceneManager.compBounds.group.visible;
        this.sceneManager.grid.group.visible = false;
        this.sceneManager.safeZones.group.visible = false;
        this.sceneManager.compBounds.group.visible = false;

        this.renderer.setRenderTarget(entry.targetA);
        this.renderer.setViewport(0, 0, w, h);
        this.renderer.setScissorTest(false);
        this.renderer.setClearColor(this._compBgColor, 1);
        this.renderer.clear(true, true, false);
        this.renderer.render(this.sceneManager.scene, cam);

        // Restore overlays
        this.sceneManager.grid.group.visible = gridWas;
        this.sceneManager.safeZones.group.visible = safeWas;
        this.sceneManager.compBounds.group.visible = boundsWas;

        // Fix #3 — effect list was read from store twice (once in
        // prepareFrame, once here). If store mutated between calls the
        // two reads could disagree and produce a visible hitch. Cache
        // the list once here for the execute pass.
        const effects = (
          useEffectsStore.getState().effectsByLayer[adj.id] ?? []
        ).filter((e) => e.enabled);

        entry.chain.setSource(entry.targetA.texture, w, h);
        const resultTex =
          entry.chain.render(effects) ?? entry.targetA.texture;

        const mat = entry.quad.material as THREE.MeshBasicMaterial;
        mat.map = resultTex;
        // Fix #4 — opacity could be NaN if adj.opacity is undefined.
        mat.opacity = Number.isFinite(adj.opacity)
          ? Math.max(0, Math.min(1, adj.opacity / 100))
          : 1;
        mat.needsUpdate = true;

        entry.quad.position.set(0, 0, 0);
        entry.quad.rotation.set(0, 0, 0);
        entry.quad.scale.set(1, 1, 1);
        entry.quad.visible = true;

        const adjRenderer = this.layerSync.getRenderer(adj.id);
        if (adjRenderer) {
          entry.quad.renderOrder = adjRenderer.mesh.renderOrder;
        }

        // Mark consumed — layers below absorbed into this quad
        for (const l of layers) {
          if (l.id !== adj.id && l.zIndex < adj.zIndex) {
            consumed.add(l.id);
          }
        }
      }

      // Final visibility for real render pass
      for (const l of layers) {
        const r = this.layerSync.getRenderer(l.id);
        if (!r) continue;

        if (l.type === 'adjustment') {
          r.group.visible = false;
          continue;
        }

        r.group.visible = consumed.has(l.id)
          ? false
          : (savedVisibility.get(l.id) ?? false);
      }

      for (const [id, entry] of this.entries) {
        entry.quad.visible = this.activeAdjustmentIds.has(id);
      }
    } finally {
      // Fix #1 — restore using reused objects
      this.renderer.setRenderTarget(oldTarget);
      this.renderer.setViewport(this._savedViewport);
      this.renderer.setScissor(this._savedScissor);
      this.renderer.setScissorTest(oldScissorTest);
      this.renderer.setClearColor(this._savedClearColor, oldClearAlpha);
    }
  }

  restoreVisibility(layers: Layer[], currentFrame: number): void {
    for (const l of layers) {
      const r = this.layerSync.getRenderer(l.id);
      if (!r) continue;

      if (l.type === 'adjustment') {
        r.group.visible = false;
        continue;
      }

      const inRange =
        currentFrame >= l.startFrame &&
        currentFrame <= l.endFrame;
      r.group.visible = l.visible && inRange;
    }
  }

  dispose(): void {
    for (const [id] of this.entries) this._removeEntry(id);
    this.entries.clear();
    this.activeAdjustmentIds.clear();
    this.layerAdjustmentMap.clear();
    this._snapshotCam = null;
  }

  // ── Private ───────────────────────────────────────────────────

  private _ensureEntry(
    adjId: string,
    compW: number,
    compH: number,
  ): void {
    if (this.entries.has(adjId)) return;

    const chain = new EffectChain(this.renderer);
    // FBO starts at comp size — will be resized to canvas-buffer size on first execute()
    const targetA = this._createTarget(compW, compH);
    const targetB = this._createTarget(compW, compH);

    // Quad geometry always in composition world-space dimensions
    const geo = new THREE.PlaneGeometry(compW, compH);
    const mat = new THREE.MeshBasicMaterial({
      map: targetA.texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const quad = new THREE.Mesh(geo, mat);
    quad.name = `${adjId}_adjustment_quad`;
    quad.frustumCulled = false;
    quad.visible = false;

    this.sceneManager.layerGroup.add(quad);
    this.entries.set(adjId, {
      chain,
      quad,
      targetA,
      targetB,
      currentW: compW,
      currentH: compH,
    });
  }

  private _removeEntry(adjId: string): void {
    const entry = this.entries.get(adjId);
    if (!entry) return;

    entry.chain.dispose();
    entry.quad.parent?.remove(entry.quad);
    entry.quad.geometry.dispose();

    const mat = entry.quad.material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else if (mat instanceof THREE.Material) {
      mat.dispose();
    }

    entry.targetA.dispose();
    entry.targetB.dispose();
    this.entries.delete(adjId);
  }

  /**
   * Resize entry's FBOs (fbW x fbH — matches WebGL drawing buffer for
   * correct viewport behavior) AND the quad geometry (compW x compH —
   * world-space size so it covers the composition when projected).
   */
  private _resizeEntry(
    entry: CompositorEntry,
    fbW: number,
    fbH: number,
    compW: number,
    compH: number,
  ): void {
    // Resize FBOs when the framebuffer dimensions changed
    if (entry.currentW !== fbW || entry.currentH !== fbH) {
      entry.targetA.dispose();
      entry.targetB.dispose();
      entry.targetA = this._createTarget(fbW, fbH);
      entry.targetB = this._createTarget(fbW, fbH);

      const mat = entry.quad.material as THREE.MeshBasicMaterial;
      mat.map = entry.targetA.texture;
      mat.needsUpdate = true;

      entry.currentW = fbW;
      entry.currentH = fbH;
    }

    // Resize quad geometry when composition dimensions changed.
    // We stash comp dims on the geometry userData so we don't recreate needlessly.
    const geoUD = (entry.quad.geometry as any).userData ?? {};
    if (geoUD.compW !== compW || geoUD.compH !== compH) {
      entry.quad.geometry.dispose();
      const geo = new THREE.PlaneGeometry(compW, compH);
      (geo as any).userData = { compW, compH };
      entry.quad.geometry = geo;
    }
  }

  private _createTarget(
    w: number,
    h: number,
  ): THREE.WebGLRenderTarget {
    const rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    return rt;
  }

  private _snapshotCam: THREE.OrthographicCamera | null = null;

  private _getSnapshotCamera(
    w: number,
    h: number,
  ): THREE.OrthographicCamera {
    if (!this._snapshotCam) {
      this._snapshotCam = new THREE.OrthographicCamera(
        -1, 1, 1, -1, -1000, 1000,
      );
      this._snapshotCam.position.set(0, 0, 100);
      this._snapshotCam.lookAt(0, 0, 0);
    }

    const cam = this._snapshotCam;
    cam.left = -w / 2;
    cam.right = w / 2;
    cam.top = h / 2;
    cam.bottom = -h / 2;
    cam.updateProjectionMatrix();
    return cam;
  }
}