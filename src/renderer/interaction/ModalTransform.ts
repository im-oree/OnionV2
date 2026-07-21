import * as THREE from 'three';
import type { CameraManager } from '../CameraManager';
import { useCompositionStore } from '../../state/compositionStore';
import { useSelectionStore } from '../../state/selectionStore';
import { useViewportStore } from '../../state/viewportStore';
import { registerModalActiveCheck, registerForceCancelModal } from '../../input/ShortcutRegistry';
import { Snapping, type SnapTargets, type LayerSnapRect } from '../utils/Snapping';
import type { Layer } from '../../types/layer';
import { useTimelineStore } from '../../state/timelineStore';
import { useKeyframeStore } from '../../state/keyframeStore';
import { autoKeyTransform } from './KeyframeHelpers';

export type TransformMode = 'grab' | 'rotate' | 'scale' | 'perspective';

export interface TransformInfo {
  mode: TransformMode | null;
  active: boolean;
  axisLock: 'x' | 'y' | null;
  axisExclude: 'x' | 'y' | null;
  deltaX: number;
  deltaY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  numericBuffer: string;
  precisionMode: boolean;
  snapMode: boolean;
}

interface LayerSnapshot {
  pos: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  // 3D snapshots
  pos3d?: { x: number; y: number; z: number };
  scale3d?: { x: number; y: number; z: number };
  rotX?: number;
  rotY?: number;
  rotZ?: number;
}

declare global {
  interface Document {
    _lastMouseEvent?: MouseEvent;
  }
}

export class ModalTransform {
  static activeAnywhere = false;

  private cameraManager: CameraManager;
  private snapping: Snapping;
  private _mode: TransformMode | null = null;
  private _active = false;
  private _axisLock: 'x' | 'y' | null = null;
  private _axisExclude: 'x' | 'y' | null = null;
  private _accumulatedDelta = { x: 0, y: 0 };
  private _numericBuffer = '';
  private _numericActive = false;
  private _precisionMode = false;
  private _snapMode = false;
  private _aspectLock = false;
  private _startTransforms = new Map<string, LayerSnapshot>();
  public startMouseScreen = { x: 0, y: 0 };
  private _handlePivotWorld: { x: number; y: number } | null = null;
  /** M3: Store the initial mouse-to-pivot angle when rotate starts */
  private _startRotateAngle: number | null = null;
  private _compId: string | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _exitingByChoice = false;
  private _onStateChange: ((info: TransformInfo) => void) | null = null;
  private _boundPointerLockChange: (() => void) | null = null;
  private _cachedSnapTargets: SnapTargets | null = null;
  private _pendingFirstDelta = false;
  private _undoBeforeSnapshot: string | null = null;
  public lastSnapLines: Array<{ type: 'horizontal' | 'vertical'; position: number }> = [];

  constructor(cameraManager: CameraManager, snapping?: Snapping) {
    this.cameraManager = cameraManager;
    this.snapping = snapping ?? new Snapping();
    // Safety: the static flag must match instance _active — if they diverge
    // (e.g., pointer lock edge case), the flag is corrected to unblock shortcuts.
    registerModalActiveCheck(() => {
      if (ModalTransform.activeAnywhere && !this._active) {
        ModalTransform.activeAnywhere = false;
      }
      return ModalTransform.activeAnywhere;
    });

    // Escape hatch: when shortcuts are frozen because activeAnywhere is stuck
    // and the docKeydown listener wasn't attached, this forcibly cleans up.
    registerForceCancelModal(() => this.cancel());
    document.addEventListener('mousemove', (e) => { document._lastMouseEvent = e; }, { passive: true });
  }

