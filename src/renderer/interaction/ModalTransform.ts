/**
 * ModalTransform — Blender-exact modal transform system.
 *
 * STATE MACHINE:
 *   idle → start(mode) → active(pointerlock) → updateDelta(movementX,movementY) → confirm/cancel → idle
 *
 * FEATURES:
 * - Pointer Lock API (cursor hidden, infinite mouse movement via movementX/movementY)
 * - Axis lock (X/Y) and axis exclude (Shift+X → "not X")
 * - Precision mode (Shift held → 10x slower movement)
 * - Snap mode (Ctrl held → snap to 10px/5°/0.1x increments)
 * - Aspect lock (Alt held during scale → uniform)
 * - Numeric input (type digits mid-transform for exact values)
 * - Auto-cancel on pointer lock exit (browser Esc, Alt+Tab, etc.)
 * - Pivot at median of selected layer positions
 * - Snapping to comp edges, guides, other layer edges (J6)
 */
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

export class ModalTransform {
  /** Global static flag: true when ANY ModalTransform instance is active. Checked by ShortcutRegistry to suspend global shortcuts. */
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
  private _aspectLock = false;   // J7: Alt held during scale = uniform
  private _startTransforms = new Map<string, LayerSnapshot>();
  /** J4: mouse screen position at modal start for pivot-based scale distance calculation */
  public startMouseScreen = { x: 0, y: 0 };
  /** L3: For handle-based drag (PowerPoint style), store the pivot world position */
  private _handlePivotWorld: { x: number; y: number } | null = null;
  private _compId: string | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _exitingByChoice = false;
  private _onStateChange: ((info: TransformInfo) => void) | null = null;
  private _boundPointerLockChange: (() => void) | null = null;
  // Cache snap targets per drag session
  private _cachedSnapTargets: SnapTargets | null = null;
  /** Snap lines from last evaluation, for overlay rendering */
  public lastSnapLines: Array<{ type: 'horizontal' | 'vertical'; position: number }> = [];

  constructor(cameraManager: CameraManager, snapping?: Snapping) {
    this.cameraManager = cameraManager;
    this.snapping = snapping ?? new Snapping();
    // Register static active check with ShortcutRegistry (K1)
    registerModalActiveCheck(() => ModalTransform.activeAnywhere);
  }

  /** Start a modal transform. If canvas is provided, request pointer lock. */
  start(mode: TransformMode, canvas?: HTMLCanvasElement): void {
    const layerIds = useSelectionStore.getState().getSelectedIds();
    if (layerIds.length === 0) return;

    const compState = useCompositionStore.getState();
    const compId = compState.activeCompositionId;
    if (!compId) return;
    const comp = compState.compositions.find((c) => c.id === compId);
    if (!comp) return;

    // Capture start transforms and compute pivot (median of positions)
    const startTransforms = new Map<string, LayerSnapshot>();
    let px = 0, py = 0, count = 0;
    for (const id of layerIds) {
      const layer = comp.layers.find((l) => l.id === id);
      if (layer) {
        startTransforms.set(id, {
          pos: { ...layer.transform.position },
          scale: { ...layer.transform.scale },
          rotation: layer.transform.rotation,
        });
        px += layer.transform.position.x;
        py += layer.transform.position.y;
        count++;
      }
    }
    if (count === 0) return;

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
    this.startMouseScreen = { x: 0, y: 0 };
    this._compId = compId;
    this._exitingByChoice = false;
    this._cachedSnapTargets = null;
    this._handlePivotWorld = null;
    this.lastSnapLines = [];

    // Build snap targets once (J6)
    this._cachedSnapTargets = this._buildSnapTargets(comp, layerIds);

    // Pointer lock
    if (canvas) {
      this._canvas = canvas;
      this._boundPointerLockChange = this._onPointerLockChange.bind(this);
      document.addEventListener('pointerlockchange', this._boundPointerLockChange);
      canvas.requestPointerLock().catch(() => {
        this._canvas = null;
      });
    }

    this._emitState();
  }

  /** Update from pointer lock movement delta (movementX, movementY) */
  updateDelta(movementX: number, movementY: number): void {
    if (!this._active || !this._mode || !this._compId) return;
    if (useSelectionStore.getState().getSelectedIds().length === 0) { this.cancel(); return; }
    this.clearNumeric();
    // J1: Screen X → world X (same direction). Screen Y → world Y (inverted).
    this._accumulatedDelta.x += movementX;
    this._accumulatedDelta.y -= movementY;
    this._applyTransform();
    this._emitState();
  }

