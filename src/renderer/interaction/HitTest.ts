/**
 * HitTester — raycasts into the scene to find which layer mesh is under a screen-space cursor.
 * Must call scene.updateMatrixWorld(true) before each intersection so that
 * group transforms (position/rotation/scale) are baked into world space.
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

  hitTest(screenX: number, screenY: number, layerIds: string[]): HitResult | null {
    const ndcX = (screenX / this.cameraManager.viewportWidth) * 2 - 1;
    const ndcY = -(screenY / this.cameraManager.viewportHeight) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.cameraManager.camera);

    // CRITICAL: Update all world matrices so group transforms are baked
    this.sceneManager.scene.updateMatrixWorld(true);

    // Collect meshes by iterating layer groups (groups are named by layerId).
    // Iterate in reverse order so topmost (last drawn) is tested first.
    // When effects are active, the original mesh is hidden and an effect quad
    // (${id}_effect_result) replaces it visually. We must check for both.
    const meshes: THREE.Mesh[] = [];
    for (let i = layerIds.length - 1; i >= 0; i--) {
      const id = layerIds[i];
      const group = this.sceneManager.layerGroup.getObjectByName(id);
      if (!group) continue;

      // Prefer the visible mesh: either the original or the effect quad
      const originalMesh = group.getObjectByName(`${id}_mesh`);
      const effectQuad = group.getObjectByName(`${id}_effect_result`);

      if (effectQuad instanceof THREE.Mesh && effectQuad.visible && effectQuad.parent?.visible !== false) {
        // Effect is active — use the effect quad for hit-testing
        meshes.push(effectQuad);
      } else if (originalMesh instanceof THREE.Mesh && originalMesh.visible && originalMesh.parent?.visible !== false) {
        // No effects — use the original mesh
        meshes.push(originalMesh);
      }
    }

    if (meshes.length === 0) return null;

    // Use recursive=true so raycaster traverses into children (it won't since meshes are direct children)
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const name = hit.object.name;
    // Handle both original mesh (${id}_mesh) and effect quad (${id}_effect_result)
    const layerId = name.endsWith('_effect_result')
      ? name.slice(0, -('_effect_result'.length))
      : name.endsWith('_mesh')
        ? name.slice(0, -('_mesh'.length))
        : name;

    return {
      layerId,
      point: hit.point.clone(),
      distance: hit.distance,
    };
  }

  dispose(): void {}
}