  start(mode: TransformMode, canvas?: HTMLCanvasElement): void {
    if (this._active) this.cancel();

    const layerIds = useSelectionStore.getState().getSelectedIds();
    if (layerIds.length === 0) {
      // No layers to transform — don't set active flags
      return;
    }

    const compState = useCompositionStore.getState();
    const compId = compState.activeCompositionId;
    if (!compId) return;
    const comp = compState.compositions.find((c) => c.id === compId);
    if (!comp) return;

    const startTransforms = new Map<string, LayerSnapshot>();
    for (const id of layerIds) {
      const layer = comp.layers.find((l) => l.id === id);
      if (layer) {
        const snap: LayerSnapshot = {
          pos: { ...layer.transform.position },
          scale: { ...layer.transform.scale },
          rotation: layer.transform.rotation,
        };
        if (layer.is3D && layer.transform3D) {
          snap.pos3d = { ...layer.transform3D.position };
          snap.scale3d = { ...layer.transform3D.scale };
          snap.rotX = layer.transform3D.rotationX;
          snap.rotY = layer.transform3D.rotationY;
          snap.rotZ = layer.transform3D.rotationZ;
        }
        startTransforms.set(id, snap);
      }
    }
    if (startTransforms.size === 0) return;

    // M15: FULLY reset all state fields before starting
    this._mode = mode;
    this._active = true;
    ModalTransform.activeAnywhere = true;
    document.dispatchEvent(new CustomEvent('renderer:interactive', { detail: { on: true } }));
    this._axisLock = null;
    this._axisExclude = null;
    this._accumulatedDelta = { x: 0, y: 0 };
    this._numericBuffer = '';
    this._numericActive = false;
    this._precisionMode = false;
    this._snapMode = false;
    this._aspectLock = false;
    this._startTransforms = startTransforms;
    const mouseEv = document._lastMouseEvent;
    this.startMouseScreen = mouseEv ? { x: mouseEv.clientX, y: mouseEv.clientY } : { x: 0, y: 0 };
    this._compId = compId;
    this._exitingByChoice = false;
    this._cachedSnapTargets = null;
    this._handlePivotWorld = null;
    this._startRotateAngle = null;
    this.lastSnapLines = [];
    this._pendingFirstDelta = canvas ? true : false;
    this._cachedSnapTargets = this._buildSnapTargets(comp, layerIds);

    // Capture undo snapshot at drag start (the "before" state)
    this._captureUndoSnapshot();

    if (canvas) {
      this._canvas = canvas;
      this._boundPointerLockChange = this._onPointerLockChange.bind(this);
      document.addEventListener('pointerlockchange', this._boundPointerLockChange);
      canvas.requestPointerLock().catch(() => { this._canvas = null; });
    }

    this._emitState();
  }

  updateDelta(movementX: number, movementY: number): void {
    if (!this._active || !this._mode || !this._compId) return;
    if (useSelectionStore.getState().getSelectedIds().length === 0) { this.cancel(); return; }
    if (this._pendingFirstDelta) {
      // First mousemove after pointer lock — record the delta but don't skip it entirely.
      // Reset accumulated delta to 0 and apply the current movement to avoid a jump from
      // any stale pre-lock mouse position, while still capturing the user's first motion.
      this._pendingFirstDelta = false;
      this._accumulatedDelta = { x: 0, y: 0 };
      // Apply this first movement so the user doesn't lose the initial drag
      this._accumulatedDelta.x += movementX;
      this._accumulatedDelta.y -= movementY;
      this._applyTransform();
      this._emitState();
      return;
    }
    this.clearNumeric();
    this._accumulatedDelta.x += movementX;
    this._accumulatedDelta.y -= movementY;
    this._applyTransform();
    this._emitState();
  }

  updateDirectDrag(dx: number, dy: number): void {
    if (!this._active || !this._mode || !this._compId) return;
    if (useSelectionStore.getState().getSelectedIds().length === 0) { this.cancel(); return; }
    this.clearNumeric();
    this._accumulatedDelta.x += dx;
    this._accumulatedDelta.y -= dy;
    this._applyTransform();
    this._emitState();
  }

  confirm(): void {
    if (!this._active) return;
    this._releasePointerLock();
    document.dispatchEvent(new CustomEvent('renderer:interactive', { detail: { on: false } }));
    this._active = false;
    ModalTransform.activeAnywhere = false;
    this.lastSnapLines = [];
    this._cachedSnapTargets = null;
    this._handlePivotWorld = null;
    this._startRotateAngle = null;
    this._emitState();

    // Auto-keying: if autoKey is ON, insert keyframes for the changed transforms
    this._autoKeyChangedTransforms();

    // Clear Z-axis and Blender key active flags
    (window as any).__moveZActive = false;
    (window as any).__pendingBlenderKey = null;
    (window as any).__3DAxisLock = null;

    // Push a single undo entry for the complete drag operation
    const snapshot = this._captureUndoSnapshot();
    if (snapshot) {
      import('../../state/historyStore').then(m => {
        m.useHistoryStore.getState().pushEntry('Transform', snapshot);
      });
    }
  }

