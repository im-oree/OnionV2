import { useEffect } from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { keyframeClipboard } from './keyframeClipboard';
import { animationClock } from './PlaybackControls';

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

      // Delete / X — delete selected keyframes
      if ((e.key === 'Delete' || e.key === 'x' || e.key === 'X') && !e.ctrlKey && !e.metaKey) {
        if (!hasSel) return;
        // Only fire if last mouse was in timeline
        if (!(document as any)._lastMouseInTimeline) return;
        e.preventDefault();
        store.deleteSelectedKeyframes();
        return;
      }

      // Ctrl+C copy
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (!hasSel || !(document as any)._lastMouseInTimeline) return;
        e.preventDefault();
        keyframeClipboard.copy(getSelectedKeyframes());
        return;
      }

      // Ctrl+X cut
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        if (!hasSel || !(document as any)._lastMouseInTimeline) return;
        e.preventDefault();
        keyframeClipboard.copy(getSelectedKeyframes());
        store.deleteSelectedKeyframes();
        return;
      }

      // Ctrl+V paste
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (!keyframeClipboard.hasData() || !(document as any)._lastMouseInTimeline) return;
        e.preventDefault();
        const at = Math.round(animationClock.currentFrame);
        const items = keyframeClipboard.paste(at);
        for (const { layerId, keyframe } of items) {
          useKeyframeStore.getState().addKeyframe(layerId, keyframe);
        }
        return;
      }

      // A / Alt+A — select/deselect all keyframes in timeline
      if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (!(document as any)._lastMouseInTimeline) return;
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
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}