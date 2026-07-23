import type { ContextMenuItem } from '../../common/ContextMenu';
import { animationClock } from './PlaybackControls';
import { useCompositionStore } from '../../../state/compositionStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { useKeyframeStore } from '../../../state/keyframeStore';

export function buildTimelineContextMenu(
  frame: number, fps: number, compId: string,
): ContextMenuItem[] {
  return [
    {
      id: 'tl.seek', label: `Seek to frame ${frame}`,
      onClick: () => {
        animationClock.seekToFrame(frame);
        useCompositionStore.getState().setCurrentTime(compId, frame / fps);
      },
    },
    { id: 'tl.d1', divider: true },
    {
      id: 'tl.workToggle',
      label: (() => {
        const cs = useCompositionStore.getState();
        const comp = cs.compositions.find(c => c.id === compId);
        return comp?.workAreaEnabled ? '✓ Work Area Enabled' : 'Enable Work Area';
      })(),
      onClick: () => {
        const state = useCompositionStore.getState();
        const c = state.compositions.find(cc => cc.id === compId);
        if (!c) return;
        state.updateComposition(compId, {
          workAreaEnabled: !c.workAreaEnabled,
          // If enabling for the first time and markers are unset, set sensible defaults
          ...(!c.workAreaEnabled && (c.workAreaStart == null || c.workAreaEnd == null) ? {
            workAreaStart: 0,
            workAreaEnd: c.duration,
          } : {}),
        });
      },
    },
    {
      id: 'tl.workIn', label: 'Set Work Area In', shortcut: 'B',
      onClick: () => useCompositionStore.getState().updateComposition(compId, {
        workAreaStart: frame / fps,
        workAreaEnabled: true,
      }),
    },
    {
      id: 'tl.workOut', label: 'Set Work Area Out', shortcut: 'N',
      onClick: () => useCompositionStore.getState().updateComposition(compId, {
        workAreaEnd: frame / fps,
        workAreaEnabled: true,
      }),
    },
    { id: 'tl.d2', divider: true },
    {
      id: 'tl.zoomFit', label: 'Zoom to Fit',
      onClick: () => useTimelineStore.getState().zoomToFit(),
    },
    { id: 'tl.d3', divider: true },
    {
      id: 'tl.delSelKf', label: 'Delete Selected Keyframes', shortcut: 'Del',
      disabled: useKeyframeStore.getState().selectedKeyframeIds.size === 0,
      onClick: () => useKeyframeStore.getState().deleteSelectedKeyframes(),
    },
  ];
}