  /** Insert keyframes for any transform values that changed after a drag.
   *  - If autoKey is ON: always keyframe changed properties.
   *  - If autoKey is OFF but the layer already has keyframes on a property:
   *    insert/update a keyframe at the current frame so the keyframe engine
   *    doesn't override the user's new position with stale interpolated values.
   */
  private _autoKeyChangedTransforms(): void {
    const compId = this._compId;
    if (!compId) return;

    const compState = useCompositionStore.getState();
    const comp = compState.compositions.find(c => c.id === compId);
    if (!comp) return;

    const currentFrame = Math.round(comp.currentTime * comp.fps);
    const autoKey = useTimelineStore.getState().autoKey;
    const engine = useKeyframeStore.getState().engine;

    for (const [layerId, start] of this._startTransforms) {
      const layer = comp.layers.find(l => l.id === layerId);
      if (!layer) continue;

      // Determine which properties actually changed
      const t = layer.transform;
      const changedProps: Array<{ prop: string; value: number | number[] }> = [];

      if (t.position.x !== start.pos.x || t.position.y !== start.pos.y) {
        changedProps.push({ prop: 'transform.position', value: [t.position.x, t.position.y] });
      }
      if (t.scale.x !== start.scale.x || t.scale.y !== start.scale.y) {
        changedProps.push({ prop: 'transform.scale', value: [t.scale.x, t.scale.y] });
      }
      if (t.rotation !== start.rotation) {
        changedProps.push({ prop: 'transform.rotation', value: t.rotation });
      }

      // Also detect 3D transform changes
      if (start.pos3d) {
        const t3d = (layer as any).transform3D;
        if (t3d) {
          if (t3d.rotationZ !== start.rotZ) {
            changedProps.push({ prop: 'transform3D.rotationZ', value: t3d.rotationZ });
          }
          if (t3d.position.z !== start.pos3d.z) {
            changedProps.push({ prop: 'transform3D.position.z', value: t3d.position.z });
          }
          if (t3d.scale.z !== start.scale3d?.z) {
            changedProps.push({ prop: 'transform3D.scale.z', value: t3d.scale.z });
          }
          if (t3d.rotationX !== start.rotX) {
            changedProps.push({ prop: 'transform3D.rotationX', value: t3d.rotationX });
          }
          if (t3d.rotationY !== start.rotY) {
            changedProps.push({ prop: 'transform3D.rotationY', value: t3d.rotationY });
          }
        }
      }

      if (changedProps.length === 0) continue;

      // For each changed property, decide whether to insert a keyframe:
      //   - autoKey ON: always insert
      //   - autoKey OFF but property already has keyframes: insert (prevent override)
      for (const { prop, value } of changedProps) {
        const hasKeyframes = engine.getKeyframesForProperty(layerId, prop).length > 0;
        if (!autoKey && !hasKeyframes) continue;

        autoKeyTransform(layerId, layer.transform, start, currentFrame, start, (layer as any).transform3D ?? null);
        break; // autoKeyTransform handles all changed props for this layer
      }
    }
  }

  cancel(): void {
    if (!this._active) return;
    ModalTransform.activeAnywhere = false;
    if (this._compId) {
      for (const [layerId, start] of this._startTransforms) {
        useCompositionStore.getState().updateLayer(this._compId, layerId, {
          transform: {
            position: { ...start.pos },
            scale: { ...start.scale },
            rotation: start.rotation,
            anchorPoint: { x: 0, y: 0 },
          },
        }, true);
        // Also restore transform3D for 3D layers
        if (start.pos3d) {
          const layer = useCompositionStore.getState().compositions.find(c=>c.id===this._compId)?.layers.find(l=>l.id===layerId);
          if (layer?.transform3D) {
            useCompositionStore.getState().updateLayer(this._compId, layerId, {
              transform3D: {
                ...layer.transform3D,
                position: { ...start.pos3d },
                scale: { ...start.scale3d! },
                rotationX: start.rotX ?? 0,
                rotationY: start.rotY ?? 0,
                rotationZ: start.rotZ ?? 0,
              },
            }, true);
          }
        }
      }
    }
    // Clear Z-axis and Blender key active flags
    (window as any).__moveZActive = false;
    (window as any).__pendingBlenderKey = null;
    (window as any).__3DAxisLock = null;
    this._releasePointerLock();
    this._active = false;
    this.lastSnapLines = [];
    this._cachedSnapTargets = null;
    this._handlePivotWorld = null;
    this._startRotateAngle = null;
    this._emitState();
  }

  setAxisLock(axis: 'x' | 'y' | null): void {
    this._axisLock = this._axisLock === axis ? null : axis;
    this._axisExclude = null;
    this._applyTransform();
    this._emitState();
  }

  setAxisExclude(axis: 'x' | 'y' | null): void {
    this._axisExclude = this._axisExclude === axis ? null : axis;
    this._axisLock = null;
    this._applyTransform();
    this._emitState();
  }

  setPrecisionMode(on: boolean): void { this._precisionMode = on; }
  setSnapMode(on: boolean): void { this._snapMode = on; }
  setAspectLock(on: boolean): void { this._aspectLock = on; }
  setStartMouseScreen(x: number, y: number): void { this.startMouseScreen = { x, y }; }
  setHandlePivotWorld(pivot: { x: number; y: number } | null): void { this._handlePivotWorld = pivot; }

  pushNumericChar(ch: string): void {
    if (!this._active) return;
    if (!/^[0-9.\-]$/.test(ch)) return;
    this._numericBuffer += ch;
    this._numericActive = this._numericBuffer.length > 0;
    this._applyTransform();
    this._emitState();
  }

  clearNumeric(): void {
    if (!this._numericActive) return;
    this._numericBuffer = '';
    this._numericActive = false;
  }

  backspaceNumeric(): void {
    if (!this._active) return;
    this._numericBuffer = this._numericBuffer.slice(0, -1);
    this._numericActive = this._numericBuffer.length > 0;
    this._applyTransform();
    this._emitState();
  }

