/**
 * Motion Sketch — records mouse drag as position keyframes in real time.
 * Sample rate = comp fps. Activated by Alt+drag in viewport when a layer is selected.
 */
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { animationClock } from '../timeline/PlaybackControls';

interface Sample { time: number; x: number; y: number; }

export class MotionSketchRecorder {
  private samples: Sample[] = [];
  private startFrame = 0;
  private layerId: string | null = null;
  private compId: string | null = null;
  private fps = 30;
  private startTime = 0;
  private active = false;
  private worldConverter: ((sx: number, sy: number) => { x: number; y: number }) | null = null;

  start(worldConverter: (sx: number, sy: number) => { x: number; y: number }): boolean {
    const selIds = useSelectionStore.getState().getSelectedIds();
    if (selIds.length === 0) return false;
    const compState = useCompositionStore.getState();
    const compId = compState.activeCompositionId;
    if (!compId) return false;
    const comp = compState.compositions.find(c => c.id === compId);
    if (!comp) return false;

    this.layerId = selIds[0];
    this.compId = compId;
    this.fps = comp.fps;
    this.startFrame = Math.round(comp.currentTime * comp.fps);
    this.startTime = performance.now();
    this.samples = [];
    this.worldConverter = worldConverter;
    this.active = true;
    return true;
  }

  addSample(screenX: number, screenY: number): void {
    if (!this.active || !this.worldConverter) return;
    const t = (performance.now() - this.startTime) / 1000;
    const world = this.worldConverter(screenX, screenY);
    this.samples.push({ time: t, x: world.x, y: world.y });
  }

  stop(): void {
    if (!this.active || !this.layerId || !this.compId) {
      this.active = false;
      return;
    }
    const kfStore = useKeyframeStore.getState();
    const propertyPath = 'transform.position';

    // Toggle animation on if not already
    if (!kfStore.isPropertyAnimated(this.layerId, propertyPath)) {
      kfStore.toggleAnimatedProperty(this.layerId, propertyPath);
    }

    // Create one keyframe per sample, spaced by fps
    for (const s of this.samples) {
      const frameOffset = Math.round(s.time * this.fps);
      const frame = this.startFrame + frameOffset;
      const id = `kf_ms_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      kfStore.addKeyframe(this.layerId, {
        id, property: propertyPath, layerId: this.layerId,
        time: frame, value: [s.x, s.y], interpolation: 'bezier',
        inTangent: { x: 0.333, y: 0 },
        outTangent: { x: 0.333, y: 0 },
      });
    }

    // Seek playhead to end of sketch
    const lastFrame = this.startFrame + Math.round((this.samples[this.samples.length - 1]?.time ?? 0) * this.fps);
    animationClock.seekToFrame(lastFrame);
    useCompositionStore.getState().setCurrentTime(this.compId, lastFrame / this.fps);

    this.active = false;
    this.samples = [];
    this.worldConverter = null;
  }

  cancel(): void {
    this.active = false;
    this.samples = [];
    this.worldConverter = null;
  }

  get isActive(): boolean { return this.active; }
}

export const motionSketch = new MotionSketchRecorder();