  /** Update from direct drag (clientX - lastClientX, clientY - lastClientY) */
  updateDirectDrag(dx: number, dy: number): void {
    if (!this._active || !this._mode || !this._compId) return;
    if (useSelectionStore.getState().getSelectedIds().length === 0) { this.cancel(); return; }
    this.clearNumeric();
    // J1: Screen X → world X (same direction). Screen Y → world Y (inverted).
    this._accumulatedDelta.x += dx;
    this._accumulatedDelta.y -= dy;
    this._applyTransform();
    this._emitState();
  }

  /** Confirm: keep changes, release pointer lock */
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

  /** Cancel: restore original transforms, release pointer lock */
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

  // ── Axis constraints (J7) ────────────────────────────────
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

  // ── Modifiers (J7) ───────────────────────────────────────
  setPrecisionMode(on: boolean): void { this._precisionMode = on; }
  setSnapMode(on: boolean): void { this._snapMode = on; }
  setAspectLock(on: boolean): void { this._aspectLock = on; } // J7: Alt during scale

  /** J4: Set initial mouse screen position for pivot-based scale/rotation distance calculation */
  setStartMouseScreen(x: number, y: number): void { this.startMouseScreen = { x, y }; }

  /** L3: Set a fixed world-space pivot for handle-based scaling/rotation (PowerPoint style).
   * The pivot is the opposite corner/edge for handles, or layer center for rotation. */
  setHandlePivotWorld(pivot: { x: number; y: number } | null): void {
    this._handlePivotWorld = pivot;
  }