  get active(): boolean { return this._active; }
  get mode(): TransformMode | null { return this._mode; }
  get axisLock(): 'x' | 'y' | null { return this._axisLock; }
  get axisExclude(): 'x' | 'y' | null { return this._axisExclude; }

  getTransformInfo(): TransformInfo {
    return {
      mode: this._mode, active: this._active,
      axisLock: this._axisLock, axisExclude: this._axisExclude,
      deltaX: this._accumulatedDelta.x, deltaY: this._accumulatedDelta.y,
      rotation: 0, scaleX: 1, scaleY: 1,
      numericBuffer: this._numericBuffer,
      precisionMode: this._precisionMode, snapMode: this._snapMode,
    };
  }

  setOnStateChange(cb: (info: TransformInfo) => void): void { this._onStateChange = cb; }

  private _applyTransform(): void {
    if (!this._mode || !this._compId) return;
    const {
      _compId, _mode, _accumulatedDelta: delta,
      _axisLock, _axisExclude,
      _numericBuffer, _numericActive,
      _precisionMode, _snapMode, _aspectLock,
      _startTransforms, _cachedSnapTargets,
    } = this;
    const zoom = this.cameraManager.zoom;
    const store = useCompositionStore.getState();
    const globalSnap = useViewportStore.getState().settings.snappingEnabled;
    const useSnap = (_snapMode || globalSnap) && _mode === 'grab' && _cachedSnapTargets;

    if (_numericActive) {
      const val = parseFloat(_numericBuffer) || 0;
      for (const [layerId, start] of _startTransforms) {
        if (_mode === 'grab') {
          const nx = (_axisLock === 'y' || _axisExclude === 'x') ? start.pos.x : start.pos.x + val;
          const ny = (_axisLock === 'x' || _axisExclude === 'y') ? start.pos.y : start.pos.y + val;
          store.updateLayer(_compId, layerId, {
            transform: { position: { x: nx, y: ny }, scale: start.scale, rotation: start.rotation, anchorPoint: { x: 0, y: 0 } },
          }, true);
        } else if (_mode === 'rotate') {
          const snapped = _snapMode ? Math.round(val / 5) * 5 : val;
          store.updateLayer(_compId, layerId, {
            transform: { position: start.pos, scale: start.scale, rotation: start.rotation + snapped, anchorPoint: { x: 0, y: 0 } },
          }, true);
        } else if (_mode === 'scale') {
          const v = val / 100;
          const sx = (_axisLock === 'y' || _axisExclude === 'x') ? start.scale.x : start.scale.x * v;
          const sy = (_axisLock === 'x' || _axisExclude === 'y') ? start.scale.y : start.scale.y * v;
          store.updateLayer(_compId, layerId, {
            transform: { position: start.pos, scale: { x: Math.max(0.01, sx), y: Math.max(0.01, sy) }, rotation: start.rotation, anchorPoint: { x: 0, y: 0 } },
          }, true);
        }
      }
      return;
    }

    switch (_mode) {
      case 'grab': {
        // 3D perspective-aware movement: project screen delta onto camera view plane
        const is3DPerspective = !!(window as any).__perspectiveActive;

        if (is3DPerspective) {
          const cam = (window as any).__perspectiveCamera as any;
          if (cam) {
            // Camera's local right and up vectors
            const camRight = new THREE.Vector3(1, 0, 0);
            const camUp = new THREE.Vector3(0, 1, 0);
            camRight.applyQuaternion(cam.quaternion);
            camUp.applyQuaternion(cam.quaternion);

            let moveX = delta.x / zoom;
            let moveY = -delta.y / zoom;

            if (_axisLock === 'x' || _axisExclude === 'y') moveY = 0;
            if (_axisLock === 'y' || _axisExclude === 'x') moveX = 0;
            if (_precisionMode) { moveX *= 0.1; moveY *= 0.1; }

            // Z-axis lock: move along camera forward
            const z3dLock = (window as any).__3DAxisLock;
            if (z3dLock === 'z') {
              const camForward = new THREE.Vector3(0, 0, -1);
              camForward.applyQuaternion(cam.quaternion);
              for (const [layerId, start] of _startTransforms) {
                const layer = useCompositionStore.getState().compositions.find(c=>c.id===_compId)?.layers.find(l=>l.id===layerId);
                if (!layer) continue;
                const posLocked = (layer.lockedProperties ?? {})['transform.position'];
                if (posLocked) continue;
                if (layer.is3D && layer.transform3D && start.pos3d) {
                  const nx = start.pos3d.x + camForward.x * moveY * 2;
                  const ny = start.pos3d.y + camForward.y * moveY * 2;
                  const nz = start.pos3d.z + camForward.z * moveY * 2;
                  store.updateLayer(_compId, layerId, {
                    transform3D: { ...layer.transform3D, position: { x: nx, y: ny, z: nz } },
                    transform: { ...layer.transform, position: { x: nx, y: ny } },
                  }, true);
                }
              }
              break;
            }

            // Normal 3D movement on camera plane
            for (const [layerId, start] of _startTransforms) {
              const layer = useCompositionStore.getState().compositions.find(c=>c.id===_compId)?.layers.find(l=>l.id===layerId);
              if (!layer) continue;
              // Skip locked position
              const posLocked = (layer.lockedProperties ?? {})['transform.position'];
              if (posLocked) continue;

              if (layer.is3D && layer.transform3D && start.pos3d) {
                const newX = start.pos3d.x + camRight.x * moveX + camUp.x * moveY;
                const newY = start.pos3d.y + camRight.y * moveX + camUp.y * moveY;
                const newZ = start.pos3d.z + camRight.z * moveX + camUp.z * moveY;
                store.updateLayer(_compId, layerId, {
                  transform3D: {
                    ...layer.transform3D,
                    position: { x: newX, y: newY, z: newZ },
                  },
                  transform: {
                    ...layer.transform,
                    position: { x: newX, y: newY },
                  },
                }, true);
              } else {
                // Non-3D layer: fall back to 2D movement
                store.updateLayer(_compId, layerId, {
                  transform: {
                    position: { x: start.pos.x + moveX, y: start.pos.y + moveY },
                    scale: start.scale, rotation: start.rotation, anchorPoint: { x: 0, y: 0 },
                  },
                }, true);
              }
            }
            break;
          }
        }

        // Original 2D movement (when not in 3D perspective)
        let gx = delta.x / zoom;
        let gy = delta.y / zoom;

        if (_axisLock === 'x' || _axisExclude === 'y') gy = 0;
        if (_axisLock === 'y' || _axisExclude === 'x') gx = 0;
        if (_precisionMode) { gx *= 0.1; gy *= 0.1; }

        if (useSnap) {
          const movingRect = this._buildMovingSelectionStartBounds();
          if (movingRect) {
            // Zoom-aware threshold: keep 8 screen pixels regardless of zoom level.
            const threshold = 8 / Math.max(0.01, zoom);
            const snapped = this.snapping.snapRect(movingRect, gx, gy, _cachedSnapTargets!, threshold);
            gx = snapped.dx;
            gy = snapped.dy;
            this.lastSnapLines = snapped.snapped ? snapped.lines : [];
          } else {
            this.lastSnapLines = [];
          }
        } else {
          this.lastSnapLines = [];
        }

        // Check if Z-axis dragging is active — route entire Y delta to transform3D.position.z
        const zAxisActive = (window as any).__moveZActive;
        if (zAxisActive) {
          // Use gy (vertical world delta) for Z movement
          const zDelta = gy;
          for (const [layerId, start] of _startTransforms) {
            const layer = useCompositionStore.getState().compositions.find(c=>c.id===_compId)?.layers.find(l=>l.id===layerId);
            if (!layer) continue;
            const posLocked = (layer.lockedProperties ?? {})['transform.position'];
            if (posLocked) continue;
            store.updateLayer(_compId, layerId, {
              transform: {
                position: start.pos,
                scale: start.scale, rotation: start.rotation,
                anchorPoint: { x: 0, y: 0 },
              },
            }, true);
            if (layer.is3D && layer.transform3D && start.pos3d) {
              store.updateLayer(_compId, layerId, {
                transform3D: {
                  ...layer.transform3D,
                  position: { x: start.pos3d.x, y: start.pos3d.y, z: start.pos3d.z + zDelta },
                },
              }, true);
            }
          }
        } else {
          for (const [layerId, start] of _startTransforms) {
            const layer = useCompositionStore.getState().compositions.find(c=>c.id===_compId)?.layers.find(l=>l.id===layerId);
            if (!layer) continue;
            const posLocked = (layer.lockedProperties ?? {})['transform.position'];
            if (posLocked) continue;
            store.updateLayer(_compId, layerId, {
              transform: {
                position: { x: start.pos.x + gx, y: start.pos.y + gy },
                scale: start.scale, rotation: start.rotation,
                anchorPoint: { x: 0, y: 0 },
              },
            }, true);
            // Also update transform3D if layer is 3D
            if (layer.is3D && layer.transform3D && start.pos3d) {
              store.updateLayer(_compId, layerId, {
                transform3D: {
                  ...layer.transform3D,
                  position: { x: start.pos3d.x + gx, y: start.pos3d.y + gy, z: start.pos3d.z },
                },
              }, true);
            }
          }
        }
        break;
      }

      case 'rotate': {
        // Z-axis lock: only rotate around Z (roll) using screen X movement
        const zLock = (window as any).__3DAxisLock as string | undefined;
        let rawAngle: number;
        if (this._handlePivotWorld) {
          // Handle-based rotation: angle from pivot to mouse
          const pivot = this._handlePivotWorld;
          const currentScreenX = this.startMouseScreen.x + delta.x;
          const currentScreenY = this.startMouseScreen.y - delta.y;
          const currentWorld = this.cameraManager.screenToWorld(currentScreenX, currentScreenY);
          if (this._startRotateAngle === null) {
            const startWorld = this.cameraManager.screenToWorld(this.startMouseScreen.x, this.startMouseScreen.y);
            this._startRotateAngle = Math.atan2(startWorld.y - pivot.y, startWorld.x - pivot.x);
          }
          const currentAngle = Math.atan2(currentWorld.y - pivot.y, currentWorld.x - pivot.x);
          rawAngle = (currentAngle - this._startRotateAngle) * (180 / Math.PI);
        } else if (zLock === 'z') {
          // Z rotation: screen X movement = rotation around Z axis (roll)
          rawAngle = delta.x * (_precisionMode ? 0.02 : 0.2);
        } else if (zLock === 'x' || zLock === 'y') {
          // X/Y rotation: screen movement = rotation around that axis
          rawAngle = delta.x * (_precisionMode ? 0.02 : 0.2);
        } else {
          // Free rotation (keyboard R): screen X = rotation
          rawAngle = delta.x * (_precisionMode ? 0.02 : 0.2);
        }
        const snappedAngle = _snapMode ? Math.round(rawAngle / 1) : rawAngle;
        for (const [layerId, start] of _startTransforms) {
          // Always update 2D rotation (maps to Z rotation)
          let newRotation = start.rotation + snappedAngle;
          newRotation = ((newRotation + 180) % 360 + 360) % 360 - 180;
          store.updateLayer(_compId, layerId, {
            transform: {
              position: start.pos, scale: start.scale,
              rotation: newRotation,
              anchorPoint: { x: 0, y: 0 },
            },
          }, true);
          // Also update transform3D for 3D layers
          const layer = useCompositionStore.getState().compositions.find(c=>c.id===_compId)?.layers.find(l=>l.id===layerId);
          if (layer?.is3D && layer.transform3D) {
            const t3d = layer.transform3D;
            if (zLock === 'x') {
              store.updateLayer(_compId, layerId, {
                transform3D: { ...t3d, rotationX: (start.rotX ?? 0) + snappedAngle },
              }, true);
            } else if (zLock === 'y') {
              store.updateLayer(_compId, layerId, {
                transform3D: { ...t3d, rotationY: (start.rotY ?? 0) + snappedAngle },
              }, true);
            } else {
              // Default: Z rotation (roll)
              store.updateLayer(_compId, layerId, {
                transform3D: { ...t3d, rotationZ: (start.rotZ ?? 0) + snappedAngle },
              }, true);
            }
          }
        }
        break;
      }

      case 'perspective': {
        const layerId = Array.from(this._startTransforms.keys())[0];
        const corner = ((window as any).__activeCorner || 'tl') as 'tl' | 'tr' | 'br' | 'bl';
        const pZoom = this.cameraManager.zoom;

        const dx = delta.x / pZoom;
        const dy = delta.y / pZoom;

        import('../../state/perspectiveStore').then(m => {
          m.usePerspectiveStore.getState().updateCorner(layerId, corner, dx, dy);
        });
        break;
      }

      case 'scale': {
        let factorX = 1, factorY = 1;

        if (this._handlePivotWorld) {
          // M2 FIX: Use signed distance from pivot, NOT absolute distance.
          // Absolute distance loses directional sign when mouse crosses pivot,
          // causing scale to never shrink below 1 when dragging handle past pivot.
          // Signed distance preserves the sign: positive = right/up of pivot,
          // negative = left/down of pivot, so ratio correctly reflects scale direction.
          const pivot = this._handlePivotWorld;
          const startWorld = this.cameraManager.screenToWorld(this.startMouseScreen.x, this.startMouseScreen.y);
          const currentScreenX = this.startMouseScreen.x + delta.x;
          const currentScreenY = this.startMouseScreen.y - delta.y;
          const currentWorld = this.cameraManager.screenToWorld(currentScreenX, currentScreenY);
          const startDistX = startWorld.x - pivot.x;
          const startDistY = startWorld.y - pivot.y;
          const curDistX = currentWorld.x - pivot.x;
          const curDistY = currentWorld.y - pivot.y;
          // Use signed division: if startDist is negative (mouse started left of pivot),
          // the ratio naturally handles the sign correctly
          factorX = Math.abs(startDistX) > 0.5 ? curDistX / startDistX : 1;
          factorY = Math.abs(startDistY) > 0.5 ? curDistY / startDistY : 1;
          factorX = Math.max(0.01, factorX);
          factorY = Math.max(0.01, factorY);
        } else {
          // Free scale (keyboard S) — distance-based from layer center
          const firstId = Array.from(_startTransforms.keys())[0];
          if (firstId) {
            const start = _startTransforms.get(firstId)!;
            const pivotScreen = this.cameraManager.worldToScreen(start.pos.x, start.pos.y);
            // Distance from pivot to mouse start
            const startDx = this.startMouseScreen.x - pivotScreen.x;
            const startDy = this.startMouseScreen.y - pivotScreen.y;
            const startDist = Math.hypot(startDx, startDy);
            // Current mouse position (delta.y is world-up so subtract to get screen)
            const curMouseX = this.startMouseScreen.x + delta.x;
            const curMouseY = this.startMouseScreen.y - delta.y;
            const curDx = curMouseX - pivotScreen.x;
            const curDy = curMouseY - pivotScreen.y;
            const curDist = Math.hypot(curDx, curDy);

            // If pivot is basically under the mouse (< 10px), fall back to travel-based scaling
            let factor: number;
            if (startDist < 10) {
              // Determine sign by comparing current distance to pivot vs anchor distance.
              // We use the distance from the mouse to the computed handle pivot (not the layer center)
              // to determine if the mouse is moving toward or away.
              const pivotWorld = this._handlePivotWorld;
              const pivotScreen = pivotWorld
                ? this.cameraManager.worldToScreen(pivotWorld.x, pivotWorld.y)
                : this.cameraManager.worldToScreen(start.pos.x, start.pos.y);
              const curDxPivot = (this.startMouseScreen.x + delta.x) - pivotScreen.x;
              const curDyPivot = (this.startMouseScreen.y - delta.y) - pivotScreen.y;
              const curDistFromPivot = Math.hypot(curDxPivot, curDyPivot);
              // If current distance > start distance, sign is positive (scaling up)
              const sign = curDistFromPivot > startDist ? 1 : -1;
              const travel = Math.hypot(delta.x, delta.y);
              factor = Math.max(0.01, 1 + sign * travel * 0.02);
            } else {
              factor = Math.max(0.01, curDist / startDist);
            }
            factorX = factor;
            factorY = factor;
          }
        }

        if (_precisionMode) {
          factorX = 1 + (factorX - 1) * 0.1;
          factorY = 1 + (factorY - 1) * 0.1;
        }

        let sx = factorX;
        let sy = factorY;

        if (_axisLock === 'x') sy = 1;
        else if (_axisLock === 'y') sx = 1;
        else if (_axisExclude === 'x') sy = 1;
        else if (_axisExclude === 'y') sx = 1;

        if (_aspectLock && !_axisLock && !_axisExclude) {
          const uniform = Math.max(sx, sy);
          sx = uniform;
          sy = uniform;
        }

        if (_snapMode) {
          // Snap scale to 5% increments for intuitive behavior
          sx = Math.round(sx * 20) / 20 || 0.05;
          sy = Math.round(sy * 20) / 20 || 0.05;
        }

        sx = Math.max(0.01, sx);
        sy = Math.max(0.01, sy);

        // Z-axis lock: only scale Z
        const zLockScale = (window as any).__3DAxisLock as string | undefined;
        let factorZ = 1;
        if (zLockScale === 'z') {
          const travel = Math.hypot(delta.x, delta.y);
          factorZ = 1 + (delta.y < 0 ? 1 : -1) * travel * 0.005;
          if (_precisionMode) factorZ = 1 + (factorZ - 1) * 0.1;
          factorZ = Math.max(0.01, factorZ);
          sx = 1; sy = 1; // Only scale Z
        }

        for (const [layerId, start] of _startTransforms) {
          store.updateLayer(_compId, layerId, {
            transform: {
              position: start.pos,
              scale: { x: Math.max(0.01, start.scale.x * sx), y: Math.max(0.01, start.scale.y * sy) },
              rotation: start.rotation,
              anchorPoint: { x: 0, y: 0 },
            },
          }, true);
          // Also update transform3D.scale for 3D layers
          const layer = useCompositionStore.getState().compositions.find(c=>c.id===_compId)?.layers.find(l=>l.id===layerId);
          if (layer?.is3D && layer.transform3D) {
            store.updateLayer(_compId, layerId, {
              transform3D: {
                ...layer.transform3D,
                scale: {
                  x: (start.scale3d?.x ?? start.scale.x) * sx,
                  y: (start.scale3d?.y ?? start.scale.y) * sy,
                  z: (start.scale3d?.z ?? 100) * factorZ,
                },
              },
            }, true);
          }
        }
        break;
      }
    }
  }

