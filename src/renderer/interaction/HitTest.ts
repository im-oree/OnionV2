/**
 * HitTester — raycasts into the scene to find which layer group is under a
 * screen-space cursor.
 *
 * Handles three mesh cases per layer:
 *   1. Regular layers   → visible `${id}_mesh` inside the group
 *   2. Effect-active    → visible `${id}_effect_result` quad; original hidden
 *   3. 3D model layers  → `${id}_mesh` is intentionally hidden (invisible
 *      1×1×1 box); the real geometry lives inside `_modelGroup` (a child
 *      of the layer group) with GLTF-assigned names. We must traverse into
 *      the group and collect ALL visible meshes, then trace hits back up
 *      to the enclosing layer group to determine the layer ID.
 */
import * as THREE from 'three';
import type { CameraManager } from '../CameraManager';
import type { SceneManager } from '../SceneManager';

export interface HitResult {
  layerId: string;
  point: THREE.Vector3;
  distance: number;
}

export class HitTester {
  private raycaster = new THREE.Raycaster();
  private sceneManager: SceneManager;
  private cameraManager: CameraManager;

  constructor(sceneManager: SceneManager, cameraManager: CameraManager) {
    this.sceneManager = sceneManager;
    this.cameraManager = cameraManager;
  }

  hitTest(
    screenX: number,
    screenY: number,
    layerIds: string[],
  ): HitResult | null {
    const ndcX = (screenX / this.cameraManager.viewportWidth) * 2 - 1;
    const ndcY = -(screenY / this.cameraManager.viewportHeight) * 2 + 1;

    this.raycaster.setFromCamera(
      new THREE.Vector2(ndcX, ndcY),
      this.cameraManager.getActiveCamera(),
    );

    // CRITICAL: Update all world matrices so group transforms are baked
    this.sceneManager.scene.updateMatrixWorld(true);

    // Map every collectible mesh to its owning layer group so we can
    // resolve the layer ID after the raycast returns.
    const meshToLayerId = new Map<THREE.Object3D, string>();
    const meshes: THREE.Mesh[] = [];

    // Iterate in reverse so topmost (last drawn) is preferred on ties.
    for (let i = layerIds.length - 1; i >= 0; i--) {
      const id = layerIds[i];
      const group = this.sceneManager.layerGroup.getObjectByName(id);
      if (!group || !group.visible) continue;

      // ── Case 2: effect quad replaces the layer visually ────────────
      const effectQuad = group.getObjectByName(`${id}_effect_result`);
      if (
        effectQuad instanceof THREE.Mesh &&
        effectQuad.visible
      ) {
        meshes.push(effectQuad);
        meshToLayerId.set(effectQuad, id);
        continue;
      }

      // ── Case 1: standard visible base mesh ─────────────────────────
      const baseMesh = group.getObjectByName(`${id}_mesh`);
      const baseVisible =
        baseMesh instanceof THREE.Mesh && baseMesh.visible;

      if (baseVisible) {
        meshes.push(baseMesh as THREE.Mesh);
        meshToLayerId.set(baseMesh as THREE.Mesh, id);
      }

      // ── Case 3: 3D model layer OR any other child meshes ───────────
      // Base mesh may be hidden (Model3DLayerRenderer sets it invisible),
      // but the real GLTF geometry lives inside child groups. Collect
      // every visible descendant mesh whose name isn't the base mesh
      // itself (to avoid double-counting) and isn't the effect quad.
      group.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        if (!obj.visible) return;
        if (obj === baseMesh) return; // already handled above
        if (obj === effectQuad) return;
        if (obj.name === `${id}_mesh`) return;
        if (obj.name === `${id}_effect_result`) return;

        // Skip extrusion side meshes — they're decorative sides of
        // solid/shape layers and would still resolve to the same layer ID
        // via the parent chain, but we'd rather hit the front face first.
        // Include them anyway so clicking the side still selects the layer.
        meshes.push(obj);
        meshToLayerId.set(obj, id);
      });
    }

    if (meshes.length === 0) return null;

    // recursive:false — we already flattened descendants ourselves,
    // and enabling recursive would double-count and inflate cost.
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0) return null;

    // First hit is nearest (three.js sorts by distance ascending).
    const hit = intersects[0];

    // Resolve layer ID: prefer the direct map, otherwise walk up the
    // parent chain until we find an object whose name is in layerIds.
    let layerId = meshToLayerId.get(hit.object) ?? null;
    if (!layerId) {
      let cur: THREE.Object3D | null = hit.object;
      const idSet = new Set(layerIds);
      while (cur) {
        if (cur.name && idSet.has(cur.name)) {
          layerId = cur.name;
          break;
        }
        cur = cur.parent;
      }
    }

    if (!layerId) return null;

    return {
      layerId,
      point: hit.point.clone(),
      distance: hit.distance,
    };
  }

  dispose(): void {}
}