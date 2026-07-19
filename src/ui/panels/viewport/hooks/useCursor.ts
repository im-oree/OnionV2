import { useEffect } from 'react';
import { useToolStore } from '../../../../state/toolStore';
import { cursorForTool } from '../../../../utils/cursors';

/**
 * Applies the correct cursor to the viewport canvas
 * based on the active tool. Interactive states (drag, pan)
 * override via document.body.style.cursor.
 */
export function useCursor(canvas: HTMLCanvasElement | null): void {
  const activeTool = useToolStore((s) => s.activeTool);

  useEffect(() => {
    if (!canvas) return;
    canvas.style.cursor = cursorForTool(activeTool);
    return () => { canvas.style.cursor = ''; };
  }, [canvas, activeTool]);
}