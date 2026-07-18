import type { CameraManager } from '../CameraManager';
import { useCompositionStore } from '../../state/compositionStore';
import { useSelectionStore } from '../../state/selectionStore';
import { useViewportStore } from '../../state/viewportStore';
import { registerModalActiveCheck } from '../../input/ShortcutRegistry';
import { Snapping, type SnapTargets } from '../utils/Snapping';
import type { Layer } from '../../types/layer';

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
  private _compId: string | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _exitingByChoice = false;
  private _onStateChange: ((info: TransformInfo) => void) | null = null;
  private _boundPointerLockChange: (() => void) | null = null;
  private _cachedSnapTargets: SnapTargets | null = null;
  private _pendingFirstDelta = false;
  /** For pivot-based rotation: initial angle from pivot to layer center */
  private _rotationStartAngle = 0;
  public lastSnapLines: Array<{ type: 'horizontal' | 'vertical'; position: number }> = [];

  constructor(cameraManager: CameraManager, snapping?: Snapping) {
    this.cameraManager = cameraManager;
    this.snapping = snapping ?? new Snapping();
    registerModalActiveCheck(() => ModalTransform.activeAnywhere);
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

    this._mode = mode;
    this._active = true;
    ModalTransform.activeAnywhere = true;
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
    this._rotationStartAngle = 0;
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
      this._pendingFirstDelta = false;
      this._accumulatedDelta = { x: 0, y: 0 };
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
    this._active = false;
    ModalTransform.activeAnywhere = false;
    this.lastSnapLines = [];
    this._cachedSnapTargets = null;
    this._handlePivotWorld = null;
    this._emitState();
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
          // Handle-based rotation: angle from pivot to mouse
          const pivot = this._handlePivotWorld;
          const startWorld = this.cameraManager.screenToWorld(this.startMouseScreen.x, this.startMouseScreen.y);
          // FIX: delta.y is already inverted to world-up in updateDelta.
          // So current screen Y = startScreenY - delta.y (because +delta.y means went up)
          const currentScreenX = this.startMouseScreen.x + delta.x;
          const currentScreenY = this.startMouseScreen.y - delta.y;
          const currentWorld = this.cameraManager.screenToWorld(currentScreenX, currentScreenY);
          const startAngle = Math.atan2(startWorld.y - pivot.y, startWorld.x - pivot.x);
          const currentAngle = Math.atan2(currentWorld.y - pivot.y, currentWorld.x - pivot.x);
          rawAngle = (currentAngle - startAngle) * (180 / Math.PI);
        } else {
          // Free rotation (keyboard R):
          // FIX: rotation follows horizontal mouse; positive delta.x = mouse right = CCW rotation (Blender convention)
          // In screen space X increases right, in Y-up world CCW is positive angle.
          // Convention: mouse right = CCW = positive angle
          rawAngle = delta.x * (_precisionMode ? 0.05 : 0.5);
        }
        const snappedAngle = _snapMode ? Math.round(rawAngle / 5) * 5 : rawAngle;
        for (const [layerId, start] of _startTransforms) {
          store.updateLayer(_compId, layerId, {
            transform: {
              position: start.pos, scale: start.scale,
              rotation: start.rotation + snappedAngle,
              anchorPoint: { x: 0, y: 0 },
            },
          });
        }
        break;
      }

      case 'scale': {
        let factorX = 1, factorY = 1;

        if (this._handlePivotWorld) {
          const pivot = this._handlePivotWorld;
          const startWorld = this.cameraManager.screenToWorld(this.startMouseScreen.x, this.startMouseScreen.y);
          const currentScreenX = this.startMouseScreen.x + delta.x;
          const currentScreenY = this.startMouseScreen.y - delta.y;
          const currentWorld = this.cameraManager.screenToWorld(currentScreenX, currentScreenY);
          const startDistX = Math.abs(startWorld.x - pivot.x);
          const startDistY = Math.abs(startWorld.y - pivot.y);
          const curDistX = Math.abs(currentWorld.x - pivot.x);
          const curDistY = Math.abs(currentWorld.y - pivot.y);
          factorX = startDistX > 0.5 ? curDistX / startDistX : 1;
          factorY = startDistY > 0.5 ? curDistY / startDistY : 1;
          factorX = Math.max(0.01, factorX);
          factorY = Math.max(0.01, factorY);
        } else {
          // FIX: Free scale (keyboard S) — Blender-style
          // Compute current mouse distance from pivot (start position = layer center in screen).
          // Factor = currentDist / startDist. At time 0, currentDist === startDist → factor = 1.
          // Pivot in screen space = position of the layer at drag start.
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
              // Use total travel distance with sign from horizontal component
              const travel = Math.hypot(delta.x, delta.y);
              const sign = delta.x >= 0 ? 1 : -1;
              factor = Math.max(0.01, 1 + sign * travel * 0.005);
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
          sx = Math.round(sx * 10) / 10 || 0.1;
          sy = Math.round(sy * 10) / 10 || 0.1;
        }

        sx = Math.max(0.01, sx);
        sy = Math.max(0.01, sy);

        for (const [layerId, start] of _startTransforms) {
          store.updateLayer(_compId, layerId, {
            transform: {
              position: start.pos,
              scale: { x: start.scale.x * sx, y: start.scale.y * sy },
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