/** Default values for common property paths — used by Reset action */
export const PROPERTY_DEFAULTS: Record<string, number | number[]> = {
  'transform.position': [0, 0],
  'transform.position.x': 0,
  'transform.position.y': 0,
  'transform.scale': [100, 100],
  'transform.scale.x': 100,
  'transform.scale.y': 100,
  'transform.rotation': 0,
  'transform.anchorPoint': [0, 0],
  'transform.anchorPoint.x': 0,
  'transform.anchorPoint.y': 0,
  'opacity': 100,
};

export function getPropertyDefault(path: string): number | number[] | undefined {
  return PROPERTY_DEFAULTS[path];
}