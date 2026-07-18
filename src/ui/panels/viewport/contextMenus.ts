import type { ContextMenuItem } from '../../common/ContextMenu';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { animationClock } from '../timeline/PlaybackControls';
import type { Layer } from '../../../types/layer';

function kfId(): string {
  return `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

function getSelected(): { compId: string; layers: Layer[] } | null {
  const cs = useCompositionStore.getState();
  const compId = cs.activeCompositionId;
  if (!compId) return null;
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return null;
  const ids = useSelectionStore.getState().getSelectedIds();
  return { compId, layers: comp.layers.filter(l => ids.includes(l.id)) };
}

function insertKf(layerId: string, prop: string, value: number | number[]): void {
  const store = useKeyframeStore.getState();
  const frame = animationClock.currentFrame;
  if (!store.isPropertyAnimated(layerId, prop)) {
    store.toggleAnimatedProperty(layerId, prop);
  }
  const existing = store.engine.getKeyframesForProperty(layerId, prop)
    .find(k => k.time === frame);
  if (existing) {
    store.updateKeyframe(existing.id, { value });
  } else {
    store.addKeyframe(layerId, {
      id: kfId(), property: prop, layerId, time: frame,
      value, interpolation: 'linear',
    });
  }
}

export function buildInsertKeyframeMenu(): ContextMenuItem[] {
  const sel = getSelected();
  if (!sel || sel.layers.length === 0) return [];

  const loc = () => sel.layers.forEach(l =>
    insertKf(l.id, 'transform.position', [l.transform.position.x, l.transform.position.y]));
  const locX = () => sel.layers.forEach(l =>
    insertKf(l.id, 'transform.position.x', l.transform.position.x));
  const locY = () => sel.layers.forEach(l =>
    insertKf(l.id, 'transform.position.y', l.transform.position.y));
  const rot = () => sel.layers.forEach(l =>
    insertKf(l.id, 'transform.rotation', l.transform.rotation));
  const scl = () => sel.layers.forEach(l =>
    insertKf(l.id, 'transform.scale', [l.transform.scale.x, l.transform.scale.y]));
  const sclX = () => sel.layers.forEach(l =>
    insertKf(l.id, 'transform.scale.x', l.transform.scale.x));
  const sclY = () => sel.layers.forEach(l =>
    insertKf(l.id, 'transform.scale.y', l.transform.scale.y));
  const opa = () => sel.layers.forEach(l =>
    insertKf(l.id, 'opacity', l.opacity));
  const all = () => { loc(); rot(); scl(); opa(); };

  return [
    { id: 'kf.hdr', label: 'Insert Keyframe', disabled: true },
    { id: 'kf.d1', divider: true },
    { id: 'kf.all', label: 'All Transforms', onClick: all },
    { id: 'kf.d2', divider: true },
    {
      id: 'kf.loc', label: 'Location', children: [
        { id: 'kf.loc.all', label: 'Location (X, Y)', onClick: loc },
        { id: 'kf.loc.x', label: 'Location X', onClick: locX },
        { id: 'kf.loc.y', label: 'Location Y', onClick: locY },
      ],
    },
    { id: 'kf.rot', label: 'Rotation', onClick: rot },
    {
      id: 'kf.scl', label: 'Scale', children: [
        { id: 'kf.scl.all', label: 'Scale (X, Y)', onClick: scl },
        { id: 'kf.scl.x', label: 'Scale X', onClick: sclX },
        { id: 'kf.scl.y', label: 'Scale Y', onClick: sclY },
      ],
    },
    { id: 'kf.opa', label: 'Opacity', onClick: opa },
  ];
}

export function buildViewportContextMenu(): ContextMenuItem[] {
  const sel = getSelected();
  const has = sel && sel.layers.length > 0;

  const dup = () => {
    if (!sel) return;
    import('../../../utils/duplicateLayer').then(({ duplicateLayers }) => {
      const dups = duplicateLayers(sel.compId, sel.layers);
      useSelectionStore.getState().replaceSelection(dups.map(d => d.id), sel.compId);
    });
  };
  const del = () => {
    if (!sel) return;
    sel.layers.forEach(l => useCompositionStore.getState().removeLayer(sel.compId, l.id));
    useSelectionStore.getState().clearSelection();
  };

  const kfChildren = has
    ? buildInsertKeyframeMenu().filter(i => i.id !== 'kf.hdr' && i.id !== 'kf.d1')
    : [];

  return [
    { id: 'v.hdr', label: 'Object', disabled: true },
    { id: 'v.d1', divider: true },
    { id: 'v.dup', label: 'Duplicate', shortcut: 'Ctrl+D', disabled: !has, onClick: dup },
    { id: 'v.ren', label: 'Rename', shortcut: 'F2', disabled: !has, onClick: () => document.dispatchEvent(new CustomEvent('layer:rename')) },
    { id: 'v.d2', divider: true },
    { id: 'v.grab', label: 'Move', shortcut: 'G', disabled: !has, onClick: () => document.dispatchEvent(new CustomEvent('transform:grab')) },
    { id: 'v.rot', label: 'Rotate', shortcut: 'R', disabled: !has, onClick: () => document.dispatchEvent(new CustomEvent('transform:rotate')) },
    { id: 'v.scl', label: 'Scale', shortcut: 'S', disabled: !has, onClick: () => document.dispatchEvent(new CustomEvent('transform:scale')) },
    { id: 'v.d3', divider: true },
    { id: 'v.kf', label: 'Insert Keyframe', shortcut: 'I', disabled: !has, children: kfChildren },
    { id: 'v.d4', divider: true },
    { id: 'v.del', label: 'Delete', shortcut: 'X', disabled: !has, onClick: del },
  ];
}