  private _releasePointerLock(): void {
    if (this._boundPointerLockChange) {
      document.removeEventListener('pointerlockchange', this._boundPointerLockChange);
      this._boundPointerLockChange = null;
    }
    this._exitingByChoice = true;
    if (document.pointerLockElement === this._canvas) document.exitPointerLock();
    this._canvas = null;
  }

  private _onPointerLockChange(): void {
    if (!document.pointerLockElement && this._active && !this._exitingByChoice) this.cancel();
    this._exitingByChoice = false;
  }

  /** Capture a snapshot of the current composition state for undo history.
   *  Returns the snapshot string, or null if no active composition. */
  private _captureUndoSnapshot(): string | null {
    try {
      const store = (window as any).__compositionStore;
      if (!store) return null;
      const compState = store.getState();
      const data = {
        compositions: compState.compositions.map((c: any) => ({
          ...c,
          layers: c.layers.map((l: any) => ({ ...l })),
        })),
        activeCompositionId: compState.activeCompositionId,
      };
      return JSON.stringify(data);
    } catch {
      return null;
    }
  }

  private _buildSnapTargets(
    comp: { id: string; width: number; height: number; layers: Layer[] },
    excludeLayerIds: string[],
  ): SnapTargets {
    const halfW = comp.width / 2;
    const halfH = comp.height / 2;

    const viewportSettings = useViewportStore.getState().settings;

    return {
      compLeft: -halfW,
      compRight: halfW,
      compTop: halfH,
      compBottom: -halfH,
      compCenterX: 0,
      compCenterY: 0,
      guidesH: viewportSettings.showGuides
        ? viewportSettings.guides.filter((g) => g.type === 'horizontal').map((g) => g.position)
        : [],
      guidesV: viewportSettings.showGuides
        ? viewportSettings.guides.filter((g) => g.type === 'vertical').map((g) => g.position)
        : [],
      layers: comp.layers
        .filter((l) => l.visible && !l.locked && !excludeLayerIds.includes(l.id))
        .map((l) => this._getLayerWorldBounds(l))
        .filter(Boolean) as any,
    };
  }

