/**
 * ViewSpaceTransform — view-space math for camera-relative drag deltas.
 *
 * Used by ModalTransform (G/R/S shortcuts) and any other transform code
 * that needs to translate screen-space mouse motion into world-space
 * changes that match what the user sees, regardless of camera orientation.
 *
 * All returned world deltas are in AE-space (Y-down inverted, Z as stored
 * in transform3D). CameraManager internally maps GL-space to AE-space via
 * a Z negation in worldToScreen — we mirror that convention here.
 */
import * as THREE from 'three';
import type { CameraManager } from '../CameraManager';

export interface ViewBasis {
  /** Camera right vector in GL world space (unit) */
  right: THREE.Vector3;
  /** Camera up vector in GL world space (unit) */
  up: THREE.Vector3;
  /** Camera forward vector in GL world space (unit, points into scene) */
  forward: THREE.Vector3;
  /** Distance from camera to the reference world point along forward */
  distanceToPoint: number;
  /**
   * World units per screen pixel at the reference point's depth.
   * Multiply screen-pixel deltas by this to get world-unit motion on the
   * camera plane at that depth.
   */
  worldPerPixel: number;
}

export class ViewSpaceTransform {
  constructor(private cameraManager: CameraManager) {}

  /**
   * Compute view basis vectors + world-per-pixel scale factor at a given
   * world-space reference point (typically the layer's transform position
   * or the selection center).
   *
   * Point should be passed in AE-space (matching transform3D.position).
   * Internally we convert to GL-space (negate Z) to match camera math.
   */
  getBasisAt(pointAE: { x: number; y: number; z: number }): ViewBasis {
    const cam = this.cameraManager.getActiveCamera();

    // Camera-relative axes in GL world space
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion).normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).normalize();

    // Convert AE-space point to GL-space
    const pointGL = new THREE.Vector3(pointAE.x, pointAE.y, -pointAE.z);

    // Distance from camera along forward (signed)
    const toPoint = pointGL.clone().sub(cam.position);
    const distanceToPoint = toPoint.dot(forward);

    // Compute world-per-pixel at that depth
    let worldPerPixel = 1;
    if (cam instanceof THREE.PerspectiveCamera) {
      // Height of the view plane at that depth: 2 * dist * tan(fov/2)
      const fovRad = (cam.fov * Math.PI) / 180;
      const worldHeight = 2 * Math.abs(distanceToPoint) * Math.tan(fovRad / 2);
      worldPerPixel = worldHeight / this.cameraManager.viewportHeight;
    } else if (cam instanceof THREE.OrthographicCamera) {
      const worldHeight = (cam.top - cam.bottom) / cam.zoom;
      worldPerPixel = worldHeight / this.cameraManager.viewportHeight;
    } else {
      // Fallback: use CameraManager zoom
      worldPerPixel = 1 / this.cameraManager.zoom;
    }

    return { right, up, forward, distanceToPoint, worldPerPixel };
  }

  /**
   * Convert a screen-pixel delta (mdx, mdy) into a world-space delta on the
   * view plane at the given reference point. Result is in AE-space (Y-down
   * screen mapped so dragging down moves object down in world Y).
   */
  screenDeltaToWorldOnViewPlane(
    mdx: number,
    mdy: number,
    pointAE: { x: number; y: number; z: number },
  ): { x: number; y: number; z: number } {
    const b = this.getBasisAt(pointAE);
    // Screen X goes with camera right; screen Y (down positive) goes with -camera up
    const glDelta = new THREE.Vector3()
      .addScaledVector(b.right, mdx * b.worldPerPixel)
      .addScaledVector(b.up, -mdy * b.worldPerPixel);
    // GL delta → AE delta: negate Z
    return { x: glDelta.x, y: glDelta.y, z: -glDelta.z };
  }

  /**
   * Convert a screen-pixel delta along camera forward (dolly in/out).
   * Positive delta = away from camera.
   */
  screenDeltaAlongForward(
    screenPx: number,
    pointAE: { x: number; y: number; z: number },
  ): { x: number; y: number; z: number } {
    const b = this.getBasisAt(pointAE);
    // Use vertical worldPerPixel as scale so dolly speed matches drag feel
    const worldDist = screenPx * b.worldPerPixel;
    const glDelta = b.forward.clone().multiplyScalar(worldDist);
    return { x: glDelta.x, y: glDelta.y, z: -glDelta.z };
  }

  /**
   * Get the on-screen 2D direction (unit vector, pixels) that a world axis
   * points toward, projected at the given reference point. Used to detect
   * whether dragging "right on screen" should increase or decrease that
   * axis's value.
   *
   * Returns null if the axis is nearly perpendicular to the view (would
   * cause division by ~0).
   */
  axisScreenDirection(
    axis: 'x' | 'y' | 'z',
    pointAE: { x: number; y: number; z: number },
    len = 100,
  ): { dirX: number; dirY: number; worldPerPx: number } | null {
    const origin = this.cameraManager.worldToScreen(
      pointAE.x, pointAE.y, -pointAE.z,
    );
    const tipAE = {
      x: pointAE.x + (axis === 'x' ? len : 0),
      y: pointAE.y + (axis === 'y' ? len : 0),
      z: pointAE.z + (axis === 'z' ? len : 0),
    };
    const tip = this.cameraManager.worldToScreen(
      tipAE.x, tipAE.y, -tipAE.z,
    );
    const dx = tip.x - origin.x;
    const dy = tip.y - origin.y;
    const lenPx = Math.hypot(dx, dy);
    if (lenPx < 0.5) return null;
    return {
      dirX: dx / lenPx,
      dirY: dy / lenPx,
      worldPerPx: len / lenPx,
    };
  }

  /**
   * Camera forward vector in GL space. Used for rotation-around-camera-axis
   * (unconstrained R shortcut in 3D perspective).
   */
  cameraForward(): THREE.Vector3 {
    const cam = this.cameraManager.getActiveCamera();
    return new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).normalize();
  }
}
