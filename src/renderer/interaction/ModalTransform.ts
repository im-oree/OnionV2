import type { CameraManager } from '../CameraManager';
import { useCompositionStore } from '../../state/compositionStore';
import { useSelectionStore } from '../../state/selectionStore';
import { useViewportStore } from '../../state/viewportStore';
import { registerModalActiveCheck } from '../../input/ShortcutRegistry';
import { Snapping, type SnapTargets } from '../utils/Snapping';
import type { Layer } from '../../types/layer';
import { useTimelineStore } from '../../state/timelineStore';
import { autoKeyTransform } from './KeyframeHelpers';

export type TransformMode = 'grab' | 'rotate' | 'scale';

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
    document.addEventListener('mousemove', (e) => { document._lastMouseEvent = e; }, { passive: true });
  }

  start(mode: TransformMode, canvas?: HTMLCanvasElement): void {
    if (this._active) this.cancel();

    const layerIds = useSelectionStore.getState().getSelectedIds();
    if (layerIds.length === 0) return;

    const compState = useCompositionStore.getState();
    const compId = compState.activeCompositionId;
    if (!compId) return;
    const comp = compState.compositions.find((c) => c.id === compId);
    if (!comp) return;

    const startTransforms = new Map<string, LayerSnapshot>();
    for (const id of layerIds) {
      const layer = comp.layers.find((l) => l.id === id);
      if (layer) {
        startTransforms.set(id, {
          pos: { ...layer.transform.position },
          scale: { ...layer.transform.scale },
          rotation: layer.transform.rotation,
        });
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
  }

  /** When auto-key is enabled, insert keyframes for any transform values that changed */
  private _autoKeyChangedTransforms(): void {
    if (!useTimelineStore.getState().autoKey) return;
    const compId = this._compId;
    if (!compId) return;

    const compState = useCompositionStore.getState();
    const comp = compState.compositions.find(c => c.id === compId);
    if (!comp) return;

    const currentFrame = Math.round(comp.currentTime * comp.fps);

    for (const [layerId, start] of this._startTransforms) {
      const layer = comp.layers.find(l => l.id === layerId);
      if (!layer) continue;
      autoKeyTransform(layerId, layer.transform, start, currentFrame);
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
        });
      }
    }
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
          });
        } else if (_mode === 'rotate') {
          const snapped = _snapMode ? Math.round(val / 5) * 5 : val;
          store.updateLayer(_compId, layerId, {
            transform: { position: start.pos, scale: start.scale, rotation: start.rotation + snapped, anchorPoint: { x: 0, y: 0 } },
          });
        } else if (_mode === 'scale') {
          const v = val / 100;
          const sx = (_axisLock === 'y' || _axisExclude === 'x') ? start.scale.x : start.scale.x * v;
          const sy = (_axisLock === 'x' || _axisExclude === 'y') ? start.scale.y : start.scale.y * v;
          store.updateLayer(_compId, layerId, {
            transform: { position: start.pos, scale: { x: Math.max(0.01, sx), y: Math.max(0.01, sy) }, rotation: start.rotation, anchorPoint: { x: 0, y: 0 } },
          });
        }
      }
      return;
    }

    switch (_mode) {
      case 'grab': {
        let gx = delta.x / zoom;
        let gy = delta.y / zoom;

        if (_axisLock === 'x' || _axisExclude === 'y') gy = 0;
        if (_axisLock === 'y' || _axisExclude === 'x') gx = 0;
        if (_precisionMode) { gx *= 0.1; gy *= 0.1; }

        if (useSnap) {
          const firstId = Array.from(_startTransforms.keys())[0];
          if (firstId) {
            const start = _startTransforms.get(firstId)!;
            const testX = start.pos.x + gx;
            const testY = start.pos.y + gy;
            const snapped = this.snapping.snapPoint(testX, testY, _cachedSnapTargets!, 6);
            if (snapped.snapped) {
              gx += snapped.x - testX;
              gy += snapped.y - testY;
              this.lastSnapLines = snapped.lines;
            } else {
              this.lastSnapLines = [];
            }
          }
        } else {
          this.lastSnapLines = [];
        }

        for (const [layerId, start] of _startTransforms) {
          store.updateLayer(_compId, layerId, {
            transform: {
              position: { x: start.pos.x + gx, y: start.pos.y + gy },
              scale: start.scale, rotation: start.rotation,
              anchorPoint: { x: 0, y: 0 },
            },
          });
        }
        break;
      }

      case 'rotate': {
        let rawAngle: number;
        if (this._handlePivotWorld) {
          // M3: Handle-based rotation: angle from pivot to mouse
          const pivot = this._handlePivotWorld;
          const currentScreenX = this.startMouseScreen.x + delta.x;
          const currentScreenY = this.startMouseScreen.y - delta.y;
          const currentWorld = this.cameraManager.screenToWorld(currentScreenX, currentScreenY);
          if (this._startRotateAngle === null) {
            // First frame: store the initial angle but apply ZERO rotation
            const startWorld = this.cameraManager.screenToWorld(this.startMouseScreen.x, this.startMouseScreen.y);
            this._startRotateAngle = Math.atan2(startWorld.y - pivot.y, startWorld.x - pivot.x);
          }
          const currentAngle = Math.atan2(currentWorld.y - pivot.y, currentWorld.x - pivot.x);
          rawAngle = (currentAngle - this._startRotateAngle) * (180 / Math.PI);
        } else {
          // Free rotation (keyboard R):
          rawAngle = delta.x * (_precisionMode ? 0.02 : 0.2);
        }
        const snappedAngle = _snapMode ? Math.round(rawAngle / 1) : rawAngle;
        for (const [layerId, start] of _startTransforms) {
          // Normalize accumulated rotation to [-180, 180] to prevent unbounded growth
          let newRotation = start.rotation + snappedAngle;
          newRotation = ((newRotation + 180) % 360 + 360) % 360 - 180;
          store.updateLayer(_compId, layerId, {
            transform: {
              position: start.pos, scale: start.scale,
              rotation: newRotation,
              anchorPoint: { x: 0, y: 0 },
            },
          });
        }
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

        for (const [layerId, start] of _startTransforms) {
          store.updateLayer(_compId, layerId, {
            transform: {
              position: start.pos,
              scale: { x: Math.max(0.01, start.scale.x * sx), y: Math.max(0.01, start.scale.y * sy) },
              rotation: start.rotation,
              anchorPoint: { x: 0, y: 0 },
            },
          });
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

  private _buildSnapTargets(
    comp: { id: string; width: number; height: number; layers: Layer[] },
    excludeLayerIds: string[],
  ): SnapTargets {
    const halfW = comp.width / 2;
    const halfH = comp.height / 2;
    return {
      compLeft: -halfW, compRight: halfW,
      compTop: halfH, compBottom: -halfH,
      compCenterX: 0, compCenterY: 0,
      guidesH: [], guidesV: [],
      layers: comp.layers
        .filter((l) => l.visible && !excludeLayerIds.includes(l.id))
        .map((l) => {
          const t = l.transform;
          return {
            id: l.id,
            left: t.position.x - 50, right: t.position.x + 50,
            top: t.position.y + 50, bottom: t.position.y - 50,
            centerX: t.position.x, centerY: t.position.y,
          };
        }),
    };
  }

  private _emitState(): void {
    this._onStateChange?.(this.getTransformInfo());
  }
}