  private _buildMovingSelectionStartBounds(): LayerSnapRect | null {
    const compId = this._compId;
    if (!compId) return null;

    const compState = useCompositionStore.getState();
    const comp = compState.compositions.find((c) => c.id === compId);
    if (!comp) return null;

    let left = Infinity;
    let right = -Infinity;
    let top = -Infinity;
    let bottom = Infinity;
    let found = false;

    for (const [layerId, start] of this._startTransforms) {
      const layer = comp.layers.find((l) => l.id === layerId);
      if (!layer) continue;

      const fakeLayer: Layer = {
        ...layer,
        transform: {
          ...layer.transform,
          position: { ...start.pos },
          scale: { ...start.scale },
          rotation: start.rotation,
        },
      };

      const b = this._getLayerWorldBounds(fakeLayer);
      if (!b) continue;

      left = Math.min(left, b.left);
      right = Math.max(right, b.right);
      top = Math.max(top, b.top);
      bottom = Math.min(bottom, b.bottom);
      found = true;
    }

    if (!found) return null;

    return {
      id: '__selection__',
      left,
      right,
      top,
      bottom,
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2,
    };
  }

  private _getLayerWorldBounds(layer: Layer): LayerSnapRect | null {
    const size = this._getLayerLocalSize(layer);
    if (!size) return null;

    const t = layer.transform;
    const sx = t.scale.x / 100;
    const sy = t.scale.y / 100;
    const hw = (size.w * Math.abs(sx)) / 2;
    const hh = (size.h * Math.abs(sy)) / 2;

    const rad = (t.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ].map((p) => ({
      x: t.position.x + p.x * cos - p.y * sin,
      y: t.position.y + p.x * sin + p.y * cos,
    }));

    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);

    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const bottom = Math.min(...ys);
    const top = Math.max(...ys);

