/**
 * Animation menu — keyframe and interpolation operations.
 */
import type { MenuItemDefinition } from '../MenuDropdown';

export const animationMenu: MenuItemDefinition[] = [
  {
    id: 'animation.addKeyframe',
    label: 'Add Keyframe',
    shortcut: 'Alt+K',
    onClick: () => document.dispatchEvent(new CustomEvent('animation:addKeyframe')),
  },
  {
    id: 'animation.deleteKeyframes',
    label: 'Delete Keyframes',
    shortcut: 'Ctrl+Alt+K',
    onClick: () => {
      import('../../../state/keyframeStore').then((m) =>
        m.useKeyframeStore.getState().deleteSelectedKeyframes(),
      );
    },
  },
  { id: 'animation.sep1', label: '', divider: true },
  {
    id: 'animation.toggleHold',
    label: 'Toggle Hold Keyframe',
    onClick: () => {
      import('../../../state/keyframeStore').then((m) => {
        const state = m.useKeyframeStore.getState();
        state.selectedKeyframeIds.forEach((id) => {
          // Toggle between hold and linear for selected keyframes
          // Find the keyframe's current interpolation by looking up its engine data
          let currentInterpolation = 'linear';
          for (const [, propMap] of (state.engine as any)._data) {
            for (const [, arr] of propMap) {
              const kf = arr.find((k: any) => k.id === id);
              if (kf) { currentInterpolation = kf.interpolation || 'linear'; break; }
            }
            if (currentInterpolation) break;
          }
          state.setInterpolation(id, currentInterpolation === 'hold' ? 'linear' : 'hold');
        });
      });
    },
  },
  { id: 'animation.sep2', label: '', divider: true },
  {
    id: 'animation.easeIn',
    label: 'Ease In',
    shortcut: 'Ctrl+Shift+I',
    onClick: () => {
      import('../../../state/keyframeStore').then((m) => {
        const state = m.useKeyframeStore.getState();
        state.selectedKeyframeIds.forEach((id) =>
          state.setInterpolation(id, 'bezier'),
        );
      });
    },
  },
  {
    id: 'animation.easeOut',
    label: 'Ease Out',
    shortcut: 'Ctrl+Shift+O',
    onClick: () => {
      import('../../../state/keyframeStore').then((m) => {
        const state = m.useKeyframeStore.getState();
        state.selectedKeyframeIds.forEach((id) =>
          state.setInterpolation(id, 'bezier'),
        );
      });
    },
  },
  {
    id: 'animation.easeBoth',
    label: 'Ease Both',
    shortcut: 'F9',
    onClick: () => {
      import('../../../state/keyframeStore').then((m) => {
        const state = m.useKeyframeStore.getState();
        state.selectedKeyframeIds.forEach((id) =>
          state.setInterpolation(id, 'bezier'),
        );
      });
    },
  },
  { id: 'animation.sep3', label: '', divider: true },
  {
    id: 'animation.setLinear',
    label: 'Set Linear Interpolation',
    onClick: () => {
      import('../../../state/keyframeStore').then((m) => {
        const state = m.useKeyframeStore.getState();
        state.selectedKeyframeIds.forEach((id) =>
          state.setInterpolation(id, 'linear'),
        );
      });
    },
  },
  {
    id: 'animation.setHold',
    label: 'Set Hold Interpolation',
    onClick: () => {
      import('../../../state/keyframeStore').then((m) => {
        const state = m.useKeyframeStore.getState();
        state.selectedKeyframeIds.forEach((id) =>
          state.setInterpolation(id, 'hold'),
        );
      });
    },
  },
  {
    id: 'animation.setBezier',
    label: 'Set Bezier Interpolation',
    onClick: () => {
      import('../../../state/keyframeStore').then((m) => {
        const state = m.useKeyframeStore.getState();
        state.selectedKeyframeIds.forEach((id) =>
          state.setInterpolation(id, 'bezier'),
        );
      });
    },
  },
  { id: 'animation.sep4', label: '', divider: true },
  {
    id: 'animation.reverseKeyframes',
    label: 'Reverse Keyframes',
    onClick: () => {
      import('../../../state/keyframeStore').then((m) => {
        const state = m.useKeyframeStore.getState();
        // Reverse selected keyframes in time
        const selected = Array.from(state.selectedKeyframeIds);
        if (selected.length < 2) return;
        const times: number[] = [];
        selected.forEach((id) => {
          // Need to find keyframes by iterating all layers
          for (const [, propMap] of (state.engine as any)._data) {
            for (const [, arr] of propMap) {
              const kf = arr.find((k: any) => k.id === id);
              if (kf) { times.push(kf.time); break; }
            }
          }
        });
        if (times.length < 2) return;
        const min = Math.min(...times);
        const max = Math.max(...times);
        selected.forEach((id, i) => {
          state.moveKeyframe(id, max - (times[i] - min));
        });
      });
    },
  },
  {
    id: 'animation.timeStretch',
    label: 'Time Stretch...',
    onClick: () => {
      const factor = prompt('Enter stretch factor (e.g., 2 = double length, 0.5 = half length):', '1.5');
      if (!factor) return;
      const f = parseFloat(factor);
      if (isNaN(f) || f <= 0) return;
      import('../../../state/keyframeStore').then((m) => {
        const state = m.useKeyframeStore.getState();
        const selected = Array.from(state.selectedKeyframeIds);
        selected.forEach((id) => {
          for (const [, propMap] of (state.engine as any)._data) {
            for (const [, arr] of propMap) {
              const kf = arr.find((k: any) => k.id === id);
              if (kf) {
                state.moveKeyframe(id, Math.round(kf.time * f));
                return;
              }
            }
          }
        });
      });
    },
  },
];