  // ── Numeric input ────────────────────────────────────────
  pushNumericChar(ch: string): void {
    if (!this._active) return;
    if (!/^[0-9.\-]$/.test(ch)) return;
    this._numericBuffer += ch;
    this._numericActive = this._numericBuffer.length > 0;
    const val = parseFloat(this._numericBuffer);
    if (!isNaN(val) && this._numericBuffer.length > 1) {
      this._applyTransform();
      this._syncStartTransformsFromStore();
      this._accumulatedDelta = { x: 0, y: 0 };
    }
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

  // ── Getters ──────────────────────────────────────────────
  get active(): boolean { return this._active; }
  get mode(): TransformMode | null { return this._mode; }
  get axisLock(): 'x' | 'y' | null { return this._axisLock; }
  get axisExclude(): 'x' | 'y' | null { return this._axisExclude; }

  getTransformInfo(): TransformInfo {
    let rotation = 0, scaleX = 1, scaleY = 1;
    const deltaX = this._accumulatedDelta.x;
    const deltaY = this._accumulatedDelta.y;

    if (this._active && this._mode && this._compId) {
      if (this._numericActive) {
        const val = parseFloat(this._numericBuffer) || 0;
        if (this._mode === 'grab') {
          // Numeric overrides — handled in _applyTransform
        } else if (this._mode === 'scale') {
          scaleX = (this._axisLock === 'y' || this._axisExclude === 'x') ? 1 : val / 100;
          scaleY = (this._axisLock === 'x' || this._axisExclude === 'y') ? 1 : val / 100;
        } else {
          rotation = val;
        }
      } else {
        if (this._mode === 'grab') {
          // Apply constraints (worldDx/worldDy already computed)
          // The returned deltaX/deltaY just reflect the raw accumulated delta for HUD display
          // The actual applied values use worldDx/worldDy but those need axis constraints too
          // We return the world-space deltas for HUD:
          if (this._axisLock === 'x' || this._axisExclude === 'x') { /* worldDy would be 0 */ }
          if (this._axisLock === 'y' || this._axisExclude === 'y') { /* worldDx would be 0 */ }
        } else if (this._mode === 'scale') {
          // J4: Multiplicative scale based on distance from pivot
          const dist = Math.hypot(deltaX, deltaY);
          const startDist = Math.hypot(this.startMouseScreen.x || 1, this.startMouseScreen.y || 1);
          const factor = startDist > 1 ? dist / startDist : 1 + dist * 0.005;
          const f = this._precisionMode ? 0.1 : 1;
          const rawFactor = 1 + (factor - 1) * f;
          scaleX = Math.max(0.01, rawFactor);
          scaleY = Math.max(0.01, rawFactor);
          if (this._axisLock === 'y' || this._axisExclude === 'x') scaleY = 1;
          if (this._axisLock === 'x' || this._axisExclude === 'y') scaleX = 1;
          if (this._snapMode) {
            scaleX = Math.round(scaleX * 10) / 10;
            scaleY = Math.round(scaleY * 10) / 10;
          }
        } else {
          // rotate
          const f = this._precisionMode ? 0.05 : 0.5;
          rotation = deltaX * f;
          if (this._snapMode) rotation = Math.round(rotation / 5) * 5;
        }
      }
    }

    return {
      mode: this._mode, active: this._active,
      axisLock: this._axisLock, axisExclude: this._axisExclude,
      deltaX: this._accumulatedDelta.x, deltaY: this._accumulatedDelta.y,
      rotation, scaleX, scaleY,
      numericBuffer: this._numericBuffer,
      precisionMode: this._precisionMode, snapMode: this._snapMode,
    };
  }

  setOnStateChange(cb: (info: TransformInfo) => void): void { this._onStateChange = cb; }

  // ── Private helpers ──────────────────────────────────────

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

    // J1: Compute world-space delta
    // accumulatedDelta stores: x = screen-X (positive = right), y = already inverted (positive = world up)
    // worldDx = delta.x * zoom (screen right = world right) ✅
    // worldDy = delta.y * zoom (screen down → accum.y negative → world.y negative = down) ✅
    const worldDx = delta.x * zoom;
    const worldDy = delta.y * zoom;

    // Snap integration (J6) — triggered by Ctrl key OR global snapping toggle
    const globalSnap = useViewportStore.getState().settings.snappingEnabled;
    let useSnap = (_snapMode || globalSnap) && _mode === 'grab' && _cachedSnapTargets;

    if (_numericActive) {
      // Numeric overrides everything
      const val = parseFloat(_numericBuffer) || 0;
      for (const [layerId, start] of _startTransforms) {
        if (_mode === 'grab') {
          const nx = (_axisLock === 'y' || _axisExclude === 'x') ? start.pos.x : start.pos.x + val;
          const ny = (_axisLock === 'x' || _axisExclude === 'y') ? start.pos.y : (_axisLock === 'y' ? start.pos.y + val : start.pos.y);
          store.updateLayer(_compId, layerId, {
            transform: { position: { x: nx, y: ny }, scale: start.scale, rotation: start.rotation, anchorPoint: { x: 0, y: 0 } },
          });
        } else if (_mode === 'rotate') {
          const angle = val;
          const snapped = _snapMode ? Math.round(angle / 5) * 5 : angle;
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
        let gx = worldDx, gy = worldDy;

        // Axis constraints
        if (_axisLock === 'x' || _axisExclude === 'x') gy = 0;
        if (_axisLock === 'y' || _axisExclude === 'y') gx = 0;

        // Precision
        if (_precisionMode) { gx *= 0.1; gy *= 0.1; }

        // Snap (J6)
        if (useSnap) {
          // Compute what the new position would be for the first selected layer
          const firstLayerId = _startTransforms.keys().next().value;
          if (firstLayerId) {
            const start = _startTransforms.get(firstLayerId);
            if (start) {
              const testX = start.pos.x + gx;
              const testY = start.pos.y + gy;
              const snapped = this.snapping.snapPoint(testX, testY, _cachedSnapTargets!, 6);
              if (snapped.snapped) {
                const dx = snapped.x - testX;
                const dy = snapped.y - testY;
                // Apply the snap delta to all layers
                gx += dx;
                gy += dy;
                this.lastSnapLines = snapped.lines;
              } else {
                this.lastSnapLines = [];
              }
            }
          }
        } else {
          this.lastSnapLines = [];
        }

        // Apply to all selected layers
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
        // L3: When a handle pivot is set, use angle-based rotation (PowerPoint style)
        let rawAngle: number;
        if (this._handlePivotWorld) {
          // Compute angle from pivot to current mouse position vs start mouse position
          const startWorld = this.cameraManager.screenToWorld(this.startMouseScreen.x, this.startMouseScreen.y);
          const currentScreenX = this.startMouseScreen.x + delta.x;
          const currentScreenY = this.startMouseScreen.y + delta.y;
          const currentWorld = this.cameraManager.screenToWorld(currentScreenX, currentScreenY);
          const pivot = this._handlePivotWorld;
          const startAngle = Math.atan2(startWorld.y - pivot.y, startWorld.x - pivot.x);
          const currentAngle = Math.atan2(currentWorld.y - pivot.y, currentWorld.x - pivot.x);
          rawAngle = (currentAngle - startAngle) * (180 / Math.PI);
        } else {
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
        // L3: When a handle pivot is set, use pivot-based scale (PowerPoint style)
        let factor: number;
        if (this._handlePivotWorld) {
          const pivot = this._handlePivotWorld;
          const startWorld = this.cameraManager.screenToWorld(this.startMouseScreen.x, this.startMouseScreen.y);
          const currentScreenX = this.startMouseScreen.x + delta.x;
          const currentScreenY = this.startMouseScreen.y + delta.y;
          const currentWorld = this.cameraManager.screenToWorld(currentScreenX, currentScreenY);
          const startDist = Math.hypot(startWorld.x - pivot.x, startWorld.y - pivot.y);
          const currentDist = Math.hypot(currentWorld.x - pivot.x, currentWorld.y - pivot.y);
          factor = Math.max(0.01, currentDist / Math.max(startDist, 0.001));
        } else {
          // J4: Multiplicative scale based on distance from pivot (center-based)
          const startDist = Math.hypot(this.startMouseScreen.x || 1, this.startMouseScreen.y || 1);
          const curDist = Math.hypot(delta.x, delta.y);
          if (startDist > 5) {
            factor = Math.max(0.01, curDist / startDist);
          } else {
            factor = 1 + Math.hypot(delta.x, delta.y) * 0.005;
          }
        }
        // Precision reduces factor change
        if (_precisionMode) factor = 1 + (factor - 1) * 0.1;

        let sx = factor, sy = factor;
        // Axis constraints
        if (_axisLock === 'y' || _axisExclude === 'x') sy = 1;
        if (_axisLock === 'x' || _axisExclude === 'y') sx = 1;
        // Aspect lock (J7: Alt during scale → uniform)
        if (_aspectLock) {
          const uniform = Math.max(sx, sy);
          sx = uniform;
          sy = uniform;
        }
        // Snap
        if (_snapMode) {
          sx = Math.round(sx * 10) / 10;
          sy = Math.round(sy * 10) / 10;
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
    if (document.pointerLockElement === this._canvas) {
      document.exitPointerLock();
    }
    this._canvas = null;
  }

  private _onPointerLockChange(): void {
    if (!document.pointerLockElement && this._active && !this._exitingByChoice) {
      this.cancel();
    }
    this._exitingByChoice = false;
  }

  /** Sync _startTransforms to current layer positions from the store */
  private _syncStartTransformsFromStore(): void {
    if (!this._compId) return;
    const comp = useCompositionStore.getState().compositions.find((c) => c.id === this._compId);
    if (!comp) return;
    for (const [id, start] of this._startTransforms) {
      const layer = comp.layers.find((l) => l.id === id);
      if (layer) {
        start.pos = { ...layer.transform.position };
        start.scale = { ...layer.transform.scale };
        start.rotation = layer.transform.rotation;
      }
    }
  }

  /** Build snap targets from composition and other layers (J6) */
  private _buildSnapTargets(comp: { id: string; width: number; height: number; layers: Layer[] }, excludeLayerIds: string[]): SnapTargets {
    const halfW = comp.width / 2;
    const halfH = comp.height / 2;

    return {
      compLeft: -halfW,
      compRight: halfW,
      compTop: halfH,
      compBottom: -halfH,
      compCenterX: 0,
      compCenterY: 0,
      guidesH: [],  // Could be populated from viewportStore guides
      guidesV: [],
      layers: comp.layers
        .filter((l) => l.visible && !excludeLayerIds.includes(l.id))
        .map((l) => {
          const t = l.transform;
          const halfWl = 50; // approximate half-width based on scale
          const halfHl = 50;
          return {
            id: l.id,
            left: t.position.x - halfWl * (t.scale.x / 100),
            right: t.position.x + halfWl * (t.scale.x / 100),
            top: t.position.y + halfHl * (t.scale.y / 100),
            bottom: t.position.y - halfHl * (t.scale.y / 100),
            centerX: t.position.x,
            centerY: t.position.y,
          };
        }),
    };
  }

  private _emitState(): void {
    this._onStateChange?.(this.getTransformInfo());
  }
}