    return {
      id: layer.id,
      left,
      right,
      top,
      bottom,
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2,
    };
  }

  private _getLayerLocalSize(layer: Layer): { w: number; h: number } | null {
    const d: any = layer.data;

    if (layer.type === 'solid' && d) {
      return { w: d.width ?? 100, h: d.height ?? 100 };
    }

    if ((layer.type === 'image' || layer.type === 'video') && d) {
      return {
        w: d.naturalWidth ?? 100,
        h: d.naturalHeight ?? 100,
      };
    }

    if (layer.type === 'shape' && d) {
      if (d.type === 'rectangle') return { w: d.width ?? 100, h: d.height ?? 100 };
      if (d.type === 'ellipse') return { w: (d.radiusX ?? 50) * 2, h: (d.radiusY ?? 50) * 2 };
      if (d.type === 'polygon' || d.type === 'star') return { w: (d.radius ?? 50) * 2, h: (d.radius ?? 50) * 2 };
      if (d.type === 'path' && d.bounds) {
        return {
          w: Math.max(1, d.bounds.maxX - d.bounds.minX),
          h: Math.max(1, d.bounds.maxY - d.bounds.minY),
        };
      }
      if (d.type === 'custom') return { w: d.width ?? 100, h: d.height ?? 100 };
    }

    if (layer.type === 'comp' && d) {
      const compState = useCompositionStore.getState();
      const source = compState.compositions.find((c) => c.id === d.sourceCompId);
      if (source) return { w: source.width, h: source.height };
    }

    if (layer.type === 'text') {
      return { w: 300, h: 100 };
    }

    if (layer.type === 'null') {
      return { w: 100, h: 100 };
    }

    return { w: 100, h: 100 };
  }

  private _emitState(): void {
    this._onStateChange?.(this.getTransformInfo());
  }
}