import type { Layer } from './layer';

export interface WorkArea { start: number; end: number; enabled: boolean }

export interface Composition {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  backgroundColor: string;
  layers: Layer[];
  currentTime: number;
  workAreaStart: number;
  workAreaEnd: number;
  pixelAspect: number;
}
