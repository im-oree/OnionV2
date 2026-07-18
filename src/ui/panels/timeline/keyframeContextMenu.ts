import type { ContextMenuItem } from '../../common/ContextMenu';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { keyframeClipboard } from './keyframeClipboard';
import { animationClock } from './PlaybackControls';

export function buildKeyframeContextMenu(): ContextMenuItem[] {
  const store = useKeyframeStore.getState();
  const selectedCount = store.selectedKeyframeIds.size;
  const has = selectedCount > 0;

  const getSelectedKfs = () => {
    const arr: any[] = [];
    for (const id of store.selectedKeyframeIds) {
      const k = findKf(store.engine as any, id);
      if (k) arr.push(k);
    }
    return arr;
  };

  const doCopy = () => {
    const kfs = getSelectedKfs();
    if (kfs.length > 0) keyframeClipboard.copy(kfs);
  };

  const doPaste = () => {
    if (!keyframeClipboard.hasData()) return;
    const at = Math.round(animationClock.currentFrame);
    const items = keyframeClipboard.paste(at);
    for (const { layerId, keyframe } of items) {
      useKeyframeStore.getState().addKeyframe(layerId, keyframe);
    }
  };

  const doCut = () => { doCopy(); useKeyframeStore.getState().deleteSelectedKeyframes(); };

  const setInterp = (t: 'linear' | 'bezier' | 'hold') => {
    for (const id of store.selectedKeyframeIds) {
      useKeyframeStore.getState().setInterpolation(id, t);
    }
  };

  return [
    { id: 'kf.hdr', label: `${selectedCount} keyframe${selectedCount === 1 ? '' : 's'}`, disabled: true },
    { id: 'kf.d0', divider: true },
    { id: 'kf.cut', label: 'Cut', shortcut: 'Ctrl+X', disabled: !has, onClick: doCut },
    { id: 'kf.copy', label: 'Copy', shortcut: 'Ctrl+C', disabled: !has, onClick: doCopy },
    { id: 'kf.paste', label: 'Paste at Playhead', shortcut: 'Ctrl+V', disabled: !keyframeClipboard.hasData(), onClick: doPaste },
    { id: 'kf.d1', divider: true },
    { id: 'kf.grab', label: 'Move (Grab)', shortcut: 'G', disabled: !has, onClick: () => document.dispatchEvent(new CustomEvent('kfmodal:grab')) },
    { id: 'kf.scale', label: 'Scale Around Playhead', shortcut: 'S', disabled: !has, onClick: () => document.dispatchEvent(new CustomEvent('kfmodal:scale')) },
    { id: 'kf.d2', divider: true },
    {
      id: 'kf.interp', label: 'Interpolation',
      disabled: !has,
      children: [
        { id: 'kf.i.lin', label: 'Linear', onClick: () => setInterp('linear') },
        { id: 'kf.i.bez', label: 'Bezier', onClick: () => setInterp('bezier') },
        { id: 'kf.i.hold', label: 'Hold', onClick: () => setInterp('hold') },
      ],
    },
    { id: 'kf.d3', divider: true },
    { id: 'kf.del', label: 'Delete', shortcut: 'X / Del', disabled: !has, onClick: () => useKeyframeStore.getState().deleteSelectedKeyframes() },
  ];
}

function findKf(engine: any, id: string): any {
  const data: Map<string, Map<string, any[]>> = engine._data;
  for (const [, propMap] of data) {
    for (const [, arr] of propMap) {
      for (const k of arr) if (k.id === id) return k;
    }
  }
  return null;
}