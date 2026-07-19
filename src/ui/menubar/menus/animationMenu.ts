import type { MenuItemDefinition } from '../MenuDropdown';

export const animationMenu: MenuItemDefinition[] = [
  {
    id: 'animation.addKeyframe', label: 'Add Keyframe', shortcut: 'Alt+K',
    onClick: () => {
      import('../../../state/selectionStore').then(({ useSelectionStore }) => {
        import('../../../state/compositionStore').then(({ useCompositionStore }) => {
          import('../../../state/keyframeStore').then(({ useKeyframeStore }) => {
            const cs = useCompositionStore.getState();
            const compId = cs.activeCompositionId;
            if (!compId) return;
            const comp = cs.compositions.find(c => c.id === compId);
            if (!comp) return;
            const frame = Math.round(comp.currentTime * comp.fps);
            const selectedIds = useSelectionStore.getState().getSelectedIds();
            if (selectedIds.length === 0) return;
            const kfs = useKeyframeStore.getState();
            for (const id of selectedIds) {
              const layer = comp.layers.find(l => l.id === id);
              if (!layer) continue;
              const props = ['transform.position', 'transform.scale', 'transform.rotation', 'opacity'];
              for (const prop of props) {
                if (!kfs.isPropertyAnimated(id, prop)) continue;
                let value: number | number[];
                if (prop === 'transform.position') value = [layer.transform.position.x, layer.transform.position.y];
                else if (prop === 'transform.scale') value = [layer.transform.scale.x, layer.transform.scale.y];
                else if (prop === 'transform.rotation') value = layer.transform.rotation;
                else value = layer.opacity;
                const existing = kfs.engine.getKeyframesForProperty(id, prop).find(k => k.time === frame);
                if (existing) kfs.updateKeyframe(existing.id, { value });
                else kfs.addKeyframe(id, {
                  id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                  property: prop, layerId: id, time: frame,
                  value, interpolation: 'linear',
                });
              }
            }
          });
        });
      });
    },
  },
  {
    id: 'animation.deleteKeyframes', label: 'Delete Keyframes',
    onClick: () => import('../../../state/keyframeStore').then(m => m.useKeyframeStore.getState().deleteSelectedKeyframes()),
  },
  { id: 'animation.sep1', label: '', divider: true },
  {
    id: 'animation.assistant', label: 'Keyframe Assistant',
    children: [
      { id: 'animation.easyEase', label: 'Easy Ease', shortcut: 'F9', onClick: () => import('../../../state/keyframeStore').then(m => m.useKeyframeStore.getState().applyEasingPreset('easyEase')) },
      { id: 'animation.easeIn', label: 'Ease In', shortcut: 'Shift+F9', onClick: () => import('../../../state/keyframeStore').then(m => m.useKeyframeStore.getState().applyEasingPreset('easeIn')) },
      { id: 'animation.easeOut', label: 'Ease Out', shortcut: 'Ctrl+F9', onClick: () => import('../../../state/keyframeStore').then(m => m.useKeyframeStore.getState().applyEasingPreset('easeOut')) },
      { id: 'animation.d1', divider: true },
      { id: 'animation.fastEase', label: 'Fast Ease', onClick: () => import('../../../state/keyframeStore').then(m => m.useKeyframeStore.getState().applyEasingPreset('fastEase')) },
      { id: 'animation.slowEase', label: 'Slow Ease', onClick: () => import('../../../state/keyframeStore').then(m => m.useKeyframeStore.getState().applyEasingPreset('slowEase')) },
    ],
  },
  { id: 'animation.sep2', label: '', divider: true },
  {
    id: 'animation.interp', label: 'Interpolation',
    children: [
      { id: 'animation.linear', label: 'Linear', shortcut: 'Ctrl+L', onClick: () => import('../../../state/keyframeStore').then(m => { const s = m.useKeyframeStore.getState(); for (const id of s.selectedKeyframeIds) s.setInterpolation(id, 'linear'); }) },
      { id: 'animation.bezier', label: 'Bezier', onClick: () => import('../../../state/keyframeStore').then(m => { const s = m.useKeyframeStore.getState(); for (const id of s.selectedKeyframeIds) s.setInterpolation(id, 'bezier'); }) },
      { id: 'animation.hold', label: 'Hold', shortcut: 'Ctrl+H', onClick: () => import('../../../state/keyframeStore').then(m => { const s = m.useKeyframeStore.getState(); for (const id of s.selectedKeyframeIds) s.setInterpolation(id, 'hold'); }) },
    ],
  },
  { id: 'animation.sep3', label: '', divider: true },
  {
    id: 'animation.onionSkin', label: 'Toggle Onion Skinning',
    onClick: () => import('../../../state/onionSkinStore').then(m => m.useOnionSkinStore.getState().toggle()),
  },
  {
    id: 'animation.graphEditor', label: 'Open Graph Editor',
    onClick: () => import('../../../state/uiStore').then(m => m.useUIStore.getState().setActiveRightTab('graph')),
  },
  { id: 'animation.sep4', label: '', divider: true },
  {
    id: 'animation.reverse', label: 'Reverse Keyframes',
    onClick: () => {
      import('../../../state/keyframeStore').then(m => {
        const s = m.useKeyframeStore.getState();
        const selected = Array.from(s.selectedKeyframeIds);
        if (selected.length < 2) return;
        const times: number[] = [];
        for (const id of selected) {
          for (const [, propMap] of (s.engine as any)._data) {
            for (const [, arr] of propMap) {
              const kf = arr.find((k: any) => k.id === id);
              if (kf) { times.push(kf.time); break; }
            }
          }
        }
        const min = Math.min(...times), max = Math.max(...times);
        selected.forEach((id, i) => s.moveKeyframe(id, max - (times[i] - min)));
      });
    },
  },
];