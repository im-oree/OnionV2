export function formatPropertyLabel(path: string): string {
  if (path === 'opacity') return 'Opacity';
  if (path.startsWith('transform.')) {
    const field = path.slice('transform.'.length);
    switch (field) {
      case 'position': return 'Position';
      case 'position.x': return 'Position X';
      case 'position.y': return 'Position Y';
      case 'scale': return 'Scale';
      case 'scale.x': return 'Scale X';
      case 'scale.y': return 'Scale Y';
      case 'rotation': return 'Rotation';
      case 'anchorPoint': return 'Anchor';
      case 'anchorPoint.x': return 'Anchor X';
      case 'anchorPoint.y': return 'Anchor Y';
    }
  }
  if (path.startsWith('effect.')) {
    const parts = path.split('.');
    if (parts.length >= 3) return `${parts.slice(2).join('.')} (fx)`;
  }
  return path;
}