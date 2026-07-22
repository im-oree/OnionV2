/**
 * useViewportSize â€” RAF-debounced ResizeObserver hook.
 * Tracks the pixel dimensions of a referenced DOM element in CSS pixels.
 */
import { useState, useEffect, useRef } from 'react';

interface Size {
  width: number;
  height: number;
}

export function useViewportSize(ref: React.RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      });
    };

    const observer = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    });

    observer.observe(el);
    measure(); // initial

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ref]);

  return size;
}