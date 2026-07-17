/**
 * useRenderer — React hook that creates a Renderer instance and ties its
 * lifecycle to the component mount/unmount cycle.
 * Exposes reactive state (FPS, zoom, frame count) for UI overlays.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Renderer, type RendererState } from '../../../../renderer/Renderer';
import { useCompositionStore } from '../../../../state/compositionStore';
import type { Composition } from '../../../../types/composition';

interface UseRendererOptions {
  /** The container element ref value */
  container: HTMLElement | null;
}

interface UseRendererResult {
  /** Whether the renderer is initialized */
  ready: boolean;
  /** Current renderer state (FPS, zoom, frame count) */
  state: RendererState;
  /** Zoom to fit the composition in viewport */
  zoomToFit: () => void;
  /** Set zoom level directly */
  setZoom: (zoom: number) => void;
}

export function useRenderer({ container }: UseRendererOptions): UseRendererResult {
  const rendererRef = useRef<Renderer | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<RendererState>({
    fps: 0,
    zoom: 1,
    frameCount: 0,
  });

  const composition = useCompositionStore((s) => {
    const active = s.activeCompositionId
      ? s.compositions.find((c: Composition) => c.id === s.activeCompositionId)
      : null;
    return active ?? null;
  });

  // Create/mount renderer when container is available
  useEffect(() => {
    if (!container) return;

    // Create renderer — composition will be applied by the useEffect below
    const renderer = new Renderer({
      container,
      autoStart: true,
    });

    renderer.onStateChange = (newState: RendererState) => {
      setState(newState);
    };

    rendererRef.current = renderer;
    setReady(true);

    return () => {
      renderer.dispose();
      rendererRef.current = null;
      setReady(false);
    };
  }, [container]); // Only re-create if container changes

  // Update composition when it changes
  useEffect(() => {
    if (!rendererRef.current || !composition) return;
    rendererRef.current.applyComposition(composition);
  }, [composition]);

  const zoomToFit = useCallback(() => {
    rendererRef.current?.cameraManager.zoomToFit();
  }, []);

  const setZoom = useCallback((zoom: number) => {
    rendererRef.current?.cameraManager.setZoom(zoom);
  }, []);

  return { ready, state, zoomToFit, setZoom };
}
