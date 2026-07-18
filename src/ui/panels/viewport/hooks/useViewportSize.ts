/**
 * useViewportSize — RAF-debounced ResizeObserver hook.
 * Tracks the pixel dimensions of a referenced DOM element.
 */
import { useState, useEffect, useRef } from 'react';

interface Size {
  width: number;
  height: number;
}

/**
 * Observe resize events on a container ref.
 * Returns the current size. Returns {0,0} until the first measurement.
 */
export function useViewportSize(ref: React.RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const observer = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
      });
    });

    observer.observe(el);

    // Initial size
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ref]);

  return size;
}
