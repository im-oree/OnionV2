/**
 * MouseManager — handles mouse events on the viewport canvas.
 * - Middle mouse drag = pan
 * - Scroll = zoom
 * - Left click = select (stub for Phase 3)
 */
import { CameraManager } from '../renderer/CameraManager';

export interface MouseManagerOptions {
  /** The DOM element to attach listeners to */
  element: HTMLElement;
  /** Camera manager to control */
  cameraManager: CameraManager;
}

export class MouseManager {
  private element: HTMLElement;
  private cameraManager: CameraManager;
  private isPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private boundHandlers: Array<[string, EventListener]> = [];

  constructor(options: MouseManagerOptions) {
    this.element = options.element;
    this.cameraManager = options.cameraManager;
    this.attach();
  }

  /** Attach all mouse event listeners */
  private attach(): void {
    this.addListener('mousedown', this.onMouseDown);
    this.addListener('mousemove', this.onMouseMove);
    this.addListener('mouseup', this.onMouseUp);
    this.addListener('wheel', this.onWheel);
    this.addListener('contextmenu', this.onContextMenu);
  }

  /** Detach all mouse event listeners */
  detach(): void {
    for (const [event, handler] of this.boundHandlers) {
      this.element.removeEventListener(event, handler);
    }
    this.boundHandlers = [];
  }

  /** Add a listener and track it for cleanup */
  private addListener(event: string, handler: EventListener): void {
    this.element.addEventListener(event, handler);
    this.boundHandlers.push([event, handler]);
  }

  /** Handle mouse down — start panning on middle click */
  private onMouseDown = (e: Event): void => {
    const me = e as MouseEvent;
    // Middle mouse button (button === 1) or Ctrl+left click
    if (me.button === 1 || (me.button === 0 && (me.ctrlKey || me.metaKey))) {
      this.isPanning = true;
      this.lastMouseX = me.clientX;
      this.lastMouseY = me.clientY;
      e.preventDefault();
    }
  };

  /** Handle mouse move — pan if currently panning */
  private onMouseMove = (e: Event): void => {
    if (!this.isPanning) return;
    const me = e as MouseEvent;
    const deltaX = (me.clientX - this.lastMouseX);
    const deltaY = (me.clientY - this.lastMouseY);

    // Convert screen delta to world delta based on zoom
    const worldDeltaX = -deltaX * this.cameraManager.zoom;
    const worldDeltaY = deltaY * this.cameraManager.zoom;

    this.cameraManager.pan(worldDeltaX, worldDeltaY);

    this.lastMouseX = me.clientX;
    this.lastMouseY = me.clientY;
  };

  /** Handle mouse up — stop panning */
  private onMouseUp = (e: Event): void => {
    const me = e as MouseEvent;
    if (me.button === 1 || (me.button === 0 && (me.ctrlKey || me.metaKey))) {
      this.isPanning = false;
    }
  };

  /** Handle scroll wheel — zoom */
  private onWheel = (e: Event): void => {
    const we = e as WheelEvent;
    e.preventDefault();

    // Scroll up (negative deltaY) = zoom in (make objects larger)
    const factor = we.deltaY < 0 ? 1 / 1.1 : 1.1;
    this.cameraManager.setZoom(this.cameraManager.zoom * factor);
  };

  /** Prevent default context menu on canvas */
  private onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  /** Clean up */
  dispose(): void {
    this.detach();
  }
}
