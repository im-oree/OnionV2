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
    const meshes: THREE.Mesh[] = [];
    for (let i = layerIds.length - 1; i >= 0; i--) {
      const id = layerIds[i];
      const group = this.sceneManager.layerGroup.getObjectByName(id);
      if (group) {
        const mesh = group.getObjectByName(`${id}_mesh`);
        if (mesh instanceof THREE.Mesh && mesh.visible && mesh.parent?.visible !== false) {
          meshes.push(mesh);
        }
      }
    }

    if (meshes.length === 0) return null;

    // Use recursive=true so raycaster traverses into children (it won't since meshes are direct children)
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const name = hit.object.name;
    const layerId = name.endsWith('_mesh') ? name.slice(0, -5) : name;

    return {
      layerId,
      point: hit.point.clone(),
      distance: hit.distance,
    };
  }

  dispose(): void {}
}
