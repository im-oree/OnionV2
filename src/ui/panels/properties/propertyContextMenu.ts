import type { ContextMenuItem } from '../../common/ContextMenu';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { animationClock } from '../timeline/PlaybackControls';
import { getPropertyDefault } from './propertyDefaults';
import type { Layer } from '../../../types/layer';

interface Ctx {
  layer: Layer;
  compId: string;
  /** Base path, e.g. "transform.position" (vector) or "opacity" (scalar) */
  basePath: string;
  /** If this cell represents a single axis, the axis path e.g. "transform.position.x". Undefined for scalars/whole vectors. */
  axisPath?: string;
  /** Current value of the whole property (used for insert) */
  getValue: () => number | number[];
  /** Current value of just this axis (for Insert Single Keyframe). Undefined for scalars. */
  getAxisValue?: () => number;
  /** Called when a Reset action runs and we need to push a new value into the store */
  applyReset: (value: number | number[]) => void;
  /** Optional axis-only reset */
  applyResetAxis?: (value: number) => void;
}

function kfId(): string {
  return `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

function upsertKf(layerId: string, prop: string, value: number | number[]): void {
  const store = useKeyframeStore.getState();
  const frame = animationClock.currentFrame;
  if (!store.isPropertyAnimated(layerId, prop)) {
    store.toggleAnimatedProperty(layerId, prop);
  }
  const existing = store.engine.getKeyframesForProperty(layerId, prop).find(k => k.time === frame);
  if (existing) store.updateKeyframe(existing.id, { value });
  else store.addKeyframe(layerId, {
    id: kfId(), property: prop, layerId, time: frame, value, interpolation: 'linear',
  });
}

function removeAnim(layerId: string, prop: string): void {
  const store = useKeyframeStore.getState();
  if (store.isPropertyAnimated(layerId, prop)) store.toggleAnimatedProperty(layerId, prop);
}

function copyToClipboard(text: string): void {
  try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
}

export function buildPropertyContextMenu(ctx: Ctx): ContextMenuItem[] {
  const { layer, basePath, axisPath, getValue, getAxisValue, applyReset, applyResetAxis } = ctx;

  const store = useKeyframeStore.getState();
  const isAnimated = store.isPropertyAnimated(layer.id, basePath);
  const isAxisAnimated = axisPath ? store.isPropertyAnimated(layer.id, axisPath) : false;
  const frame = animationClock.currentFrame;
  const kfsAtFrame = store.engine.getKeyframesForProperty(layer.id, basePath).find(k => k.time === frame);
  const axisKfsAtFrame = axisPath
    ? store.engine.getKeyframesForProperty(layer.id, axisPath).find(k => k.time === frame)
    : undefined;

  const items: ContextMenuItem[] = [];

  // Header (property label)
  items.push({ id: 'p.hdr', label: prettyName(basePath), disabled: true });
  items.push({ id: 'p.d0', divider: true });

  // Insert Keyframes (whole property)
  items.push({
    id: 'p.insAll', label: 'Insert Keyframes', shortcut: 'I',
    onClick: () => upsertKf(layer.id, basePath, getValue()),
  });

  // Insert Single Keyframe (only for axis cells)
  if (axisPath && getAxisValue) {
    items.push({
      id: 'p.insOne', label: 'Insert Single Keyframe',
      onClick: () => upsertKf(layer.id, axisPath, getAxisValue()),
    });
  }

  // Remove keyframe at current frame
  if (kfsAtFrame) {
    items.push({
      id: 'p.remKf', label: 'Remove Keyframe',
      onClick: () => useKeyframeStore.getState().removeKeyframe(kfsAtFrame.id),
    });
  }
  if (axisKfsAtFrame) {
    items.push({
      id: 'p.remKfAxis', label: 'Remove Single Keyframe',
      onClick: () => useKeyframeStore.getState().removeKeyframe(axisKfsAtFrame.id),
    });
  }

  // Clear animation
  if (isAnimated) {
    items.push({
      id: 'p.clrAll', label: 'Clear Keyframes',
      onClick: () => removeAnim(layer.id, basePath),
    });
  }
  if (axisPath && isAxisAnimated) {
    items.push({
      id: 'p.clrAxis', label: 'Clear Single Keyframes',
      onClick: () => removeAnim(layer.id, axisPath),
    });
  }

  items.push({ id: 'p.d1', divider: true });

  items.push({ id: 'p.drv', label: 'Add Driver', shortcut: 'Ctrl+D', disabled: true });
  items.push({ id: 'p.drvOpen', label: 'Open Drivers Editor', disabled: true });

  items.push({ id: 'p.d2', divider: true });

  items.push({ id: 'p.ks', label: 'Add All to Keying Set', disabled: true });
  items.push({ id: 'p.ks1', label: 'Add Single to Keying Set', disabled: true });
  items.push({ id: 'p.ksR', label: 'Remove from Keying Set', shortcut: 'Alt+K', disabled: true });

  items.push({ id: 'p.d3', divider: true });

  // Reset to default
  const def = getPropertyDefault(basePath);
  if (def !== undefined) {
    items.push({
      id: 'p.reset', label: 'Reset All to Default Values', shortcut: 'Backspace',
      onClick: () => applyReset(def),
    });
  }
  if (axisPath && applyResetAxis) {
    const dAxis = getPropertyDefault(axisPath);
    if (typeof dAxis === 'number') {
      items.push({
        id: 'p.resetAxis', label: 'Reset Single to Default Value',
        onClick: () => applyResetAxis(dAxis),
      });
    }
  }

  items.push({ id: 'p.d4', divider: true });

  items.push({ id: 'p.copyPath', label: 'Copy Data Path', shortcut: 'Shift+Ctrl+C',
    onClick: () => copyToClipboard(basePath) });
  items.push({ id: 'p.copyFull', label: 'Copy Full Data Path', shortcut: 'Shift+Ctrl+Alt+C',
    onClick: () => {
      const cs = useCompositionStore.getState();
      const comp = cs.compositions.find(c => c.id === cs.activeCompositionId);
      const compName = comp ? comp.name : '';
      copyToClipboard(`${compName}.${layer.name}.${basePath}`);
    } });

  items.push({ id: 'p.d5', divider: true });
  items.push({ id: 'p.help', label: 'Online Manual', shortcut: 'F1', disabled: true });

  return items;
}

function prettyName(path: string): string {
  const last = path.split('.').pop() ?? path;
  return last.charAt(0).toUpperCase() + last.slice(1);
}