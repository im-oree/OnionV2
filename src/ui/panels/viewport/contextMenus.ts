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
  const hasMulti = has && sel!.layers.length > 1;

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
    {
      id: 'v.arrange', label: 'Arrange', disabled: !has,
      children: [
        { id: 'v.arr.front', label: 'Bring to Front', shortcut: 'Ctrl+Shift+]', onClick: () => import('../../../utils/reorderLayers').then(m => m.bringToFront()) },
        { id: 'v.arr.forward', label: 'Bring Forward', shortcut: 'Ctrl+]', onClick: () => import('../../../utils/reorderLayers').then(m => m.bringForward()) },
        { id: 'v.arr.backward', label: 'Send Backward', shortcut: 'Ctrl+[', onClick: () => import('../../../utils/reorderLayers').then(m => m.sendBackward()) },
        { id: 'v.arr.back', label: 'Send to Back', shortcut: 'Ctrl+Shift+[', onClick: () => import('../../../utils/reorderLayers').then(m => m.sendToBack()) },
      ],
    },
    {
      id: 'v.align', label: 'Align', disabled: !has,
      children: [
        { id: 'v.align.hdrSel', label: 'To Selection (last = anchor)', disabled: true },
        { id: 'v.align.left', label: 'Align Left', onClick: () => import('../../../utils/alignLayers').then(m => m.alignLayers('left', 'selection')) },
        { id: 'v.align.centerH', label: 'Align Center Horizontally', onClick: () => import('../../../utils/alignLayers').then(m => m.alignLayers('centerH', 'selection')) },
        { id: 'v.align.right', label: 'Align Right', onClick: () => import('../../../utils/alignLayers').then(m => m.alignLayers('right', 'selection')) },
        { id: 'v.align.top', label: 'Align Top', onClick: () => import('../../../utils/alignLayers').then(m => m.alignLayers('top', 'selection')) },
        { id: 'v.align.centerV', label: 'Align Center Vertically', onClick: () => import('../../../utils/alignLayers').then(m => m.alignLayers('centerV', 'selection')) },
        { id: 'v.align.bottom', label: 'Align Bottom', onClick: () => import('../../../utils/alignLayers').then(m => m.alignLayers('bottom', 'selection')) },
        { id: 'v.align.d1', divider: true },
        { id: 'v.align.hdrComp', label: 'To Composition', disabled: true },
        { id: 'v.align.compLeft', label: 'Align Left (to Comp)', onClick: () => import('../../../utils/alignLayers').then(m => m.alignLayers('left', 'composition')) },
        { id: 'v.align.compCenterH', label: 'Center Horizontally (to Comp)', onClick: () => import('../../../utils/alignLayers').then(m => m.alignLayers('centerH', 'composition')) },
        { id: 'v.align.compRight', label: 'Align Right (to Comp)', onClick: () => import('../../../utils/alignLayers').then(m => m.alignLayers('right', 'composition')) },
        { id: 'v.align.compTop', label: 'Align Top (to Comp)', onClick: () => import('../../../utils/alignLayers').then(m => m.alignLayers('top', 'composition')) },
        { id: 'v.align.compCenterV', label: 'Center Vertically (to Comp)', onClick: () => import('../../../utils/alignLayers').then(m => m.alignLayers('centerV', 'composition')) },
        { id: 'v.align.compBottom', label: 'Align Bottom (to Comp)', onClick: () => import('../../../utils/alignLayers').then(m => m.alignLayers('bottom', 'composition')) },
      ],
    },
    {
      id: 'v.dist', label: 'Distribute', disabled: !has || (sel && sel.layers.length < 3),
      children: [
        { id: 'v.dist.h', label: 'Distribute Horizontally', onClick: () => import('../../../utils/alignLayers').then(m => m.distributeLayers('horizontal')) },
        { id: 'v.dist.v', label: 'Distribute Vertically', onClick: () => import('../../../utils/alignLayers').then(m => m.distributeLayers('vertical')) },
      ],
    },
    { id: 'v.d5', divider: true },
    { id: 'v.resetTx', label: 'Reset Transform', disabled: !has, onClick: () => import('../../../utils/reorderLayers').then(m => m.resetTransform()) },
    // 3D toggle — only for single selection of a layer that can be 3D
    ...((has && sel!.layers.length === 1 && !['adjustment', 'light', 'null'].includes(sel!.layers[0].type)) ? [
      { id: 'v.3d', label: sel!.layers[0].is3D ? 'Disable 3D' : 'Enable 3D', onClick: () => {
        const layer = sel!.layers[0];
        import('../../../types/layer').then(m => {
          const next3D = !layer.is3D;
          useCompositionStore.getState().updateLayer(sel!.compId, layer.id, {
            is3D: next3D,
            transform3D: next3D && !layer.transform3D ? m.defaultTransform3D() : layer.transform3D,
          });
        });
      } },
    ] : []),
    { id: 'v.d6', divider: true },
    { id: 'v.join', label: 'Join (Parent to Last Selected)', shortcut: 'Ctrl+J', disabled: !hasMulti, onClick: () => import('../../../utils/joinLayers').then(m => m.joinSelectedLayers()) },
    // Time Remapping (video and comp layers only)
    ...(has && sel!.layers.length === 1 && (sel!.layers[0].type === 'video' || sel!.layers[0].type === 'comp') ? [
      {
        id: 'v.timeRemap', label: (sel!.layers[0].data as any)?.timeRemap ? 'Disable Time Remapping' : 'Enable Time Remapping',
        shortcut: 'Ctrl+Alt+T', onClick: () => {
          const layer = sel!.layers[0];
          const d = { ...((layer.data ?? {}) as any) };
          d.timeRemap = !d.timeRemap;
          if (d.timeRemap && !d.timeRemapKeyframes) {
            d.timeRemapKeyframes = [
              { time: 0, sourceFrame: 0 },
              { time: layer.endFrame - layer.startFrame, sourceFrame: layer.endFrame - layer.startFrame },
            ];
          }
          useCompositionStore.getState().updateLayer(sel!.compId, layer.id, { data: d });
        },
      },
      {
        id: 'v.frameBlend', label: 'Frame Blending',
        children: [
          { id: 'v.fbOff', label: 'Off', onClick: () => {
            const d = { ...((sel!.layers[0].data ?? {}) as any) };
            d.frameBlending = false;
            delete d.frameBlendingType;
            useCompositionStore.getState().updateLayer(sel!.compId, sel!.layers[0].id, { data: d });
          } },
          { id: 'v.fbMix', label: 'Frame Mix', onClick: () => {
            const d = { ...((sel!.layers[0].data ?? {}) as any) };
            d.frameBlending = true;
            d.frameBlendingType = 'frameMix';
            useCompositionStore.getState().updateLayer(sel!.compId, sel!.layers[0].id, { data: d });
          } },
          { id: 'v.fbPix', label: 'Pixel Motion', onClick: () => {
            const d = { ...((sel!.layers[0].data ?? {}) as any) };
            d.frameBlending = true;
            d.frameBlendingType = 'pixelMotion';
            useCompositionStore.getState().updateLayer(sel!.compId, sel!.layers[0].id, { data: d });
          } },
        ],
      },
    ] : []),
    { id: 'v.precomp', label: 'Pre-compose', shortcut: 'Ctrl+Shift+C', disabled: !has, onClick: () => import('../../../utils/precomp').then(m => m.precomposeSelectedLayers()) },
    { id: 'v.del', label: 'Delete', shortcut: 'X', disabled: !has, onClick: del },
  ];
}