/**
 * Theme utility — reads CSS custom properties from the document
 * so the renderer (which has no React dependency) can access theme values.
 */

/** Read a single CSS variable as a string */
export function getCSSVar(name: string, el: HTMLElement = document.documentElement): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/** Read a CSS color and return it as a hex string suitable for Three.js */
export function getCSSColor(name: string, fallback = '#ffffff'): string {
  const val = getCSSVar(name);
  return val || fallback;
}

/** Read a CSS numeric variable (e.g. --size-splitter: 4px → 4) */
export function getCSSNumber(name: string, fallback = 0): number {
  const val = getCSSVar(name);
  if (!val) return fallback;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}

/** Read a CSS variable that is a pixel value (e.g. 4px → 4) */
export function getCSSPixel(name: string, fallback = 0): number {
  return getCSSNumber(name, fallback);
}
