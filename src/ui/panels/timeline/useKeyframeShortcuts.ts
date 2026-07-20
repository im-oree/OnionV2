import { useEffect } from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { keyframeClipboard } from './keyframeClipboard';
import { animationClock } from './PlaybackControls';
import { confirm } from '../../common/ConfirmDialog';

function getSelectedKeyframes(): any[] {
  const store = useKeyframeStore.getState();
  const engine: any = store.engine;
  const out: any[] = [];
  for (const [, propMap] of engine._data as Map<string, Map<string, any[]>>) {
    for (const [, arr] of propMap) {
      for (const k of arr) if (store.selectedKeyframeIds.has(k.id)) out.push(k);
    }
  }
  return out;
}

export function useKeyframeShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const store = useKeyframeStore.getState();
      const hasSel = store.selectedKeyframeIds.size > 0;

      // Delete / X — delete selected keyframes (always, regardless of mouse position)
      if ((e.key === 'Delete' || e.key === 'x' || e.key === 'X') && !e.ctrlKey && !e.metaKey) {
        if (!hasSel) return;
        e.preventDefault();
        const count = store.selectedKeyframeIds.size;
        confirm(`Delete ${count} keyframe${count === 1 ? '' : 's'}?`, 'Delete Keyframes', { confirmLabel: `Delete ${count}` }).then(yes => {
          if (yes) useKeyframeStore.getState().deleteSelectedKeyframes();
        });
        return;
      }

      // Ctrl+C copy — always works when keyframes are selected
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (!hasSel) return;
        e.preventDefault();
        keyframeClipboard.copy(getSelectedKeyframes());
        return;
      }

      // Ctrl+X cut — no confirm (data preserved in clipboard, reversible via paste)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        if (!hasSel) return;
        e.preventDefault();
        keyframeClipboard.copy(getSelectedKeyframes());
        store.deleteSelectedKeyframes();
        return;
      }

      // Ctrl+V paste — always works when clipboard has data
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (!keyframeClipboard.hasData()) return;
        e.preventDefault();
        const at = Math.round(animationClock.currentFrame);
        const items = keyframeClipboard.paste(at);
        for (const { layerId, keyframe } of items) {
          useKeyframeStore.getState().addKeyframe(layerId, keyframe);
        }
        return;
      }

      // A / Alt+A — select/deselect all keyframes
      if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        if (e.altKey) {
          store.clearKeyframeSelection();
        } else {
          const all = new Set<string>();
          const engine: any = store.engine;
          for (const [, propMap] of engine._data as Map<string, Map<string, any[]>>) {
            for (const [, arr] of propMap) for (const k of arr) all.add(k.id);
          }
          useKeyframeStore.setState({ selectedKeyframeIds: all });
        }
      }

      // Alt+Left/Right — nudge selected keyframes by 1 frame
      // Shift+Alt+Left/Right — nudge by 10 frames
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        if (!hasSel) return;
        e.preventDefault();
        const finalDelta = e.shiftKey ? (e.key === 'ArrowLeft' ? -10 : 10) : (e.key === 'ArrowLeft' ? -1 : 1);
        for (const kf of getSelectedKeyframes()) {
          const newTime = Math.max(0, Math.round(kf.time + finalDelta));
          store.moveKeyframe(kf.id, newTime);
        }
        return;
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}