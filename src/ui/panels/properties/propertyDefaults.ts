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

  // 3D defaults
  'transform3D.position.z': 0,
  'transform3D.scale.z': 100,
  'transform3D.rotationX': 0,
  'transform3D.rotationY': 0,
  'transform3D.rotationZ': 0,
  'transform3D.anchorPoint.z': 0,
};

export function getPropertyDefault(path: string): number | number[] | undefined {
  return PROPERTY_DEFAULTS[path];
}