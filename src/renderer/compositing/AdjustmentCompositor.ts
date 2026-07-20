/**
 * AdjustmentCompositor — implements "effect layer that affects everything below".
 *
 * For each adjustment layer in the composition, this class:
 *   1. Snapshots the current framebuffer (everything rendered below the adjustment)
 *      into an FBO sized to the composition.
 *   2. Runs the adjustment's effect chain on that snapshot.
 *   3. Displays the processed result on a screen-aligned quad positioned to
 *      cover the composition bounds.
 *
 * The main Renderer sequences layers so that:
 *   - Layers BELOW the adjustment render first (renderOrder lower).
 *   - The adjustment's compositor quad renders next.
 *   - Layers ABOVE the adjustment render on top.
 *
 * Because all layer materials use depthTest:false, this ordering is
 * controlled purely by renderOrder — which LayerSync already sets from zIndex.
 */
import * as THREE from 'three';
import { EffectChain } from '../effects/EffectChain';
import { useEffectsStore } from '../../state/effectsStore';
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

  /**
   * Cached list of layer→adjustment assignments for the current frame.
   * `layerId → adjustmentLayerId | null` — null means "no adjustment above it".
   */
  private layerAdjustmentMap = new Map<string, string | null>();

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

  /**
   * Called by Renderer before layer visibility is applied.
   * Determines which adjustment layers are active for this frame and
   * ensures their compositor quads exist in the scene.
   */
  prepareFrame(layers: Layer[], compWidth: number, compHeight: number, currentFrame: number): void {
    this.activeAdjustmentIds.clear();
    this.layerAdjustmentMap.clear();

    // Sort by zIndex ascending (bottom-to-top rendering order)
    const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    const effectsStore = useEffectsStore.getState();

    let currentAdjustmentId: string | null = null;

    for (const layer of sorted) {
      const inRange = currentFrame >= layer.startFrame && currentFrame <= layer.endFrame;
      const visible = layer.visible && inRange;

      if (layer.type === 'adjustment') {
        const fx = (effectsStore.effectsByLayer[layer.id] ?? []).filter(e => e.enabled);
        if (visible && fx.length > 0) {
          this._ensureEntry(layer.id, compWidth, compHeight);
          this.activeAdjustmentIds.add(layer.id);
          currentAdjustmentId = layer.id;
        } else {
          this._removeEntry(layer.id);
        }
        continue;
      }

      // Regular layer: assign it to the most recent adjustment (if any)
      if (visible) {
        this.layerAdjustmentMap.set(layer.id, currentAdjustmentId);
      }
    }

    // GC quads for adjustments no longer active
    for (const [id] of this.entries) {
      if (!this.activeAdjustmentIds.has(id)) {
        this._removeEntry(id);
      }
    }
  }

  /** True if there is at least one active adjustment layer to process this frame. */
  get hasActiveAdjustments(): boolean {
    return this.activeAdjustmentIds.size > 0;
  }

  /**
   * Execute the adjustment pipeline. Call AFTER LayerSync has updated
   * visibility/transforms but BEFORE the final scene render.
   *
   * For each adjustment (bottom-to-top):
   *   1. Hide all layers ABOVE this adjustment (they should not appear in
   *      the snapshot).
   *   2. Hide all OTHER adjustments' quads (only prior ones should be
   *      composited-in).
   *   3. Render the scene to a compositor FBO — this captures everything
   *      below the adjustment as it will actually appear on screen.
   *   4. Run the adjustment's effect chain on that snapshot.
   *   5. Bind the processed texture to the adjustment's on-scene quad.
   *   6. Hide the layers that were below (they are now included in the
   *      adjustment quad's texture, so drawing them again would double).
   *
   * Finally, layers ABOVE the top adjustment are shown for the final render.
   */
  execute(layers: Layer[], compWidth: number, compHeight: number): void {
    if (this.activeAdjustmentIds.size === 0) return;

    const w = Math.max(1, Math.ceil(compWidth));
    const h = Math.max(1, Math.ceil(compHeight));

    // Save renderer state
    const oldTarget = this.renderer.getRenderTarget();
    const oldViewport = new THREE.Vector4();
    const oldScissor = new THREE.Vector4();
    this.renderer.getViewport(oldViewport);
    this.renderer.getScissor(oldScissor);
    const oldScissorTest = this.renderer.getScissorTest();
    const oldClearColor = new THREE.Color();
    this.renderer.getClearColor(oldClearColor);
    const oldClearAlpha = this.renderer.getClearAlpha();

    // Save mesh visibility so we can restore after each snapshot
    const savedVisibility = new Map<string, boolean>();
    for (const l of layers) {
      const r = this.layerSync.getRenderer(l.id);
      if (r) savedVisibility.set(l.id, r.group.visible);
    }
    // Save quad visibility
    const savedQuadVis = new Map<string, boolean>();
    for (const [id, entry] of this.entries) {
      savedQuadVis.set(id, entry.quad.visible);
    }

    // Prepare offscreen camera that frames the composition rectangle 1:1.
    // We render into an FBO that is compWidth × compHeight; the ortho camera
    // spans exactly the composition, so pixel coords match texture coords.
    const cam = this._getSnapshotCamera(w, h);

    // Adjustments in bottom-to-top order
    const adjustmentsOrdered = layers
      .filter(l => this.activeAdjustmentIds.has(l.id))
      .sort((a, b) => a.zIndex - b.zIndex);

    // Track which layers have already been "consumed" by a previous adjustment.
    // Consumed layers should be hidden for subsequent snapshots so they aren't
    // double-processed. Their compositing role is now played by the adjustment
    // quad below them (which already contains their image).
    const consumed = new Set<string>();

    try {
      for (let i = 0; i < adjustmentsOrdered.length; i++) {
        const adj = adjustmentsOrdered[i];
        const entry = this.entries.get(adj.id);
        if (!entry) continue;

        this._resizeEntry(entry, w, h);

        // Determine which layers should be visible for THIS snapshot:
        //   - All layers with zIndex < adj.zIndex that are not yet consumed
        //   - Previous adjustment quads (they hold prior composited results)
        for (const l of layers) {
          const r = this.layerSync.getRenderer(l.id);
          if (!r) continue;
          const wasVisible = savedVisibility.get(l.id) ?? false;
          if (l.id === adj.id) {
            r.group.visible = false; // adjustment itself never renders
          } else if (l.zIndex < adj.zIndex && !consumed.has(l.id)) {
            r.group.visible = wasVisible;
          } else {
            r.group.visible = false;
          }
        }

        // Show only prior adjustment quads (zIndex < adj.zIndex).
        for (const [otherId, otherEntry] of this.entries) {
          if (otherId === adj.id) {
            otherEntry.quad.visible = false; // hide our own quad while snapshotting
            continue;
          }
          const other = layers.find(l => l.id === otherId);
          otherEntry.quad.visible = !!(other && other.zIndex < adj.zIndex);
        }

        // Hide overlays (grid, safe zones, comp bounds) to keep the snapshot clean.
        const gridWas = this.sceneManager.grid.group.visible;
        const safeWas = this.sceneManager.safeZones.group.visible;
        const boundsWas = this.sceneManager.compBounds.group.visible;
        this.sceneManager.grid.group.visible = false;
        this.sceneManager.safeZones.group.visible = false;
        this.sceneManager.compBounds.group.visible = false;

        // Render snapshot into targetA
        this.renderer.setRenderTarget(entry.targetA);
        this.renderer.setViewport(0, 0, w, h);
        this.renderer.setScissor(0, 0, w, h);
        this.renderer.setScissorTest(false);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.clear(true, true, true);
        this.renderer.render(this.sceneManager.scene, cam);

        // Restore overlays for later stages
        this.sceneManager.grid.group.visible = gridWas;
        this.sceneManager.safeZones.group.visible = safeWas;
        this.sceneManager.compBounds.group.visible = boundsWas;

        // Run effect chain
        const effects = (useEffectsStore.getState().effectsByLayer[adj.id] ?? []).filter(e => e.enabled);
        entry.chain.setSource(entry.targetA.texture, w, h);
        const resultTex = entry.chain.render(effects) ?? entry.targetA.texture;

        // Bind result to the quad
        const mat = entry.quad.material as THREE.MeshBasicMaterial;
        mat.map = resultTex;
        mat.opacity = adj.opacity / 100;
        mat.needsUpdate = true;

        // Position quad so it fills the composition, centered at origin
        // (the composition is centered on the origin in world space).
        entry.quad.position.set(0, 0, 0);
        entry.quad.rotation.set(0, 0, 0);
        entry.quad.scale.set(1, 1, 1);
        entry.quad.visible = true;

        // renderOrder: this quad should draw AFTER the layers it's replacing
        // (which have renderOrder derived from zIndex) but BEFORE anything
        // with a higher zIndex than the adjustment. LayerSync sets renderOrder
        // = sortedLen-1-i for each layer (higher zIndex → higher renderOrder).
        // We reuse the adjustment layer's own renderOrder here.
        const adjRenderer = this.layerSync.getRenderer(adj.id);
        if (adjRenderer) {
          entry.quad.renderOrder = adjRenderer.mesh.renderOrder;
        }

        // Mark all layers below as consumed — for the FINAL render they must
        // be hidden (the quad now holds their processed image).
        for (const l of layers) {
          if (l.id === adj.id) continue;
          if (l.zIndex < adj.zIndex) consumed.add(l.id);
        }
      }

      // FINAL VISIBILITY SETUP for the real render pass:
      //   - Consumed layers: hidden
      //   - Adjustment layers themselves: hidden (mesh)
      //   - Adjustment quads: visible
      //   - Layers above the topmost adjustment: visible per original
      for (const l of layers) {
        const r = this.layerSync.getRenderer(l.id);
        if (!r) continue;
        if (l.type === 'adjustment') {
          r.group.visible = false; // mesh is always invisible
          continue;
        }
        if (consumed.has(l.id)) {
          r.group.visible = false;
        } else {
          r.group.visible = savedVisibility.get(l.id) ?? false;
        }
      }
      for (const [id, entry] of this.entries) {
        entry.quad.visible = this.activeAdjustmentIds.has(id);
      }
    } finally {
      // Restore renderer state
      this.renderer.setRenderTarget(oldTarget);
      this.renderer.setViewport(oldViewport);
      this.renderer.setScissor(oldScissor);
      this.renderer.setScissorTest(oldScissorTest);
      this.renderer.setClearColor(oldClearColor, oldClearAlpha);
    }
  }

  /**
   * Restore all layer visibility after the final render pass. Called by
   * Renderer at the end of beforeRender so subsequent frames start fresh
   * (in case adjustments disappear).
   */
  restoreVisibility(layers: Layer[], currentFrame: number): void {
    for (const l of layers) {
      const r = this.layerSync.getRenderer(l.id);
      if (!r) continue;
      if (l.type === 'adjustment') {
        r.group.visible = false;
        continue;
      }
      const inRange = currentFrame >= l.startFrame && currentFrame <= l.endFrame;
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

  private _ensureEntry(adjId: string, w: number, h: number): void {
    if (this.entries.has(adjId)) return;

    const chain = new EffectChain(this.renderer);
    const targetA = this._createTarget(w, h);
    const targetB = this._createTarget(w, h);

    const geo = new THREE.PlaneGeometry(w, h);
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

    // Add to the layer group so it participates in scene render ordering.
    this.sceneManager.layerGroup.add(quad);

    this.entries.set(adjId, { chain, quad, targetA, targetB, currentW: w, currentH: h });
  }

  private _removeEntry(adjId: string): void {
    const entry = this.entries.get(adjId);
    if (!entry) return;
    entry.chain.dispose();
    entry.quad.parent?.remove(entry.quad);
    entry.quad.geometry.dispose();
    if (entry.quad.material instanceof THREE.Material) entry.quad.material.dispose();
    entry.targetA.dispose();
    entry.targetB.dispose();
    this.entries.delete(adjId);
  }

  private _resizeEntry(entry: CompositorEntry, w: number, h: number): void {
    if (entry.currentW === w && entry.currentH === h) return;
    entry.targetA.dispose();
    entry.targetB.dispose();
    entry.targetA = this._createTarget(w, h);
    entry.targetB = this._createTarget(w, h);
    entry.quad.geometry.dispose();
    entry.quad.geometry = new THREE.PlaneGeometry(w, h);
    entry.currentW = w;
    entry.currentH = h;
  }

  private _createTarget(w: number, h: number): THREE.WebGLRenderTarget {
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

  private _getSnapshotCamera(w: number, h: number): THREE.OrthographicCamera {
    if (!this._snapshotCam) {
      this._snapshotCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
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